import {PermissionsAndroid, Platform} from 'react-native';
import {format} from 'date-fns';
import {Sale, SaleDetail} from '../types';
import {SettingsRepository} from '../core/database/repositories/SettingsRepository';
import {humanize} from '../core/utils';

const RECEIPT_WIDTH = 32;

interface PrinterSettings {
  printerName?: string;
  printerType?: string;
}

interface ShopInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface PrinterDevice {
  name?: string;
  address: string;
}

const formatSaleDate = (value: string): string => {
  const date = value ? new Date(value.replace(' ', 'T')) : new Date();
  return format(isNaN(date.getTime()) ? new Date() : date, 'dd/MM/yyyy HH:mm');
};

const money = (amount: number, currencyCode: string): string => {
  return `${currencyCode ? `${currencyCode} ` : ''}${Number(amount || 0).toFixed(2)}`;
};

const truncate = (value: string, length: number): string => {
  if (!value) {
    return '';
  }
  return value.length > length ? `${value.slice(0, length - 2)}..` : value;
};

const line = (label: string, value: string, width = RECEIPT_WIDTH): string => {
  const safeLabel = label.length >= width ? label.slice(0, width) : label;
  const space = Math.max(1, width - safeLabel.length);
  return `${safeLabel}${value.slice(0, space).padStart(space)}`;
};

const parseDevice = (value: any): PrinterDevice | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return parseDevice(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && value.address) {
    return {
      name: value.name || value.device_name || '',
      address: String(value.address),
    };
  }
  return null;
};

const parseDevices = (value: any): PrinterDevice[] => {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    try {
      return parseDevices(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value
      .map(parseDevice)
      .filter((device): device is PrinterDevice => Boolean(device));
  }
  if (typeof value === 'object') {
    const paired = Array.isArray(value.paired) ? value.paired : [];
    const found = Array.isArray(value.found) ? value.found : [];
    return [...paired, ...found]
      .map(parseDevice)
      .filter((device): device is PrinterDevice => Boolean(device));
  }
  return [];
};

const normalize = (value: string): string => {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

const isMacAddress = (value: string): boolean => {
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value.trim());
};

const requestBluetoothPermissions = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    const denied = Object.values(result).some(status => status !== 'granted');
    if (denied) {
      throw new Error(
        'Bluetooth permission is required. Allow nearby devices and try again.',
      );
    }
    return;
  }

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (!granted) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (result !== 'granted') {
      throw new Error(
        'Location permission is required to find Bluetooth printers. Allow it and try again.',
      );
    }
  }
};

const findBluetoothAddress = async (printerName: string): Promise<string> => {
  const {BluetoothManager} = require('react-native-bluetooth-escpos-printer');
  const pairedRaw = await BluetoothManager.enableBluetooth();
  if (isMacAddress(printerName)) {
    return printerName.trim();
  }

  const paired = parseDevices(pairedRaw);
  const wanted = normalize(printerName);
  const match = (devices: PrinterDevice[]) =>
    devices.find(
      device =>
        normalize(device.address) === wanted ||
        normalize(device.name || '') === wanted,
    );

  let device = match(paired);
  if (!device) {
    const scanned = parseDevices(await BluetoothManager.scanDevices());
    device = match(scanned);
  }

  if (!device) {
    throw new Error(
      `Printer "${printerName}" was not found. Pair it in Android Bluetooth settings, or enter its MAC address.`,
    );
  }

  return device.address;
};

