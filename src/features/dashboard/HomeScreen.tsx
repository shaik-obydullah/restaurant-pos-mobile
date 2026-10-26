import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {Colors} from '../../core/constants';
import {SaleRepository} from '../../core/database/repositories/SaleRepository';
import {ProductRepository} from '../../core/database/repositories/ProductRepository';
import {CustomerRepository} from '../../core/database/repositories/CustomerRepository';
import {StockRepository} from '../../core/database/repositories/StockRepository';
import {useAppStore} from '../../store';
import {humanize} from '../../core/utils';

const HomeScreen = ({navigation}: any) => {
  const {currency} = useAppStore();
  const [todaySales, setTodaySales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const sales = await SaleRepository.getTodaySales();
    const total = sales.reduce((sum, sale) => sum + sale.grand_total, 0);
    setTodaySales(total);
    setTotalOrders(sales.length);
    setRecentOrders(sales.slice(0, 3));

    const products = await ProductRepository.getAll();
    setProductsCount(products.length);

    const customers = await CustomerRepository.getAll();
    setCustomersCount(customers.length);

    const stocks = await StockRepository.getAll();
    const low = stocks.filter(
      s =>
        s.is_active !== 0 &&
        (s.status === 'lowStock' || s.status === 'outStock'),
    ).length;
    setLowStockCount(low);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Restaurant POS Dashboard</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currency.symbol}{todaySales.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Today's Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Today's Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{productsCount}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{customersCount}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>
      </View>
      {lowStockCount > 0 && (
        <TouchableOpacity style={styles.alertCard} onPress={() => navigation.navigate('Inventory', {tab: 'stock'})}>
          <Text style={styles.alertCardText}>⚠️ {lowStockCount} Low/Out of Stock Items</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('POS')}>
          <Text style={styles.actionBtnText}>New Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.actionBtnText}>View Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Inventory', {tab: 'products'})}>
          <Text style={styles.actionBtnText}>Add Product</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Customers')}>
          <Text style={styles.actionBtnText}>Add Customer</Text>
        </TouchableOpacity>
      </View>
      {recentOrders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View>
                <Text style={styles.orderId}>Order #{order.id}</Text>
                <Text style={styles.orderType}>{humanize(order.sale_type)} - {humanize(order.payment_method)}</Text>
              </View>
              <Text style={styles.orderAmount}>{currency.symbol}{order.grand_total.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
    marginTop: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    width: '47%',
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  alertCardText: {
    color: '#856404',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 12,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  actionBtnText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  orderType: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});

export default HomeScreen;
