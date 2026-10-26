declare module 'react-native-bluetooth-escpos-printer' {
  export interface BluetoothDevice {
    name: string;
    address: string;
  }

  export const BluetoothManager: {
    isBluetoothEnabled(): Promise<boolean>;
    enableBluetooth(): Promise<string[]>;
    scanDevices(): Promise<string>;
    connect(address: string): Promise<any>;
    disconnect?(address: string): Promise<any>;
  };

  export const BluetoothEscposPrinter: {
    ALIGN: {
      LEFT: number;
      CENTER: number;
      RIGHT: number;
    };
    printerInit(): Promise<void>;
    printerAlign(align: number): Promise<void>;
    printText(text: string, options?: Record<string, any>): Promise<void>;
    printColumn(
      columnWidths: number[],
      columnAligns: number[],
      columnTexts: string[],
      options?: Record<string, any>,
    ): Promise<void>;
    printAndFeed(feed: number): Promise<void>;
  };

  export const BluetoothTscPrinter: any;
}