const buildNetworkReceipt = (
  sale: Sale,
  details: SaleDetail[],
  shop: ShopInfo,
  currencyCode: string,
): string => {
  const lines: string[] = [];
  lines.push(`<C><B>${shop.name || 'RESTAURANT'}</B></C>`);
  if (shop.address) {
    lines.push(`<C>${shop.address}</C>`);
  }
  if (shop.phone) {
    lines.push(`<C>${shop.phone}</C>`);
  }
  if (shop.email) {
    lines.push(`<C>${shop.email}</C>`);
  }
  lines.push(`<C><B>INVOICE</B></C>`);
  lines.push(line('Order', `#${sale.id}`));
  lines.push(line('Date', formatSaleDate(sale.created_at)));
  lines.push(line('Type', humanize(sale.sale_type)));
  if (sale.table_number) {
    lines.push(line('Table', sale.table_number));
  }
  if (sale.postcode) {
    lines.push(line('Postcode', sale.postcode));
  }
  if (sale.address) {
    lines.push(line('Address', sale.address));
  }
  if (sale.pickup_time) {
    lines.push(line('Pickup', sale.pickup_time));
  }
  lines.push('--------------------------------');

  lines.push(
    `${'Item'.padEnd(16).slice(0, 16)}${'Qty'.padStart(3)}${'Amount'.padStart(13)}`,
  );
  lines.push('--------------------------------');
  details.forEach(detail => {
    const name = truncate(detail.product_name, 16).padEnd(16);
    const qty = String(detail.quantity).padStart(3);
    const amount = money(detail.total_price, currencyCode).padStart(13);
    lines.push(`${name}${qty}${amount}`);
  });
  lines.push('--------------------------------');
  lines.push(line('Subtotal', money(sale.net_price, currencyCode)));
  if (sale.discount_amount > 0) {
    lines.push(line('Discount', `-${money(sale.discount_amount, currencyCode)}`));
  }
  if (sale.tax_amount > 0) {
    lines.push(line('Tax', money(sale.tax_amount, currencyCode)));
  }
  if (sale.vat_amount > 0) {
    lines.push(line('VAT', money(sale.vat_amount, currencyCode)));
  }
  lines.push(`<R><B>TOTAL ${money(sale.grand_total, currencyCode)}</B></R>`);
  lines.push(line('Payment', humanize(sale.payment_method)));
  if (sale.payment_method === 'split') {
    if (sale.cash_amount != null) {
      lines.push(line('  Cash', money(sale.cash_amount, currencyCode)));
    }
    if (sale.card_amount != null) {
      lines.push(line('  Card', money(sale.card_amount, currencyCode)));
    }
  }
  lines.push('');
  lines.push(`<C>Thank you!</C>`);
  lines.push('');
  lines.push('');
  lines.push('');
  return lines.join('\n');
};

const printBluetoothReceipt = async (
  sale: Sale,
  details: SaleDetail[],
  shop: ShopInfo,
  currencyCode: string,
): Promise<void> => {
  const {BluetoothEscposPrinter: B} = require('react-native-bluetooth-escpos-printer');
  const textOptions = {encoding: 'UTF-8'};
  const left = B.ALIGN.LEFT;
  const center = B.ALIGN.CENTER;
  const right = B.ALIGN.RIGHT;

  await B.printerInit();
  await B.printerAlign(center);
  await B.printText(`${shop.name || 'RESTAURANT'}\n`, {
    ...textOptions,
    widthtimes: 1,
    heigthtimes: 1,
  });
  if (shop.address) {
    await B.printText(`${shop.address}\n`, textOptions);
  }
  if (shop.phone) {
    await B.printText(`${shop.phone}\n`, textOptions);
  }
  if (shop.email) {
    await B.printText(`${shop.email}\n`, textOptions);
  }
  await B.printText('INVOICE\n\n', {
    ...textOptions,
    widthtimes: 1,
    heigthtimes: 1,
  });

  await B.printerAlign(left);
  await B.printText(`Order: #${sale.id}\n`, textOptions);
  await B.printText(`Date: ${formatSaleDate(sale.created_at)}\n`, textOptions);
  await B.printText(`Type: ${humanize(sale.sale_type)}\n`, textOptions);
  if (sale.table_number) {
    await B.printText(`Table: ${sale.table_number}\n`, textOptions);
  }
  if (sale.postcode) {
    await B.printText(`Postcode: ${sale.postcode}\n`, textOptions);
  }
  if (sale.address) {
    await B.printText(`Address: ${sale.address}\n`, textOptions);
  }
  if (sale.pickup_time) {
    await B.printText(`Pickup: ${sale.pickup_time}\n`, textOptions);
  }
  await B.printText('--------------------------------\n', textOptions);

  const widths = [16, 3, 13];
  const aligns = [left, center, right];
  await B.printColumn(widths, aligns, ['Item', 'Qty', 'Amount'], textOptions);
  await B.printText('--------------------------------\n', textOptions);
  for (const detail of details) {
    await B.printColumn(
      widths,
      aligns,
      [
        truncate(detail.product_name, 16),
        String(detail.quantity),
        money(detail.total_price, currencyCode),
      ],
      textOptions,
    );
  }
  await B.printText('--------------------------------\n', textOptions);

  await B.printColumn(
    [18, 14],
    [left, right],
    ['Subtotal', money(sale.net_price, currencyCode)],
    textOptions,
  );
  if (sale.discount_amount > 0) {
    await B.printColumn(
      [18, 14],
      [left, right],
      ['Discount', `-${money(sale.discount_amount, currencyCode)}`],
      textOptions,
    );
  }
  if (sale.tax_amount > 0) {
    await B.printColumn(
      [18, 14],
      [left, right],
      ['Tax', money(sale.tax_amount, currencyCode)],
      textOptions,
    );
  }
  if (sale.vat_amount > 0) {
    await B.printColumn(
      [18, 14],
      [left, right],
      ['VAT', money(sale.vat_amount, currencyCode)],
      textOptions,
    );
  }
  await B.printerAlign(right);
  await B.printText(`TOTAL ${money(sale.grand_total, currencyCode)}\n`, {
    ...textOptions,
    widthtimes: 1,
    heigthtimes: 1,
  });
  await B.printerAlign(left);
  await B.printColumn(
    [18, 14],
    [left, right],
    ['Payment', humanize(sale.payment_method)],
    textOptions,
  );
  if (sale.payment_method === 'split') {
    if (sale.cash_amount != null) {
      await B.printColumn(
        [18, 14],
        [left, right],
        ['  Cash', money(sale.cash_amount, currencyCode)],
        textOptions,
      );
    }
    if (sale.card_amount != null) {
      await B.printColumn(
        [18, 14],
        [left, right],
        ['  Card', money(sale.card_amount, currencyCode)],
        textOptions,
      );
    }
  }
  await B.printerAlign(center);
  await B.printText('\nThank you!\n\n\n', textOptions);
  await B.printAndFeed(3);
};

