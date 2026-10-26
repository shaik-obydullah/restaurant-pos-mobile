import React, {useEffect, useState} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal} from 'react-native';
import {Colors} from '../../core/constants';
import {humanize} from '../../core/utils';
import {CustomerRepository} from '../../core/database/repositories/CustomerRepository';
import {Customer} from '../../types';
import {IconButton} from 'react-native-paper';

const CustomersScreen = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadCustomers = async () => {
    const data = await CustomerRepository.getAll();
    setCustomers(data);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setMobile('');
    setAddress('');
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setEmail(customer.email);
    setMobile(customer.mobile || '');
    setAddress(customer.address || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    const existing = editingId ? customers.find(c => c.id === editingId) : undefined;

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        address: address.trim() || undefined,
        status: existing?.status || 'active',
        sync_status: existing?.sync_status || 'pending',
        created_at: '',
        updated_at: undefined,
      } as any;

      if (editingId) {
        await CustomerRepository.update(editingId, payload);
        Alert.alert('Success', 'Customer updated successfully');
      } else {
        await CustomerRepository.create(payload);
        Alert.alert('Success', 'Customer added successfully');
      }
      closeModal();
      loadCustomers();
    } catch (error) {
      Alert.alert('Error', editingId ? 'Failed to update customer' : 'Failed to save customer');
    }
  };

  const confirmDelete = (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Delete "${customer.name}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomerRepository.delete(customer.id);
              loadCustomers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <IconButton icon="plus" iconColor={Colors.primary} onPress={openAdd} />
      </View>
      <FlatList
        data={customers}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.item}>
            <TouchableOpacity style={styles.itemMain} onPress={() => openEdit(item)}>
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={styles.subText}>{item.email}</Text>
              {item.mobile && <Text style={styles.subText}>{item.mobile}</Text>}
              {item.address && <Text style={styles.subText}>{item.address}</Text>}
            </TouchableOpacity>
            <View style={styles.itemRight}>
              <Text style={styles.status}>{humanize(item.status)}</Text>
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
        ListEmptyComponent={<Text style={styles.empty}>No customers found</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Customer' : 'Add Customer'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
            />
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
    fontSize: 14,
    color: Colors.textSecondary,
  },
  status: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
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
    marginBottom: 12,
    fontSize: 16,
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

export default CustomersScreen;
