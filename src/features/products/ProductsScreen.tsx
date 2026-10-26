import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal} from 'react-native';
import {Colors} from '../../core/constants';
import {humanize} from '../../core/utils';
import {ProductRepository} from '../../core/database/repositories/ProductRepository';
import {CategoryRepository} from '../../core/database/repositories/CategoryRepository';
import {Product, Category} from '../../types';
import {IconButton} from 'react-native-paper';

const ProductsScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const loadData = async () => {
    const [prods, cats] = await Promise.all([
      ProductRepository.getAll(),
      CategoryRepository.getAll(),
    ]);
    setProducts(prods);
    setCategories(cats);
    if (cats.length > 0 && !categoryId) {
      setCategoryId(cats[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStatus('active');
  };

  const openAdd = () => {
    resetForm();
    setCategoryId(categories[0]?.id ?? null);
    setModalVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategoryId(product.category_id);
    setStatus(product.status);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!name.trim() || !categoryId) {
      Alert.alert('Error', 'Name and category are required');
      return;
    }

    const existing = editingId ? products.find(p => p.id === editingId) : undefined;

    try {
      if (editingId) {
        await ProductRepository.update(editingId, {
          name: name.trim(),
          category_id: categoryId,
          image: existing?.image,
          status,
          sync_status: 'pending',
        });
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await ProductRepository.create({
          name: name.trim(),
          category_id: categoryId,
          status,
          sync_status: 'pending',
          created_at: '',
          updated_at: undefined,
        } as any);
        Alert.alert('Success', 'Product added successfully');
      }

      closeModal();
      loadData();
    } catch (error) {
      Alert.alert('Error', editingId ? 'Failed to update product' : 'Failed to save product');
    }
  };

  const confirmDelete = async (product: Product) => {
    try {
      const saleCount = await ProductRepository.getSaleDetailsCount(product.id);
      if (saleCount > 0) {
        Alert.alert(
          'Cannot Delete',
          'This product appears in past sales. Set its status to Inactive instead to hide it from the POS.',
        );
        return;
      }
      Alert.alert(
        'Delete Product',
        `Delete "${product.name}"? This cannot be undone.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await ProductRepository.delete(product.id);
                loadData();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete product');
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete product');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <IconButton icon="plus" iconColor={Colors.primary} onPress={openAdd} />
      </View>
      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <TouchableOpacity style={styles.itemMain} onPress={() => openEdit(item)}>
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={styles.subText}>
                {categories.find(c => c.id === item.category_id)?.name}
              </Text>
            </TouchableOpacity>
            <View style={styles.itemRight}>
              <Text style={[styles.status, item.status === 'active' ? styles.active : styles.inactive]}>
                {humanize(item.status)}
              </Text>
              <View style={styles.rowActions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  iconColor={Colors.primary}
                  onPress={() => openEdit(item)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={Colors.error}
                  onPress={() => confirmDelete(item)}
                />
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Product' : 'Add Product'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
                  onPress={() => setCategoryId(cat.id)}>
                  <Text style={[styles.categoryChipText, categoryId === cat.id && styles.categoryChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Status</Text>
            <View style={styles.categoryRow}>
              {(['active', 'inactive'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.categoryChip, status === s && styles.categoryChipActive]}
                  onPress={() => setStatus(s)}>
                  <Text style={[styles.categoryChipText, status === s && styles.categoryChipTextActive]}>
                    {humanize(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Save'}</Text>
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
  itemRight: {
    alignItems: 'flex-end',
  },
  rowActions: {
    flexDirection: 'row',
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
  },
  subText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  status: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  active: {
    color: Colors.success,
  },
  inactive: {
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
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

export default ProductsScreen;