const printNetworkReceipt = async (
  printerName: string,
  sale: Sale,
  details: SaleDetail[],
  shop: ShopInfo,
  currencyCode: string,
): Promise<void> => {
  const {NetPrinter} = require('react-native-thermal-receipt-printer');
  const cleaned = printerName.trim().replace(/^https?:\/\//i, '');
  const separator = cleaned.lastIndexOf(':');
  const host = separator > 0 ? cleaned.slice(0, separator) : cleaned;
  const port = separator > 0 ? cleaned.slice(separator + 1) : '9100';

  await NetPrinter.init();
  await NetPrinter.connectPrinter(host, port);
  NetPrinter.printBill(buildNetworkReceipt(sale, details, shop, currencyCode), {
    cut: true,
    beep: true,
  });
  // The native network printer API writes asynchronously and does not return a
  // completion callback, so give it a moment before closing the socket.
  await new Promise<void>(resolve => setTimeout(resolve, 1500));
  NetPrinter.closeConn();
};

export const printInvoice = async (
  sale: Sale,
  details: SaleDetail[],
  currencyCode: string,
): Promise<void> => {
  const savedPrinter = await SettingsRepository.get('printer_settings');
  const settings: PrinterSettings = savedPrinter ? JSON.parse(savedPrinter) : {};
  const printerName = (settings.printerName || '').trim();

  if (!printerName) {
    throw new Error(
      'No printer configured. Open Settings → Printer Settings and enter the printer MAC address or IP address.',
    );
  }

  const savedShop = await SettingsRepository.get('shop_info');
  const shop: ShopInfo = savedShop ? JSON.parse(savedShop) : {};
  if (!shop.name) {
    shop.name = 'Obydullah Restaurant';
  }

  if (settings.printerType === 'WiFi') {
    await printNetworkReceipt(printerName, sale, details, shop, currencyCode);
    return;
  }

  await requestBluetoothPermissions();
  const address = await findBluetoothAddress(printerName);
  const {BluetoothManager} = require('react-native-bluetooth-escpos-printer');
  await BluetoothManager.connect(address);
  await printBluetoothReceipt(sale, details, shop, currencyCode);
};
