import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Colors} from '../../core/constants';
import ProductsScreen from '../products/ProductsScreen';
import StockScreen from '../stock/StockScreen';
import CategoriesScreen from '../categories/CategoriesScreen';

type InventoryTab = 'products' | 'stock' | 'categories';

const InventoryScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const requestedTab = route.params?.tab;
  const [tab, setTab] = useState<InventoryTab>(
    requestedTab === 'stock' || requestedTab === 'categories' ? requestedTab : 'products',
  );

  useEffect(() => {
    const requested = route.params?.tab;
    if (requested === 'products' || requested === 'stock' || requested === 'categories') {
      setTab(requested);
      navigation.setParams({tab: undefined});
    }
  }, [route.params?.tab, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, tab === 'products' && styles.segmentActive]}
          onPress={() => setTab('products')}>
          <Text style={[styles.segmentText, tab === 'products' && styles.segmentTextActive]}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === 'stock' && styles.segmentActive]}
          onPress={() => setTab('stock')}>
          <Text style={[styles.segmentText, tab === 'stock' && styles.segmentTextActive]}>
            Stock
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === 'categories' && styles.segmentActive]}
          onPress={() => setTab('categories')}>
          <Text style={[styles.segmentText, tab === 'categories' && styles.segmentTextActive]}>
            Categories
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {tab === 'products' ? (
          <ProductsScreen />
        ) : tab === 'stock' ? (
          <StockScreen />
        ) : (
          <CategoriesScreen />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.surface,
  },
  content: {
    flex: 1,
  },
});

export default InventoryScreen;
