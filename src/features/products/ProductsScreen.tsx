import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView} from 'react-native';
import {Colors} from '../../core/constants';
import {humanize, formatIngredientList, parseIngredientList} from '../../core/utils';
import {ProductRepository} from '../../core/database/repositories/ProductRepository';
import {ProductOptionRepository} from '../../core/database/repositories/ProductOptionRepository';
import {CategoryRepository} from '../../core/database/repositories/CategoryRepository';
import {Product, Category} from '../../types';
import {IconButton} from 'react-native-paper';

interface ExtraDraft {
  name: string;
  price: string;
}

const ProductsScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [extras, setExtras] = useState<ExtraDraft[]>([]);
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
    setIngredients('');
    setExtras([]);
    setStatus('active');
  };

  const openAdd = () => {
    resetForm();
    setCategoryId(categories[0]?.id ?? null);
    setModalVisible(true);
  };

  const openEdit = async (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategoryId(product.category_id);
    setIngredients(parseIngredientList(product.ingredients).join(', '));
    setExtras([]);
    setStatus(product.status);
    setModalVisible(true);
    try {
      const options = await ProductOptionRepository.getByProduct(product.id);
      setExtras(
        options.map(option => ({
          name: option.name,
          price: option.price ? option.price.toFixed(2) : '',
        })),
      );
    } catch (error) {
      console.error('Load product extras error:', error);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const addExtraRow = () => {
    setExtras(current => [...current, {name: '', price: ''}]);
  };

  const updateExtraRow = (
    index: number,
    field: keyof ExtraDraft,
    value: string,
  ) => {
    setExtras(current =>
      current.map((extra, extraIndex) =>
        extraIndex === index ? {...extra, [field]: value} : extra,
      ),
    );
  };

  const removeExtraRow = (index: number) => {
    setExtras(current => current.filter((_, extraIndex) => extraIndex !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || !categoryId) {
      Alert.alert('Error', 'Name and category are required');
      return;
    }

    const parsedExtras: {name: string; price: number}[] = [];
    for (const extra of extras) {
      const extraName = extra.name.trim();
      if (!extraName) {
        continue;
      }
      const priceText = extra.price.trim();
      const extraPrice = priceText ? parseFloat(priceText) : 0;
      if (isNaN(extraPrice) || extraPrice < 0) {
        Alert.alert('Error', `Enter a valid price for "${extraName}"`);
        return;
      }
      parsedExtras.push({name: extraName, price: extraPrice});
    }

    const existing = editingId ? products.find(p => p.id === editingId) : undefined;

    try {
      let productId: number | null = editingId;
      if (editingId) {
        await ProductRepository.update(editingId, {
          name: name.trim(),
          category_id: categoryId,
          image: existing?.image,
          ingredients: ingredients.trim() || undefined,
          status,
          sync_status: 'pending',
        });
      } else {
        productId = await ProductRepository.create({
          name: name.trim(),
          category_id: categoryId,
          ingredients: ingredients.trim() || undefined,
          status,
          sync_status: 'pending',
          created_at: '',
          updated_at: undefined,
        } as any);
      }

      if (productId) {
        await ProductOptionRepository.replaceForProduct(productId, parsedExtras);
      }

      Alert.alert(
        'Success',
        editingId ? 'Product updated successfully' : 'Product added successfully',
      );
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
              {!!item.ingredients && (
                <Text style={styles.ingredientText} numberOfLines={2}>
                  {formatIngredientList(item.ingredients)}
                </Text>
              )}
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
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.input}
                placeholder="Product Name"
                value={name}
                onChangeText={setName}
              />
              <Text style={styles.label}>Ingredients (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cream, Oreo sprinkles, Chocolate sauce"
                value={ingredients}
                onChangeText={setIngredients}
              />
              <View style={styles.extrasHeader}>
                <Text style={styles.label}>Paid Extras</Text>
                <TouchableOpacity onPress={addExtraRow}>
                  <Text style={styles.addExtraText}>+ Add Extra</Text>
                </TouchableOpacity>
              </View>
              {extras.length === 0 ? (
                <Text style={styles.extrasEmpty}>
                  No extras yet. Add options like "Extra Oreo" for 0.50.
                </Text>
              ) : (
                extras.map((extra, index) => (
                  <View key={`extra-${index}`} style={styles.extraRow}>
                    <TextInput
                      style={[styles.input, styles.extraNameInput]}
                      placeholder="Extras name"
                      value={extra.name}
                      onChangeText={value => updateExtraRow(index, 'name', value)}
                    />
                    <TextInput
                      style={[styles.input, styles.extraPriceInput]}
                      placeholder="0.00"
                      value={extra.price}
                      onChangeText={value => updateExtraRow(index, 'price', value)}
                      keyboardType="decimal-pad"
                    />
                    <TouchableOpacity
                      style={styles.removeExtraBtn}
                      onPress={() => removeExtraRow(index)}>
                      <Text style={styles.removeExtraText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
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
            </ScrollView>
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
  ingredientText: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
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
    marginBottom: 16,
  },
  extrasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExtraText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  extrasEmpty: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extraNameInput: {
    flex: 1,
    marginBottom: 8,
  },
  extraPriceInput: {
    width: 90,
    marginBottom: 8,
  },
  removeExtraBtn: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  removeExtraText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: 'bold',
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
