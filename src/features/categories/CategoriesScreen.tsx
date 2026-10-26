import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal} from 'react-native';
import {Colors} from '../../core/constants';
import {humanize} from '../../core/utils';
import {CategoryRepository} from '../../core/database/repositories/CategoryRepository';
import {Category} from '../../types';
import {IconButton} from 'react-native-paper';

const CategoriesScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const loadCategories = async () => {
    const data = await CategoryRepository.getAll();
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setEditMode(false);
    setSelectedCategory(null);
    setName('');
    setStatus('active');
    setModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditMode(true);
    setSelectedCategory(category);
    setName(category.name);
    setStatus(category.status);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      if (editMode && selectedCategory) {
        await CategoryRepository.update(selectedCategory.id, {
          name: name.trim(),
          status,
          sync_status: 'pending',
        });
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await CategoryRepository.create({
          name: name.trim(),
          status,
          sync_status: 'pending',
        });
        Alert.alert('Success', 'Category added successfully');
      }
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete ${category.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CategoryRepository.delete(category.id);
              loadCategories();
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <IconButton icon="plus" iconColor={Colors.primary} onPress={openAddModal} />
      </View>
      <FlatList
        data={categories}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <TouchableOpacity style={styles.itemContent} onPress={() => openEditModal(item)}>
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={[styles.status, item.status === 'active' ? styles.active : styles.inactive]}>
                {humanize(item.status)}
              </Text>
            </TouchableOpacity>
            <IconButton icon="delete" iconColor={Colors.error} onPress={() => handleDelete(item)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No categories found</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editMode ? 'Edit Category' : 'Add Category'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Category Name"
              value={name}
              onChangeText={setName}
            />
            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[styles.statusButton, status === 'active' && styles.statusButtonActive]}
                onPress={() => setStatus('active')}>
                <Text style={[styles.statusButtonText, status === 'active' && styles.statusButtonTextActive]}>
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, status === 'inactive' && styles.statusButtonActive]}
                onPress={() => setStatus('inactive')}>
                <Text style={[styles.statusButtonText, status === 'inactive' && styles.statusButtonTextActive]}>
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
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
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  itemContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: Colors.text,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  statusButton: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusButtonText: {
    color: Colors.text,
  },
  statusButtonTextActive: {
    color: Colors.surface,
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

export default CategoriesScreen;
