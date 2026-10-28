import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {format, isValid, parse, startOfMonth, subDays} from 'date-fns';
import {Colors} from '../../core/constants';
import {
  Accounting,
  AccountingRepository,
  SalesEntry,
  SalesSummary,
} from '../../core/database/repositories/AccountingRepository';
import {IconButton} from 'react-native-paper';
import {useAppStore} from '../../store';
import {humanize} from '../../core/utils';

const IN_CATEGORIES = ['Sales', 'Investment', 'Loan', 'Other Income'];
const OUT_CATEGORIES = [
  'Stock Purchase',
  'Wages',
  'Rent',
  'Utilities',
  'Transport',
  'Other Expense',
];

const SOURCE_COLORS = [
  Colors.primary,
  Colors.secondary,
  Colors.info,
  Colors.success,
  Colors.warning,
];

type LedgerItem =
  | {
      kind: 'manual';
      key: string;
      date: string;
      entry: Accounting;
      amount: number;
      isIn: boolean;
    }
  | {
      kind: 'sale';
      key: string;
      date: string;
      sale: SalesEntry;
      amount: number;
    };

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_FILTERS: {key: DateFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'today', label: 'Today'},
  {key: 'week', label: '7 Days'},
  {key: 'month', label: 'This Month'},
  {key: 'custom', label: 'Custom'},
];

