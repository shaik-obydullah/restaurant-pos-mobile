import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {Colors} from '../../core/constants';
import {CategoryRepository} from '../../core/database/repositories/CategoryRepository';
import {ProductRepository} from '../../core/database/repositories/ProductRepository';
import {StockRepository} from '../../core/database/repositories/StockRepository';
import {useAppStore} from '../../store';
import {CartRepository} from '../../core/database/repositories/CartRepository';
import {SaleRepository} from '../../core/database/repositories/SaleRepository';
import {SaleDetailRepository} from '../../core/database/repositories/SaleDetailRepository';
import {CustomerRepository} from '../../core/database/repositories/CustomerRepository';
import {SettingsRepository} from '../../core/database/repositories/SettingsRepository';
import {Category, Product, Customer, Sale, SaleDetail} from '../../types';
import {generateUUID, humanize} from '../../core/utils';
import {useFocusEffect} from '@react-navigation/native';
import InvoiceModal from '../../components/InvoiceModal';

const SESSION_ID = 'pos_session_default';

const PosScreen = () => {
  const {currency} = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saleType, setSaleType] = useState<'dineIn' | 'takeAway' | 'pickUp'>('dineIn');
  const [tableNumber, setTableNumber] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [vat, setVat] = useState('0');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<SaleDetail[]>([]);
  const [invoiceCustomerName, setInvoiceCustomerName] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  // Reload the cart every time the POS tab gains focus, so orders loaded
  // from the Orders screen (or saved elsewhere) show up immediately.
  useFocusEffect(
    useCallback(() => {
      loadCart();
      loadTaxVatDefaults();
    }, []),
  );

  const loadData = async () => {
    const [cats, custs, prods] = await Promise.all([
      CategoryRepository.getAll(),
      CustomerRepository.getAll(),
      ProductRepository.getAll(),
    ]);
    setCategories(cats.filter(c => c.status === 'active'));
    setCustomers(custs.filter(c => c.status === 'active'));
    setAllProducts(prods);
    if (cats.length > 0 && !selectedCategory) {
      setSelectedCategory(cats[0].id);
    }
    loadProducts(cats[0]?.id || null);
    loadCart();
    loadTaxVatDefaults();
  };

  const loadTaxVatDefaults = async () => {
    try {
      const savedTax = await SettingsRepository.get('tax_vat');
      if (savedTax) {
        const parsed = JSON.parse(savedTax);
        setTax(String(parsed.taxRate ?? '0'));
        setVat(String(parsed.vatRate ?? '0'));
      }
    } catch (error) {
      console.error('Error loading tax settings:', error);
    }
  };

  const loadProducts = async (categoryId: number | null) => {
    if (categoryId) {
      const prods = await ProductRepository.getByCategory(categoryId);
      setProducts(prods);
    } else {
      const prods = await ProductRepository.getAll();
      setProducts(prods.filter(p => p.status === 'active'));
    }
  };

  const loadCart = async () => {
    const items = await CartRepository.getBySession(SESSION_ID);
    setCart(items);
  };

  const removeFromCart = async (id: number) => {
    await CartRepository.removeItem(id);
    loadCart();
  };

  const clearCart = async () => {
    if (cart.length === 0) {
      return;
    }
    Alert.alert('Clear Cart', 'Remove all items from the cart?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await CartRepository.clearSession(SESSION_ID);
          setCart([]);
        },
      },
    ]);
  };

  const addToCart = async (product: Product) => {
    const stock = await StockRepository.getByProductId(product.id);
    if (!stock || stock.quantity <= 0) {
      Alert.alert('Out of Stock', 'This product is out of stock');
      return;
    }
    await CartRepository.addItem({
      session_id: SESSION_ID,
      product_id: product.id,
      stock_id: stock.id,
      quantity: 1,
      unit_price: stock.sale_cost,
      cooking_instructions: undefined,
      created_at: '',
      updated_at: undefined,
    } as any);
    loadCart();
  };

  const calculateSubtotal = () => {
    let total = 0;
    cart.forEach(item => {
      total += item.unit_price * item.quantity;
    });
    return total;
  };

  const calculateTax = () => {
    return (calculateSubtotal() * (parseFloat(tax) || 0)) / 100;
  };

  const calculateVat = () => {
    return (calculateSubtotal() * (parseFloat(vat) || 0)) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const disc = parseFloat(discount) || 0;
    return subtotal - disc + calculateTax() + calculateVat();
  };

  const selectPaymentMethod = (method: 'cash' | 'card' | 'split') => {
    setPaymentMethod(method);
    if (method === 'split') {
      const total = calculateTotal();
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      // Seed the split with the full total in cash the first time.
      if (cash + card <= 0) {
        setCashAmount(total.toFixed(2));
        setCardAmount('0.00');
      }
    }
  };

  const handleCashChange = (text: string) => {
    setCashAmount(text);
    const total = calculateTotal();
    const cash = parseFloat(text) || 0;
    const remaining = total - cash;
    setCardAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');
  };

  const handleCardChange = (text: string) => {
    setCardAmount(text);
    const total = calculateTotal();
    const card = parseFloat(text) || 0;
    const remaining = total - card;
    setCashAmount(remaining > 0 ? remaining.toFixed(2) : '0.00');
  };

  const getSplitAmounts = () => ({
    cash: parseFloat(cashAmount) || 0,
    card: parseFloat(cardAmount) || 0,
  });

  const getCartCosts = async () => {
    const itemCosts: {[productId: number]: number} = {};
    let costTotal = 0;
    for (const item of cart) {
      const stock = await StockRepository.getByProductId(item.product_id);
      const unitCost = stock?.net_cost ?? 0;
      itemCosts[item.product_id] = unitCost;
      costTotal += unitCost * item.quantity;
    }
    return {itemCosts, costTotal};
  };

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }
    try {
      const subtotal = calculateSubtotal();
      const disc = parseFloat(discount) || 0;
      const t = (subtotal * (parseFloat(tax) || 0)) / 100;
      const v = (subtotal * (parseFloat(vat) || 0)) / 100;
      const total = subtotal - disc + t + v;
      const split = getSplitAmounts();
      const {itemCosts, costTotal} = await getCartCosts();

      const saleId = await SaleRepository.create({
        uuid: generateUUID(),
        customer_id: selectedCustomer,
        net_price: subtotal,
        vat_amount: v,
        tax_amount: t,
        shipping_cost: 0,
        discount_amount: disc,
        grand_total: total,
        buy_price: costTotal,
        sale_type: saleType,
        table_number: saleType === 'dineIn' ? tableNumber || null : null,
        postcode: saleType === 'takeAway' ? postcode || null : null,
        address: saleType === 'takeAway' ? address || null : null,
        pickup_time: saleType === 'pickUp' ? pickupTime || null : null,
        status: 'saveSale',
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'split' ? split.cash : null,
        card_amount: paymentMethod === 'split' ? split.card : null,
        synced: 0,
        sync_attempts: 0,
        created_at: '',
        updated_at: undefined,
      } as any);

      for (const item of cart) {
        await SaleDetailRepository.create({
          sale_id: saleId,
          product_id: item.product_id,
          stock_id: item.stock_id,
          product_name: allProducts.find(p => p.id === item.product_id)?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          unit_cost: itemCosts[item.product_id] || 0,
          sync_status: 'pending',
          created_at: '',
          updated_at: undefined,
        } as any);
      }

      await CartRepository.clearSession(SESSION_ID);
      setCart([]);
      setDiscount('0');
      setTax('0');
      setVat('0');
      setSelectedCustomer(null);
      setTableNumber('');
      setPostcode('');
      setAddress('');
      setPickupTime('');
      setCashAmount('');
      setCardAmount('');
      Alert.alert('Success', 'Order saved');
      loadData();
    } catch (error: any) {
      console.error('Save order error:', error);
      Alert.alert('Error', 'Failed to save order: ' + (error?.message || String(error)));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }
    const subtotal = calculateSubtotal();
    const disc = parseFloat(discount) || 0;
    const t = (subtotal * (parseFloat(tax) || 0)) / 100;
    const v = (subtotal * (parseFloat(vat) || 0)) / 100;
    const total = subtotal - disc + t + v;
    const paid = total;
    const split = getSplitAmounts();

    if (paymentMethod === 'split' && Math.abs(split.cash + split.card - total) > 0.01) {
      Alert.alert(
        'Invalid Split',
        'Cash and card amounts must add up to the total.',
      );
      return;
    }

    try {
      const {itemCosts, costTotal} = await getCartCosts();
      const customerName = selectedCustomer
        ? customers.find(c => c.id === selectedCustomer)?.name
        : undefined;
      const saleId = await SaleRepository.create({
        uuid: generateUUID(),
        customer_id: selectedCustomer,
        net_price: subtotal,
        vat_amount: v,
        tax_amount: t,
        shipping_cost: 0,
        discount_amount: disc,
        grand_total: total,
        paid_amount: paid,
        buy_price: costTotal,
        sale_type: saleType,
        table_number: saleType === 'dineIn' ? tableNumber || null : null,
        postcode: saleType === 'takeAway' ? postcode || null : null,
        address: saleType === 'takeAway' ? address || null : null,
        pickup_time: saleType === 'pickUp' ? pickupTime || null : null,
        status: 'completed',
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'split' ? split.cash : null,
        card_amount: paymentMethod === 'split' ? split.card : null,
        synced: 0,
        sync_attempts: 0,
        created_at: '',
        updated_at: undefined,
      } as any);

      for (const item of cart) {
        await SaleDetailRepository.create({
          sale_id: saleId,
          product_id: item.product_id,
          stock_id: item.stock_id,
          product_name: allProducts.find(p => p.id === item.product_id)?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          unit_cost: itemCosts[item.product_id] || 0,
          sync_status: 'pending',
          created_at: '',
          updated_at: undefined,
        } as any);
        const stock = await StockRepository.getByProductId(item.product_id);
        if (stock) {
          await StockRepository.updateQuantity(stock.id, stock.quantity - item.quantity);
        }
      }

      const [savedSale, savedDetails] = await Promise.all([
        SaleRepository.getById(saleId),
        SaleDetailRepository.getBySaleId(saleId),
      ]);

      await CartRepository.clearSession(SESSION_ID);
      setModalVisible(false);
      setCart([]);
      setTableNumber('');
      setPostcode('');
      setAddress('');
      setPickupTime('');
      setCashAmount('');
      setCardAmount('');
      setDiscount('0');
      setTax('0');
      setVat('0');
      setSelectedCustomer(null);

      if (savedSale) {
        setInvoiceSale(savedSale);
        setInvoiceDetails(savedDetails);
        setInvoiceCustomerName(customerName);
        setInvoiceVisible(true);
      }
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete order');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>POS</Text>
      </View>
      <View style={styles.mainRow}>
        <View style={styles.leftPanel}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item.id && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(item.id);
                  loadProducts(item.id);
                }}>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === item.id && styles.categoryTextActive,
                  ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.categoryList}
          />
          <FlatList
            data={products}
            numColumns={2}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                <Text style={styles.productName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        <View style={styles.rightPanel}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart</Text>
            <TouchableOpacity style={styles.clearCartBtn} onPress={clearCart}>
              <Text style={styles.clearCartText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.customerBtn} onPress={() => setCustomerModalVisible(true)}>
            <Text style={styles.customerBtnText}>
              {selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'Select Customer'}
            </Text>
          </TouchableOpacity>
          <FlatList
            data={cart}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>
                    {(allProducts.find(p => p.id === item.product_id) ||
                      products.find(p => p.id === item.product_id))?.name || 'Item'}
                  </Text>
                  <Text style={styles.cartItemPrice}>
                    {item.quantity} x {currency.symbol}{item.unit_price.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.cartItemTotal}>{currency.symbol}{(item.unit_price * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity
                  style={styles.removeItemBtn}
                  onPress={() => removeFromCart(item.id)}>
                  <Text style={styles.removeItemText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyCart}>Cart is empty</Text>}
          />
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal:</Text>
            <Text style={styles.calcValue}>{currency.symbol}{calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Discount:</Text>
            <TextInput
              style={styles.calcInput}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Tax (%):</Text>
            <TextInput
              style={styles.calcInput}
              value={tax}
              onChangeText={setTax}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>VAT (%):</Text>
            <TextInput
              style={styles.calcInput}
              value={vat}
              onChangeText={setVat}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.cartFooter}>
            <Text style={styles.totalText}>Total: {currency.symbol}{calculateTotal().toFixed(2)}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveOrder}>
              <Text style={styles.saveBtnText}>Hold/Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkoutButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout</Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTotal}>Total: {currency.symbol}{calculateTotal().toFixed(2)}</Text>

              <Text style={styles.label}>Sale Type</Text>
              <View style={styles.row}>
                {(['dineIn', 'takeAway', 'pickUp'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, saleType === type && styles.typeButtonActive]}
                    onPress={() => setSaleType(type)}>
                    <Text style={[styles.typeText, saleType === type && styles.typeTextActive]}>
                      {humanize(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {saleType === 'dineIn' && (
                <TextInput
                  style={styles.input}
                  placeholder="Table Number"
                  value={tableNumber}
                  onChangeText={setTableNumber}
                />
              )}

              {saleType === 'takeAway' && (
                <>
                  <Text style={styles.label}>Post Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. AB1 2CD"
                    value={postcode}
                    onChangeText={setPostcode}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.label}>House Number / Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 12 Baker Street"
                    value={address}
                    onChangeText={setAddress}
                  />
                </>
              )}

              {saleType === 'pickUp' && (
                <>
                  <Text style={styles.label}>Pickup Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 18:30"
                    value={pickupTime}
                    onChangeText={setPickupTime}
                  />
                </>
              )}

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.row}>
                {(['cash', 'card', 'split'] as const).map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.typeButton, paymentMethod === method && styles.typeButtonActive]}
                    onPress={() => selectPaymentMethod(method)}>
                    <Text style={[styles.typeText, paymentMethod === method && styles.typeTextActive]}>
                      {humanize(method)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod === 'split' && (
                <View style={styles.splitRow}>
                  <View style={styles.splitField}>
                    <Text style={styles.label}>Cash Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={cashAmount}
                      onChangeText={handleCashChange}
                      keyboardType="numeric"
                      placeholder="0.00"
                    />
                  </View>
                  <View style={styles.splitField}>
                    <Text style={styles.label}>Card Amount</Text>
                    <TextInput
                      style={styles.input}
                      value={cardAmount}
                      onChangeText={handleCardChange}
                      keyboardType="numeric"
                      placeholder="0.00"
                    />
                  </View>
                </View>
              )}

              <View style={styles.paidRow}>
                <Text style={styles.paidLabel}>Paid Amount:</Text>
                <Text style={styles.paidValue}>
                  {currency.symbol}{calculateTotal().toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleCheckout}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <InvoiceModal
        visible={invoiceVisible}
        sale={invoiceSale}
        details={invoiceDetails}
        currency={currency}
        customerName={invoiceCustomerName}
        closeLabel="New Order"
        onClose={() => setInvoiceVisible(false)}
      />

      <Modal visible={customerModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <FlatList
              data={customers}
              keyExtractor={item => item.id.toString()}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item.id);
                    setCustomerModalVisible(false);
                  }}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No customers</Text>}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedCustomer(null);
                setCustomerModalVisible(false);
              }}>
              <Text style={styles.cancelButtonText}>No Customer</Text>
            </TouchableOpacity>
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
  },
  header: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    padding: 8,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    padding: 8,
  },
  categoryList: {
    maxHeight: 60,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    color: Colors.text,
  },
  categoryTextActive: {
    color: Colors.surface,
  },
  productCard: {
    flex: 1,
    margin: 4,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  clearCartBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearCartText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    color: Colors.text,
  },
  cartItemPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  removeItemBtn: {
    marginLeft: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  emptyCart: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.textSecondary,
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.textSecondary,
  },
  customerBtn: {
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerBtnText: {
    color: Colors.text,
    fontSize: 13,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: 13,
    color: Colors.text,
  },
  calcValue: {
    fontSize: 13,
    color: Colors.text,
  },
  calcInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 4,
    width: 60,
    textAlign: 'right',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: Colors.warning,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  saveBtnText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerName: {
    fontSize: 16,
    color: Colors.text,
  },
  customerEmail: {
    fontSize: 12,
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
    maxHeight: '85%',
  },
  modalScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    color: Colors.text,
    fontSize: 12,
  },
  typeTextActive: {
    color: Colors.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitField: {
    flex: 1,
  },
  paidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  paidLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  paidValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    padding: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  confirmButtonText: {
    color: Colors.surface,
  },
});

export default PosScreen;
