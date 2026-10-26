import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput} from 'react-native';
import {Colors} from '../../core/constants';
import {humanize} from '../../core/utils';
import {StockRepository} from '../../core/database/repositories/StockRepository';
import {StockAdjustmentRepository} from '../../core/database/repositories/StockAdjustmentRepository';
import {ProductRepository} from '../../core/database/repositories/ProductRepository';
import {Stock, Product} from '../../types';
import {IconButton} from 'react-native-paper';
import {useAppStore} from '../../store';

const StockScreen = () => {
  const {currency} = useAppStore();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [adjustQty, setAdjustQty] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [initialQty, setInitialQty] = useState('');

  const loadStocks = async () => {
    const [stockData, prodData] = await Promise.all([
      StockRepository.getAll(),
      ProductRepository.getAll(),
    ]);
    setStocks(stockData);
    setProducts(prodData);
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const productsWithoutStock = products.filter(
    p => !stocks.some(s => s.product_id === p.id),
  );

  const getProductName = (productId: number) => {
    return products.find(p => p.id === productId)?.name || `Product ${productId}`;
  };

  const openAdjustModal = (stock: Stock) => {
    setSelectedStock(stock);
    setAdjustmentType('increase');
    setAdjustQty('');
    setAdjustVisible(true);
  };

  const closeAdjustModal = () => {
    setAdjustVisible(false);
    setSelectedStock(null);
    setAdjustQty('');
  };

  const handleAdjust = async () => {
    if (!selectedStock) {
      return;
    }
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }
    const newQty =
      adjustmentType === 'increase'
        ? selectedStock.quantity + qty
        : selectedStock.quantity - qty;
    if (newQty < 0) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }
    try {
      await StockRepository.updateQuantity(selectedStock.id, newQty);
      await StockAdjustmentRepository.create({
        stock_id: selectedStock.id,
        adjustment_type: adjustmentType,
        quantity: qty,
        note: undefined,
        sync_status: 'pending',
      });
      Alert.alert('Success', 'Stock adjusted successfully');
      closeAdjustModal();
      loadStocks();
    } catch (error) {
      Alert.alert('Error', 'Failed to adjust stock');
    }
  };

  const openAddModal = () => {
    if (productsWithoutStock.length === 0) {
      Alert.alert('No Products Available', 'All products already have a stock record.');
      return;
    }
    setSelectedProductId(productsWithoutStock[0].id);
    setBuyPrice('');
    setSalePrice('');
    setInitialQty('');
    setAddVisible(true);
  };

  const closeAddModal = () => {
    setAddVisible(false);
    setSelectedProductId(null);
    setBuyPrice('');
    setSalePrice('');
    setInitialQty('');
  };

  const handleAdd = async () => {
    if (!selectedProductId) {
      Alert.alert('Error', 'Select a product');
      return;
    }
    const parsedBuyPrice = parseFloat(buyPrice);
    const parsedPrice = parseFloat(salePrice);
    const parsedQty = parseInt(initialQty);

    if (isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
      Alert.alert('Error', 'Enter a valid buy price');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Error', 'Enter a valid sale price');
      return;
    }
    if (isNaN(parsedQty) || parsedQty < 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }

    const stockStatus: Stock['status'] =
      parsedQty <= 0 ? 'outStock' : parsedQty < 10 ? 'lowStock' : 'inStock';

    try {
      const existing = await StockRepository.getByProductId(selectedProductId);
      if (existing) {
        Alert.alert('Error', 'This product already has a stock record');
        return;
      }
      await StockRepository.create({
        product_id: selectedProductId,
        net_cost: parsedBuyPrice,
        sale_cost: parsedPrice,
        quantity: parsedQty,
        status: stockStatus,
        sync_status: 'pending',
        updated_at: undefined,
      } as any);
      Alert.alert('Success', 'Stock added successfully');
      closeAddModal();
      loadStocks();
    } catch (error) {
      Alert.alert('Error', 'Failed to add stock');
    }
  };

  const lowStock = stocks.filter(s => s.status === 'lowStock' || s.status === 'outStock');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Management</Text>
        <IconButton icon="plus" iconColor={Colors.primary} onPress={openAddModal} />
      </View>
      {lowStock.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>⚠️ {lowStock.length} item(s) low/out of stock</Text>
        </View>
      )}
      <FlatList
        data={stocks}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.item} onPress={() => openAdjustModal(item)}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemText}>{getProductName(item.product_id)}</Text>
              <Text style={styles.subText}>
                Buy: {currency.symbol}{item.net_cost.toFixed(2)} · Sale: {currency.symbol}{item.sale_cost.toFixed(2)}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Text style={[styles.status, item.status === 'outStock' && styles.outStock, item.status === 'lowStock' && styles.lowStock]}>
                {humanize(item.status)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No stock records found</Text>}
      />

      <Modal visible={adjustVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stock Adjustment</Text>
            <Text style={styles.modalSubtitle}>
              {selectedStock && getProductName(selectedStock.product_id)}
            </Text>
            <Text style={styles.currentQty}>Current Quantity: {selectedStock?.quantity}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, adjustmentType === 'increase' && styles.typeBtnActive]}
                onPress={() => setAdjustmentType('increase')}>
                <Text style={[styles.typeBtnText, adjustmentType === 'increase' && styles.typeBtnTextActive]}>
                  Increase
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, adjustmentType === 'decrease' && styles.typeBtnActive]}
                onPress={() => setAdjustmentType('decrease')}>
                <Text style={[styles.typeBtnText, adjustmentType === 'decrease' && styles.typeBtnTextActive]}>
                  Decrease
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={adjustQty}
              onChangeText={setAdjustQty}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAdjustModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdjust}>
                <Text style={styles.saveButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Stock</Text>
            <Text style={styles.label}>Product</Text>
            <View style={styles.productRow}>
              {productsWithoutStock.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productChip, selectedProductId === product.id && styles.productChipActive]}
                  onPress={() => setSelectedProductId(product.id)}>
                  <Text style={[styles.productChipText, selectedProductId === product.id && styles.productChipTextActive]}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Buy Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={buyPrice}
              onChangeText={setBuyPrice}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Sale Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={salePrice}
              onChangeText={setSalePrice}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={initialQty}
              onChangeText={setInitialQty}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                <Text style={styles.saveButtonText}>Add</Text>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  alertBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  alertText: {
    color: '#856404',
    fontWeight: 'bold',
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
  itemInfo: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
  },
  subText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  qty: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  status: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  lowStock: {
    color: Colors.warning,
  },
  outStock: {
    color: Colors.error,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  currentQty: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
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
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  productChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  productChipTextActive: {
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

export default StockScreen;
