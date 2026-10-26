import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, TextInput, Alert} from 'react-native';
import {Colors, CURRENCIES, Currency} from '../../core/constants';
import {SettingsRepository} from '../../core/database/repositories';
import {useAppStore} from '../../store';

const SettingsScreen = () => {
  const {currency, setCurrency} = useAppStore();
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [printerModalVisible, setPrinterModalVisible] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(currency);

  const [shopInfo, setShopInfo] = useState({
    name: 'Obydullah Restaurant',
    address: '',
    phone: '',
    email: '',
  });

  const [taxVat, setTaxVat] = useState({
    taxRate: '0',
    vatRate: '0',
  });

  const [printerSettings, setPrinterSettings] = useState({
    printerName: '',
    printerType: 'Bluetooth',
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      const savedCurrency = await SettingsRepository.get('currency');
      if (savedCurrency) {
        const parsed = JSON.parse(savedCurrency);
        setCurrentCurrency(parsed);
        setCurrency(parsed);
      }

      const savedShop = await SettingsRepository.get('shop_info');
      if (savedShop) {
        setShopInfo(JSON.parse(savedShop));
      }

      const savedTax = await SettingsRepository.get('tax_vat');
      if (savedTax) {
        setTaxVat(JSON.parse(savedTax));
      }

      const savedPrinter = await SettingsRepository.get('printer_settings');
      if (savedPrinter) {
        setPrinterSettings(JSON.parse(savedPrinter));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleCurrencySelect = async (selectedCurrency: Currency) => {
    try {
      await SettingsRepository.set('currency', JSON.stringify(selectedCurrency));
      setCurrentCurrency(selectedCurrency);
      setCurrency(selectedCurrency);
      setCurrencyModalVisible(false);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const saveShopInfo = async () => {
    try {
      await SettingsRepository.set('shop_info', JSON.stringify(shopInfo));
      setShopModalVisible(false);
      Alert.alert('Success', 'Shop information saved successfully');
    } catch (error) {
      console.error('Error saving shop info:', error);
      Alert.alert('Error', 'Failed to save shop information');
    }
  };

  const saveTaxVat = async () => {
    try {
      await SettingsRepository.set('tax_vat', JSON.stringify(taxVat));
      setTaxModalVisible(false);
      Alert.alert('Success', 'Tax & VAT settings saved successfully');
    } catch (error) {
      console.error('Error saving tax settings:', error);
      Alert.alert('Error', 'Failed to save tax settings');
    }
  };

  const savePrinterSettings = async () => {
    try {
      await SettingsRepository.set('printer_settings', JSON.stringify(printerSettings));
      setPrinterModalVisible(false);
      Alert.alert('Success', 'Printer settings saved successfully');
    } catch (error) {
      console.error('Error saving printer settings:', error);
      Alert.alert('Error', 'Failed to save printer settings');
    }
  };

  const settingsItems = [
    {
      title: 'Shop Information',
      subtitle: shopInfo.name || 'Configure restaurant details',
      onPress: () => setShopModalVisible(true),
    },
    {
      title: 'Currency Settings',
      subtitle: `${currentCurrency.code} (${currentCurrency.symbol})`,
      onPress: () => setCurrencyModalVisible(true),
    },
    {
      title: 'Tax & VAT',
      subtitle: `Tax: ${taxVat.taxRate}% | VAT: ${taxVat.vatRate}%`,
      onPress: () => setTaxModalVisible(true),
    },
    {
      title: 'Printer Settings',
      subtitle: printerSettings.printerName || printerSettings.printerType,
      onPress: () => setPrinterModalVisible(true),
    },
    {title: 'About App', subtitle: 'Version 1.0.0'},
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      {settingsItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.itemCard}
          onPress={item.onPress}
          disabled={!item.onPress}>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Currency Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={currencyModalVisible}
        onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={item => item.code}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    currentCurrency.code === item.code && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleCurrencySelect(item)}>
                  <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                    <Text style={styles.currencyName}>{item.name}</Text>
                  </View>
                  {currentCurrency.code === item.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Shop Information Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shopModalVisible}
        onRequestClose={() => setShopModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shop Information</Text>
              <TouchableOpacity onPress={() => setShopModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Restaurant Name</Text>
              <TextInput
                style={styles.input}
                value={shopInfo.name}
                onChangeText={text => setShopInfo({...shopInfo, name: text})}
                placeholder="Enter restaurant name"
              />
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={shopInfo.address}
                onChangeText={text => setShopInfo({...shopInfo, address: text})}
                placeholder="Enter address"
                multiline
              />
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={shopInfo.phone}
                onChangeText={text => setShopInfo({...shopInfo, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={shopInfo.email}
                onChangeText={text => setShopInfo({...shopInfo, email: text})}
                placeholder="Enter email"
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.saveButton} onPress={saveShopInfo}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tax & VAT Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={taxModalVisible}
        onRequestClose={() => setTaxModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tax & VAT Settings</Text>
              <TouchableOpacity onPress={() => setTaxModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.label}>Tax Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={taxVat.taxRate}
                onChangeText={text => setTaxVat({...taxVat, taxRate: text})}
                placeholder="Enter tax rate"
                keyboardType="numeric"
              />
              <Text style={styles.label}>VAT Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={taxVat.vatRate}
                onChangeText={text => setTaxVat({...taxVat, vatRate: text})}
                placeholder="Enter VAT rate"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.saveButton} onPress={saveTaxVat}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Printer Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={printerModalVisible}
        onRequestClose={() => setPrinterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Printer Settings</Text>
              <TouchableOpacity onPress={() => setPrinterModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.label}>Printer Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    printerSettings.printerType === 'Bluetooth' && styles.radioButtonSelected,
                  ]}
                  onPress={() => setPrinterSettings({...printerSettings, printerType: 'Bluetooth'})}>
                  <Text
                    style={[
                      styles.radioText,
                      printerSettings.printerType === 'Bluetooth' && styles.radioTextSelected,
                    ]}>
                    Bluetooth
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    printerSettings.printerType === 'Thermal' && styles.radioButtonSelected,
                  ]}
                  onPress={() => setPrinterSettings({...printerSettings, printerType: 'Thermal'})}>
                  <Text
                    style={[
                      styles.radioText,
                      printerSettings.printerType === 'Thermal' && styles.radioTextSelected,
                    ]}>
                    Thermal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    printerSettings.printerType === 'WiFi' && styles.radioButtonSelected,
                  ]}
                  onPress={() => setPrinterSettings({...printerSettings, printerType: 'WiFi'})}>
                  <Text
                    style={[
                      styles.radioText,
                      printerSettings.printerType === 'WiFi' && styles.radioTextSelected,
                    ]}>
                    WiFi
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Printer Name/Device</Text>
              <TextInput
                style={styles.input}
                value={printerSettings.printerName}
                onChangeText={text => setPrinterSettings({...printerSettings, printerName: text})}
                placeholder={
                  printerSettings.printerType === 'WiFi'
                    ? '192.168.1.50 or 192.168.1.50:9100'
                    : 'Printer name or MAC address'
                }
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                {printerSettings.printerType === 'WiFi'
                  ? 'Enter the printer IP address. Port defaults to 9100 if omitted.'
                  : 'Pair the printer in Android Bluetooth settings first, then enter its name or MAC address here.'}
              </Text>
              <TouchableOpacity style={styles.saveButton} onPress={savePrinterSettings}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  itemCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currencyItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  currencySymbol: {
    fontSize: 24,
    width: 40,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  currencyName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 17,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  radioButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    color: Colors.text,
    fontSize: 14,
  },
  radioTextSelected: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
