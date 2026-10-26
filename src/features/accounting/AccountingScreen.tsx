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
  SalesSummary,
} from '../../core/database/repositories/AccountingRepository';
import {IconButton} from 'react-native-paper';
import {useAppStore} from '../../store';

const IN_CATEGORIES = ['Sales', 'Investment', 'Loan', 'Other Income'];
const OUT_CATEGORIES = [
  'Stock Purchase',
  'Wages',
  'Rent',
  'Utilities',
  'Transport',
  'Other Expense',
];

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

  const totalIn = filteredEntries.reduce((sum, entry) => sum + (entry.in_amount || 0), 0);
  const totalOut = filteredEntries.reduce((sum, entry) => sum + (entry.out_amount || 0), 0);
  const balance = totalIn - totalOut;

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

      <Text style={styles.periodLabel}>Manual ledger · {periodLabel}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>In</Text>
          <Text style={[styles.summaryValue, styles.inText]}>
            {currency.symbol}{totalIn.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Out</Text>
          <Text style={[styles.summaryValue, styles.outText]}>
            {currency.symbol}{totalOut.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={styles.summaryValue}>
            {currency.symbol}{balance.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.salesCard}>
        <Text style={styles.salesTitle}>Order Sales · {periodLabel}</Text>
        <View style={styles.salesRow}>
          <View style={styles.salesItem}>
            <Text style={styles.summaryLabel}>Sales (net)</Text>
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

      <FlatList
        data={filteredEntries}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => {
          const isIn = (item.in_amount || 0) > 0;
          const value = isIn ? item.in_amount || 0 : item.out_amount || 0;
          return (
            <View style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemText}>{item.description || 'No description'}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.categoryTag}>{item.category || 'Uncategorized'}</Text>
                  <Text style={styles.subText}>{item.created_at?.slice(0, 16)}</Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.amount, isIn ? styles.inText : styles.outText]}>
                  {isIn ? '+' : '-'}{currency.symbol}{value.toFixed(2)}
                </Text>
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    size={18}
                    iconColor={Colors.primary}
                    style={styles.rowAction}
                    onPress={() => openEditModal(item)}
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    iconColor={Colors.error}
                    style={styles.rowAction}
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {entries.length === 0
              ? 'No accounting entries yet'
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
