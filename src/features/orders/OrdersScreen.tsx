import React, {useCallback, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView} from 'react-native';
import {Colors} from '../../core/constants';
import {SaleRepository} from '../../core/database/repositories/SaleRepository';
import {SaleDetailRepository} from '../../core/database/repositories/SaleDetailRepository';
import {CartRepository} from '../../core/database/repositories/CartRepository';
import {Sale, SaleDetail} from '../../types';
import {useAppStore} from '../../store';
import {humanize} from '../../core/utils';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

const POS_SESSION_ID = 'pos_session_default';

const OrdersScreen = () => {
  const {currency} = useAppStore();
  const navigation = useNavigation<any>();
  const [sales, setSales] = useState<Sale[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [details, setDetails] = useState<SaleDetail[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'saveSale' | 'today'>('today');

  const loadSales = async () => {
    const data = await SaleRepository.getAll();
    setSales(data);
  };

  // Refresh whenever the tab becomes active so newly saved/loaded orders show.
  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, []),
  );

  const viewDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    const dets = await SaleDetailRepository.getBySaleId(sale.id);
    setDetails(dets);
    setModalVisible(true);
  };

  const loadToPOS = async (sale: Sale) => {
    const doLoad = async () => {
      try {
        await CartRepository.clearSession(POS_SESSION_ID);
        const dets = await SaleDetailRepository.getBySaleId(sale.id);
        for (const detail of dets) {
          await CartRepository.addItem({
            session_id: POS_SESSION_ID,
            product_id: detail.product_id,
            stock_id: detail.stock_id,
            quantity: detail.quantity,
            unit_price: detail.unit_price,
            cooking_instructions: undefined,
            updated_at: undefined,
          } as any);
        }
        // Remove the held order so it can be re-saved/checked out without duplicating.
        await SaleDetailRepository.deleteBySaleId(sale.id);
        await SaleRepository.delete(sale.id);
        setModalVisible(false);
        await loadSales();
        navigation.navigate('POS');
        Alert.alert('Loaded', 'Saved order loaded into POS');
      } catch (error) {
        console.error('Load saved order error:', error);
        Alert.alert('Error', 'Failed to load order');
      }
    };

    try {
      const existing = await CartRepository.getBySession(POS_SESSION_ID);
      if (existing.length > 0) {
        Alert.alert(
          'Replace Cart?',
          'The POS cart already has items. Loading this order will replace them.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Replace', style: 'destructive', onPress: doLoad},
          ],
        );
      } else {
        await doLoad();
      }
    } catch (error) {
      console.error('Load saved order error:', error);
      Alert.alert('Error', 'Failed to load order');
    }
  };

  const confirmDelete = (sale: Sale) => {
    Alert.alert(
      'Delete Order',
      `Delete order #${sale.id}? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SaleDetailRepository.deleteBySaleId(sale.id);
              await SaleRepository.delete(sale.id);
              setModalVisible(false);
              setSelectedSale(null);
              setDetails([]);
              await loadSales();
            } catch (error) {
              console.error('Delete order error:', error);
              Alert.alert('Error', 'Failed to delete order');
            }
          },
        },
      ],
    );
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const filteredSales =
    filter === 'all'
      ? sales
      : filter === 'today'
      ? sales.filter(s => (s.created_at || '').slice(0, 10) === todayKey)
      : sales.filter(s => s.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>
      <View style={styles.filterRow}>
        {(['today', 'all', 'completed', 'saveSale'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'saveSale' ? 'Saved' : f === 'today' ? "Today's Sale" : f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredSales}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <TouchableOpacity style={styles.itemMain} onPress={() => viewDetails(item)}>
              <Text style={styles.itemText}>Order #{item.id}</Text>
              <Text style={styles.subText}>{humanize(item.sale_type)} - {humanize(item.payment_method)}</Text>
              <Text style={styles.subText}>{item.created_at}</Text>
            </TouchableOpacity>
            <View style={styles.right}>
              <Text style={styles.amount}>{currency.symbol}{item.grand_total.toFixed(2)}</Text>
              <Text style={[styles.status, item.status === 'completed' && styles.statusCompleted]}>
                {item.status === 'saveSale' ? 'Saved' : humanize(item.status)}
              </Text>
              <View style={styles.cardActions}>
                {item.status === 'saveSale' && (
                  <TouchableOpacity
                    style={styles.cardLoadBtn}
                    onPress={() => loadToPOS(item)}>
                    <Text style={styles.cardLoadText}>Load</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cardDeleteBtn}
                  onPress={() => confirmDelete(item)}>
                  <Text style={styles.cardDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders found</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <ScrollView style={styles.modalScroll}>
              {selectedSale && (
                <View>
                  <Text style={styles.detailText}>Order #: {selectedSale.id}</Text>
                  <Text style={styles.detailText}>Type: {humanize(selectedSale.sale_type)}</Text>
                  <Text style={styles.detailText}>Payment: {humanize(selectedSale.payment_method)}</Text>
                  <Text style={styles.detailText}>Status: {selectedSale.status === 'saveSale' ? 'Saved' : humanize(selectedSale.status)}</Text>
                  <Text style={styles.detailText}>Date: {selectedSale.created_at}</Text>
                  {selectedSale.table_number && <Text style={styles.detailText}>Table: {selectedSale.table_number}</Text>}
                  {selectedSale.postcode && <Text style={styles.detailText}>Post Code: {selectedSale.postcode}</Text>}
                  {selectedSale.address && <Text style={styles.detailText}>Address: {selectedSale.address}</Text>}
                  {selectedSale.pickup_time && <Text style={styles.detailText}>Pickup Time: {selectedSale.pickup_time}</Text>}
                  {selectedSale.payment_method === 'split' && selectedSale.cash_amount != null && selectedSale.card_amount != null && (
                    <>
                      <Text style={styles.detailText}>Cash: {currency.symbol}{selectedSale.cash_amount.toFixed(2)}</Text>
                      <Text style={styles.detailText}>Card: {currency.symbol}{selectedSale.card_amount.toFixed(2)}</Text>
                    </>
                  )}
                  <Text style={styles.sectionTitle}>Items</Text>
                  {details.map(detail => (
                    <View key={detail.id} style={styles.detailItem}>
                      <Text style={styles.detailItemName}>{detail.product_name}</Text>
                      <Text style={styles.detailItemQty}>
                        {detail.quantity} x {currency.symbol}{detail.unit_price.toFixed(2)} = {currency.symbol}{detail.total_price.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <Text style={styles.detailText}>Subtotal: {currency.symbol}{selectedSale.net_price.toFixed(2)}</Text>
                  <Text style={styles.detailText}>Discount: {currency.symbol}{selectedSale.discount_amount.toFixed(2)}</Text>
                  <Text style={styles.detailText}>Tax: {currency.symbol}{selectedSale.tax_amount.toFixed(2)}</Text>
                  <Text style={styles.detailText}>VAT: {currency.symbol}{selectedSale.vat_amount.toFixed(2)}</Text>
                  <Text style={styles.totalDetail}>Grand Total: {currency.symbol}{selectedSale.grand_total.toFixed(2)}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              {selectedSale?.status === 'saveSale' && (
                <TouchableOpacity
                  style={styles.loadButton}
                  onPress={() => loadToPOS(selectedSale)}>
                  <Text style={styles.loadButtonText}>Load to POS</Text>
                </TouchableOpacity>
              )}
              {selectedSale && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(selectedSale)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: Colors.surface,
  },
  item: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMain: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  status: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusCompleted: {
    color: Colors.success,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardLoadBtn: {
    backgroundColor: Colors.success,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  cardLoadText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDeleteBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  cardDeleteText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: 'bold',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  modalScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  detailItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailItemName: {
    fontSize: 14,
    color: Colors.text,
  },
  detailItemQty: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  totalDetail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 4,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadButton: {
    backgroundColor: Colors.success,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  loadButtonText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  closeButtonText: {
    color: Colors.surface,
  },
});

export default OrdersScreen;