const AccountingScreen = () => {
  const {currency} = useAppStore();
  const [entries, setEntries] = useState<Accounting[]>([]);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    salesIncome: 0,
    costOfGoods: 0,
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [customVisible, setCustomVisible] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Accounting | null>(null);
  const [entryType, setEntryType] = useState<'in' | 'out'>('in');
  const [category, setCategory] = useState(IN_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const loadEntries = async () => {
    const data = await AccountingRepository.getAll();
    setEntries(data);
  };

  const range = useMemo<{from?: string; to?: string}>(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      const day = format(now, 'yyyy-MM-dd');
      return {from: day, to: day};
    }
    if (dateFilter === 'week') {
      return {
        from: format(subDays(now, 6), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd'),
      };
    }
    if (dateFilter === 'month') {
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd'),
      };
    }
    if (dateFilter === 'custom') {
      return {from: appliedFrom || undefined, to: appliedTo || undefined};
    }
    return {};
  }, [dateFilter, appliedFrom, appliedTo]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AccountingRepository.getAll()
        .then(data => {
          if (active) {
            setEntries(data);
          }
        })
        .catch(() => {});
      AccountingRepository.getSalesSummary(range.from, range.to)
        .then(data => {
          if (active) {
            setSalesSummary(data);
          }
        })
        .catch(() => {});
      AccountingRepository.getSalesEntries(range.from, range.to)
        .then(data => {
          if (active) {
            setSalesEntries(data);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [range.from, range.to]),
  );

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = entry.created_at?.slice(0, 10);
      if (!entryDate) {
        return false;
      }
      if (range.from && entryDate < range.from) {
        return false;
      }
      if (range.to && entryDate > range.to) {
        return false;
      }
      return true;
    });
  }, [entries, range]);

  const manualIn = filteredEntries.reduce(
    (sum, entry) => sum + (entry.in_amount || 0),
    0,
  );
  const manualOut = filteredEntries.reduce(
    (sum, entry) => sum + (entry.out_amount || 0),
    0,
  );
  const incomeSources = useMemo(() => {
    const totals = new Map<string, number>();
    filteredEntries.forEach(entry => {
      const amount = entry.in_amount || 0;
      if (amount <= 0) {
        return;
      }
      const label = entry.category || 'Other Income';
      totals.set(label, (totals.get(label) || 0) + amount);
    });
    if (salesSummary.salesIncome > 0) {
      totals.set(
        'Order sales',
        (totals.get('Order sales') || 0) + salesSummary.salesIncome,
      );
    }
    return Array.from(totals.entries())
      .map(([label, amount]) => ({label, amount}))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredEntries, salesSummary.salesIncome]);

  const totalIncome = incomeSources.reduce(
    (sum, source) => sum + source.amount,
    0,
  );

  const ledger = useMemo<LedgerItem[]>(() => {
    const manualItems: LedgerItem[] = filteredEntries.map(entry => {
      const isIn = (entry.in_amount || 0) > 0;
      return {
        kind: 'manual',
        key: `manual-${entry.id}`,
        date: entry.created_at || '',
        entry,
        amount: isIn ? entry.in_amount || 0 : entry.out_amount || 0,
        isIn,
      };
    });
    const salesItems: LedgerItem[] = salesEntries.map(sale => ({
      kind: 'sale',
      key: `sale-${sale.id}`,
      date: sale.created_at || '',
      sale,
      amount: sale.net_price || 0,
    }));
    return [...manualItems, ...salesItems].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [filteredEntries, salesEntries]);

  const grossProfit = salesSummary.salesIncome - salesSummary.costOfGoods;

  const periodLabel =
    dateFilter === 'all'
      ? 'All time'
      : dateFilter === 'today'
      ? 'Today'
      : dateFilter === 'week'
      ? 'Last 7 days'
      : dateFilter === 'month'
      ? 'This month'
      : `${appliedFrom} → ${appliedTo}`;

  const handleFilterPress = (key: DateFilter) => {
    if (key === 'custom') {
      const now = new Date();
      setCustomFrom(appliedFrom || format(startOfMonth(now), 'yyyy-MM-dd'));
      setCustomTo(appliedTo || format(now, 'yyyy-MM-dd'));
      setCustomVisible(true);
      return;
    }
    setDateFilter(key);
  };

  const applyCustomFilter = () => {
    const fromDate = parse(customFrom, 'yyyy-MM-dd', new Date());
    const toDate = parse(customTo, 'yyyy-MM-dd', new Date());
    if (!isValid(fromDate) || !isValid(toDate)) {
      Alert.alert('Error', 'Use dates in YYYY-MM-DD format');
      return;
    }
    if (fromDate > toDate) {
      Alert.alert('Error', 'From date must be before To date');
      return;
    }
    setAppliedFrom(format(fromDate, 'yyyy-MM-dd'));
    setAppliedTo(format(toDate, 'yyyy-MM-dd'));
    setDateFilter('custom');
    setCustomVisible(false);
  };

  const resetForm = () => {
    setEditingEntry(null);
    setEntryType('in');
    setCategory(IN_CATEGORIES[0]);
    setAmount('');
    setDescription('');
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (entry: Accounting) => {
    const type: 'in' | 'out' = (entry.in_amount || 0) > 0 ? 'in' : 'out';
    const categories = type === 'in' ? IN_CATEGORIES : OUT_CATEGORIES;
    setEditingEntry(entry);
    setEntryType(type);
    setCategory(entry.category || categories[0]);
    const entryAmount = type === 'in' ? entry.in_amount : entry.out_amount;
    setAmount(entryAmount != null ? entryAmount.toFixed(2) : '');
    setDescription(entry.description || '');
    setModalVisible(true);
  };

  const selectEntryType = (type: 'in' | 'out') => {
    const categories = type === 'in' ? IN_CATEGORIES : OUT_CATEGORIES;
    setEntryType(type);
    if (!categories.includes(category)) {
      setCategory(categories[0]);
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }

    const payload = {
      in_amount: entryType === 'in' ? parsed : undefined,
      out_amount: entryType === 'out' ? parsed : undefined,
      description: description.trim() || undefined,
      category,
      sync_status: 'pending' as const,
    };

    try {
      if (editingEntry) {
        await AccountingRepository.update(editingEntry.id, payload);
      } else {
        await AccountingRepository.create(payload);
      }
      closeModal();
      loadEntries();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const confirmDelete = (entry: Accounting) => {
    Alert.alert(
      'Delete Entry',
      'Delete this accounting entry? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AccountingRepository.delete(entry.id);
              loadEntries();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ],
    );
  };

  const entryCategories = entryType === 'in' ? IN_CATEGORIES : OUT_CATEGORIES;
  const visibleCategories =
    category && !entryCategories.includes(category)
      ? [category, ...entryCategories]
      : entryCategories;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounting</Text>
        <IconButton icon="plus" iconColor={Colors.primary} onPress={openAddModal} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}>
        {DATE_FILTERS.map(filter => {
          const active = dateFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleFilterPress(filter.key)}>
              <Text
                style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.periodLabel}>
        Manual ledger + completed sales · {periodLabel}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Manual In</Text>
          <Text style={[styles.summaryValue, styles.inText]}>
            {currency.symbol}{manualIn.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Manual Out</Text>
          <Text style={[styles.summaryValue, styles.outText]}>
            {currency.symbol}{manualOut.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Manual Balance</Text>
          <Text style={styles.summaryValue}>
            {currency.symbol}{(manualIn - manualOut).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.salesCard}>
        <Text style={styles.salesTitle}>Order Sales · {periodLabel}</Text>
        <View style={styles.salesRow}>
          <View style={styles.salesItem}>
            <Text style={styles.summaryLabel}>Sales Income</Text>
            <Text style={[styles.salesValue, styles.inText]}>
              {currency.symbol}{salesSummary.salesIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.salesItem}>
            <Text style={styles.summaryLabel}>Cost of Goods</Text>
            <Text style={[styles.salesValue, styles.outText]}>
              {currency.symbol}{salesSummary.costOfGoods.toFixed(2)}
            </Text>
          </View>
          <View style={styles.salesItem}>
            <Text style={styles.summaryLabel}>Gross Profit</Text>
            <Text
              style={[
                styles.salesValue,
                grossProfit >= 0 ? styles.inText : styles.outText,
              ]}>
              {currency.symbol}{grossProfit.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sourcesCard}>
        <Text style={styles.salesTitle}>Income sources · {periodLabel}</Text>
        {incomeSources.length === 0 ? (
          <Text style={styles.sourcesEmpty}>No income recorded in this period</Text>
        ) : (
          incomeSources.map((source, index) => {
            const percent =
              totalIncome > 0 ? (source.amount / totalIncome) * 100 : 0;
            return (
              <View key={source.label} style={styles.sourceRow}>
                <View style={styles.sourceHeader}>
                  <Text style={styles.sourceLabel}>{source.label}</Text>
                  <Text style={styles.sourceAmount}>
                    {currency.symbol}{source.amount.toFixed(2)}
                    <Text style={styles.sourcePercent}>
                      {'  '}{percent.toFixed(0)}%
                    </Text>
                  </Text>
                </View>
                <View style={styles.sourceBarTrack}>
                  <View
                    style={[
                      styles.sourceBarFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
        {incomeSources.length > 0 && (
          <View style={styles.sourceTotalRow}>
            <Text style={styles.sourceTotalLabel}>Total income</Text>
            <Text style={styles.sourceTotalValue}>
              {currency.symbol}{totalIncome.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.entriesHeader}>
        <Text style={styles.entriesTitle}>Entries · {periodLabel}</Text>
        <Text style={styles.entriesCount}>{ledger.length}</Text>
      </View>

      <FlatList
        style={styles.entriesList}
        data={ledger}
        keyExtractor={item => item.key}
        renderItem={({item}) => {
          if (item.kind === 'sale') {
            const sale = item.sale;
            const itemLabel =
              sale.item_quantity === 1 ? '1 item' : `${sale.item_quantity} items`;
            const saleProfit = sale.net_price - (sale.cost_of_goods || 0);
            return (
              <View style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemText}>
                    Order #{sale.id} · {humanize(sale.sale_type)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.saleTag}>Order Sale</Text>
                    <Text style={styles.subText}>
                      {humanize(sale.payment_method)} · {itemLabel} ·{' '}
                      {sale.created_at?.slice(0, 16)}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.amount, styles.inText]}>
                    +{currency.symbol}{item.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.incomeHint}>income</Text>
                  <Text
                    style={[
                      styles.profitHint,
                      saleProfit >= 0 ? styles.inText : styles.outText,
                    ]}>
                    GP {currency.symbol}{saleProfit.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemText}>
                  {item.entry.description || 'No description'}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.categoryTag}>
                    {item.entry.category || 'Uncategorized'}
                  </Text>
                  <Text style={styles.subText}>
                    {item.entry.created_at?.slice(0, 16)}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text
                  style={[styles.amount, item.isIn ? styles.inText : styles.outText]}>
                  {item.isIn ? '+' : '-'}{currency.symbol}{item.amount.toFixed(2)}
                </Text>
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    size={18}
                    iconColor={Colors.primary}
                    style={styles.rowAction}
                    onPress={() => openEditModal(item.entry)}
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    iconColor={Colors.error}
                    style={styles.rowAction}
                    onPress={() => confirmDelete(item.entry)}
                  />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {entries.length === 0 && salesEntries.length === 0
              ? 'No entries yet. Completed sales and manual entries will appear here.'
              : 'No entries in this period'}
          </Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingEntry ? 'Edit Accounting Entry' : 'Add Accounting Entry'}
              </Text>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, entryType === 'in' && styles.typeBtnActive]}
                  onPress={() => selectEntryType('in')}>
                  <Text
                    style={[
                      styles.typeBtnText,
                      entryType === 'in' && styles.typeBtnTextActive,
                    ]}>
                    In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, entryType === 'out' && styles.typeBtnActive]}
                  onPress={() => selectEntryType('out')}>
                  <Text
                    style={[
                      styles.typeBtnText,
                      entryType === 'out' && styles.typeBtnTextActive,
                    ]}>
                    Out
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                {visibleCategories.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.categoryChip,
                      category === option && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(option)}>
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === option && styles.categoryChipTextActive,
                      ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>
                    {editingEntry ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={customVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <Text style={styles.label}>From (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-01-01"
              value={customFrom}
              onChangeText={setCustomFrom}
            />
            <Text style={styles.label}>To (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              value={customTo}
              onChangeText={setCustomTo}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCustomVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={applyCustomFilter}>
                <Text style={styles.saveButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  filterRow: {
    marginBottom: 8,
    flexGrow: 0,
  },
  filterContent: {
    gap: 6,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: Colors.surface,
  },
  periodLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  salesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  salesTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  salesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  salesItem: {
    flex: 1,
  },
  salesValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sourcesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sourcesEmpty: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingVertical: 4,
  },
  sourceRow: {
    marginBottom: 8,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sourceLabel: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  sourceAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sourcePercent: {
    fontSize: 11,
    fontWeight: 'normal',
    color: Colors.textSecondary,
  },
  sourceBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  sourceBarFill: {
    height: 5,
    borderRadius: 3,
  },
  sourceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
    paddingTop: 8,
  },
  sourceTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sourceTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entriesTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  entriesCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  entriesList: {
    flex: 1,
  },
  saleTag: {
    fontSize: 11,
    color: Colors.surface,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  incomeHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  profitHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  inText: {
    color: Colors.success,
  },
  outText: {
    color: Colors.error,
  },
  item: {
    backgroundColor: Colors.surface,
    padding: 12,
    paddingLeft: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryTag: {
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: Colors.background,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 2,
  },
  rowAction: {
    margin: 0,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeBtnText: {
    color: Colors.text,
  },
  typeBtnTextActive: {
    color: Colors.surface,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: Colors.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelButton: {
    padding: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  saveButtonText: {
    color: Colors.surface,
  },
});

export default AccountingScreen;
