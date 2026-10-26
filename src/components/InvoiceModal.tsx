import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {format} from 'date-fns';
import {Colors} from '../core/constants';
import {SettingsRepository} from '../core/database/repositories/SettingsRepository';
import {Sale, SaleDetail} from '../types';
import {humanize, parseLineExtras} from '../core/utils';
import {printInvoice} from '../services/PrinterService';

interface InvoiceModalProps {
  visible: boolean;
  sale: Sale | null;
  details: SaleDetail[];
  currency: {code: string; symbol: string};
  customerName?: string;
  closeLabel?: string;
  onClose: () => void;
}

interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const DEFAULT_SHOP: ShopInfo = {
  name: 'Obydullah Restaurant',
  address: '',
  phone: '',
  email: '',
};

const InvoiceModal = ({
  visible,
  sale,
  details,
  currency,
  customerName,
  closeLabel = 'Done',
  onClose,
}: InvoiceModalProps) => {
  const [shop, setShop] = useState<ShopInfo>(DEFAULT_SHOP);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    setPrintStatus('');
    SettingsRepository.get('shop_info')
      .then(value => {
        if (value) {
          const saved = JSON.parse(value);
          setShop({
            name: saved.name || DEFAULT_SHOP.name,
            address: saved.address || '',
            phone: saved.phone || '',
            email: saved.email || '',
          });
        } else {
          setShop(DEFAULT_SHOP);
        }
      })
      .catch(() => setShop(DEFAULT_SHOP));
  }, [visible]);

  if (!sale) {
    return null;
  }

  const saleDate = sale.created_at
    ? new Date(sale.created_at.replace(' ', 'T'))
    : new Date();
  const dateText = format(
    isNaN(saleDate.getTime()) ? new Date() : saleDate,
    'dd/MM/yyyy HH:mm',
  );
  const invoiceNumber = `INV-${String(sale.id).padStart(5, '0')}`;
  const amount = (value: number) => `${currency.symbol}${value.toFixed(2)}`;

  const handlePrint = async () => {
    if (printing) {
      return;
    }
    setPrinting(true);
    setPrintStatus('');
    try {
      await printInvoice(sale, details, currency.code);
      setPrintStatus('Invoice sent to printer');
    } catch (error: any) {
      setPrintStatus('');
      Alert.alert(
        'Unable to print',
        error?.message ||
          'Check that the printer is switched on, paired, and configured in Settings.',
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.receipt}>
              <View style={styles.brandBlock}>
                <Text style={styles.shopName}>{shop.name}</Text>
                {!!shop.address && <Text style={styles.shopMeta}>{shop.address}</Text>}
                {!!shop.phone && <Text style={styles.shopMeta}>{shop.phone}</Text>}
                {!!shop.email && <Text style={styles.shopMeta}>{shop.email}</Text>}
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.invoiceHeading}>
                <Text style={styles.invoiceTitle}>INVOICE</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidText}>PAID</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice</Text>
                <Text style={styles.metaValue}>{invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order</Text>
                <Text style={styles.metaValue}>#{sale.id}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{dateText}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Type</Text>
                <Text style={styles.metaValue}>{humanize(sale.sale_type)}</Text>
              </View>
              {!!sale.table_number && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Table</Text>
                  <Text style={styles.metaValue}>{sale.table_number}</Text>
                </View>
              )}
              {!!sale.postcode && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Postcode</Text>
                  <Text style={styles.metaValue}>{sale.postcode}</Text>
                </View>
              )}
              {!!sale.address && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Address</Text>
                  <Text style={styles.metaValue}>{sale.address}</Text>
                </View>
              )}
              {!!sale.pickup_time && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Pickup</Text>
                  <Text style={styles.metaValue}>{sale.pickup_time}</Text>
                </View>
              )}
              {!!customerName && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Customer</Text>
                  <Text style={styles.metaValue}>{customerName}</Text>
                </View>
              )}

              <View style={styles.dashedDivider} />

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.itemColumn]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.qtyColumn]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.amountColumn]}>Amount</Text>
              </View>

              {details.map(detail => {
                const extras = parseLineExtras(detail.extras);
                return (
                  <View key={detail.id} style={styles.itemRow}>
                    <View style={styles.itemColumn}>
                      <Text style={styles.itemName}>{detail.product_name}</Text>
                      <Text style={styles.itemUnit}>{amount(detail.unit_price)} each</Text>
                      {extras.length > 0 && (
                        <Text style={styles.itemExtras}>
                          {extras
                            .map(extra => `${extra.name} +${amount(extra.price)}`)
                            .join(' · ')}
                        </Text>
                      )}
                      {!!detail.cooking_instructions && (
                        <Text style={styles.itemInstruction}>
                          📝 {detail.cooking_instructions}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.itemText, styles.qtyColumn]}>{detail.quantity}</Text>
                    <Text style={[styles.itemText, styles.amountColumn]}>
                      {amount(detail.total_price)}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.dashedDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{amount(sale.net_price)}</Text>
              </View>
              {sale.discount_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>-{amount(sale.discount_amount)}</Text>
                </View>
              )}
              {sale.tax_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>{amount(sale.tax_amount)}</Text>
                </View>
              )}
              {sale.vat_amount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>VAT</Text>
                  <Text style={styles.totalValue}>{amount(sale.vat_amount)}</Text>
                </View>
              )}

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>{amount(sale.grand_total)}</Text>
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment</Text>
                <Text style={styles.metaValue}>{humanize(sale.payment_method)}</Text>
              </View>
              {sale.payment_method === 'split' && (
                <>
                  {sale.cash_amount != null && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Cash</Text>
                      <Text style={styles.metaValue}>{amount(sale.cash_amount)}</Text>
                    </View>
                  )}
                  {sale.card_amount != null && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Card</Text>
                      <Text style={styles.metaValue}>{amount(sale.card_amount)}</Text>
                    </View>
                  )}
                </>
              )}

              <Text style={styles.thankYou}>Thank you for your business!</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {!!printStatus && <Text style={styles.printStatus}>{printStatus}</Text>}
            <TouchableOpacity
              style={[styles.printButton, printing && styles.disabledButton]}
              onPress={handlePrint}
              disabled={printing}>
              {printing ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.printButtonText}>Print Invoice</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
  },
  modalContent: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 12,
  },
  receipt: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 18,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  shopMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    marginVertical: 12,
  },
  invoiceHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  paidBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  paidText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.success,
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  itemColumn: {
    flex: 1,
  },
  qtyColumn: {
    width: 36,
    textAlign: 'center',
  },
  amountColumn: {
    width: 82,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  itemName: {
    fontSize: 13,
    color: Colors.text,
  },
  itemUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemInstruction: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
  },
  itemExtras: {
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
    fontWeight: 'bold',
  },
  itemText: {
    fontSize: 13,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 13,
    color: Colors.text,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.text,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  thankYou: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 18,
  },
  printStatus: {
    color: Colors.success,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actions: {
    padding: 12,
    paddingTop: 8,
    gap: 8,
    backgroundColor: Colors.background,
  },
  printButton: {
    backgroundColor: Colors.primary,
    padding: 13,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  printButtonText: {
    color: Colors.surface,
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 11,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default InvoiceModal;
