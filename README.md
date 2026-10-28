# Restaurant POS Mobile

An offline-first restaurant point-of-sale app for Android, built with React Native and SQLite. It covers the daily workflow of a small restaurant or café: menu and stock management, order taking, payments, invoices, thermal printing, customer records, and basic accounting.

All operational data is stored locally on the device. The app does not require an account, a server, or an internet connection.

**Current version:** 1.0.0
**Platform:** Android (API 23+)
**Status:** v1.0 development release

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screens](#screens)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Running the App](#running-the-app)
- [Building an APK](#building-an-apk)
- [First Run](#first-run)
- [Using the App](#using-the-app)
- [Printer Setup](#printer-setup)
- [Data and Database](#data-and-database)
- [Project Structure](#project-structure)
- [Available Commands](#available-commands)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Overview

Restaurant POS Mobile is a standalone mobile POS designed for fast, offline restaurant operations. It uses a local SQLite database and is packaged as a native Android app through React Native.

The feature set is inspired by the [Obydullah Restaurant POS Lite](https://wordpress.org/plugins/obydullah-restaurant-pos-lite/) WordPress plugin, but this application runs independently and does not sync with WordPress.

Key capabilities include:

- Product, category, stock, and customer management
- Dine-in, take-away, and pickup orders
- Cart, discounts, tax/VAT, cash/card/split payments
- Held orders and order history
- Invoice display after checkout
- Bluetooth and Wi-Fi thermal printer support
- Dashboard, sales summaries, and manual accounting entries

---

## Features

### Dashboard

- Today's sales total and order count
- Product and customer counts
- Low-stock and out-of-stock alerts
- Quick actions for new orders, orders list, products, and customers
- Recent orders for the current day

### Point of Sale

- Browse products by category
- Add products to a persistent cart
- Remove individual cart lines
- Clear the current cart
- Select an existing customer
- Dine-in orders with table number
- Take-away orders with postcode and delivery address
- Pickup orders with pickup time
- Fixed-amount discount
- Configurable tax and VAT percentages
- Cash, card, or split payment
- Validation that split payments add up to the total
- Hold/save an order for later
- Checkout and stock deduction
- Invoice modal immediately after checkout
- Print the invoice from the modal

### Orders

- Today's sales, all sales, completed sales, and saved-order filters
- Order details with line items and totals
- Load a held/saved order back into the POS cart
- Delete orders
- Saved orders are removed from the held list when loaded back into POS

### Inventory

Inventory is organized into three sub-tabs:

- **Products** — create, edit, activate/deactivate, and delete unused products
- **Stock** — create stock records, set buy/sale prices and opening quantity, and adjust stock up or down
- **Categories** — create, edit, and delete product categories

Stock status is updated automatically:

- `inStock` — quantity of 10 or more
- `lowStock` — quantity between 1 and 9
- `outStock` — quantity of 0 or less

Inactive products are hidden from the POS product list.

### Customers

- Create, edit, and delete customers
- Name and email are required
- Optional mobile number and address
- Select a customer during checkout

### Accounting

- Manual income and expense entries
- Income and expense categories
- Edit and delete manual entries
- Date filters: all time, today, last 7 days, this month, and custom range
- Automatic sales income from completed sales
- Cost of goods from cost snapshots captured at checkout
- Gross profit calculation, including gross profit per order in the entries list
- Manual ledger balance

### Settings

- **Shop Information** — restaurant name, address, phone, and email used on invoices
- **Currency** — BDT, USD, EUR, GBP, INR, PKR, LKR, JPY, CAD, and AUD
- **Tax & VAT** — default percentage rates for new orders
- **Printer Settings** — Bluetooth, Thermal, or Wi-Fi printer configuration

### Invoices and Printing

- Receipt-style invoice displayed after checkout
- Shop header, invoice number, order number, date, order type, customer, items, subtotal, discount, tax/VAT, grand total, and payment details
- Manual **Print Invoice** action
- 32-character ESC/POS receipt format
- Bluetooth/Thermal printing through `react-native-bluetooth-escpos-printer`
- Wi-Fi printing through `react-native-thermal-receipt-printer`

---

## Screens

The app uses an eight-tab bottom navigation layout:

| Tab | Purpose |
| --- | --- |
| Home | Dashboard, daily totals, alerts, and recent orders |
| POS | Product selection, cart, checkout, and invoice |
| Orders | Sales history, held orders, details, load, and delete |
| Accounting | Manual ledger, sales income, COGS, and profit |
| Inventory | Products, stock, and categories |
| Customers | Customer records |
| Settings | Shop, currency, tax/VAT, and printer configuration |
| About | App and developer information |

---

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | React Native 0.74.0 |
| UI runtime | React 18.2.0 |
| Language | TypeScript 5.3 |
| Navigation | React Navigation 6 (native stack + bottom tabs) |
| State management | Zustand 4 |
| Local database | `react-native-sqlite-storage` |
| UI components | React Native Paper, React Native Vector Icons |
| Date handling | `date-fns` 3 |
| Bluetooth printing | `react-native-bluetooth-escpos-printer` |
| Wi-Fi printing | `react-native-thermal-receipt-printer` |
| Android build | Gradle 8.6, AGP 8.2.1, Kotlin 1.9.22 |
| Android SDK | compileSdk/targetSdk 34, minSdk 23 |
| Java | JDK 17 |

---

## Requirements

Before running or building the project, install:

- **Node.js** 18 or newer (Node 20 LTS recommended)
- **npm** 9 or newer
- **JDK 17**
- **Android SDK** with:
  - Platform 34
  - Build Tools 34.0.0
  - NDK 26.1.10909125
  - Platform Tools (`adb`)
- An Android device running Android 6.0 (API 23) or newer, or an Android emulator
- A Bluetooth or Wi-Fi thermal printer (optional, for receipt printing)

A physical Android device is recommended for testing Bluetooth printing.

---

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm install
```

For a reproducible install from the lockfile:

```bash
npm ci
```

### 2. Configure the Android SDK

Set `ANDROID_HOME` and add the Android tools to `PATH`:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Alternatively, create or update `android/local.properties` with the absolute SDK path:

```properties
sdk.dir=/absolute/path/to/Android/Sdk
```

Do not commit machine-specific SDK paths.

### 3. Use JDK 17

The project is configured for Gradle 8.6 and Android Gradle Plugin 8.2.1. Use JDK 17:

```bash
export JAVA_HOME=/path/to/jdk-17
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

### 4. Verify the device connection

```bash
adb devices
```

The connected device should appear with the status `device`. Accept the USB debugging prompt on the device if it appears.

---

## Running the App

### Start Metro

In one terminal, from the project root:

```bash
npm start
```

To clear the Metro transform cache:

```bash
npx react-native start --reset-cache
```

### Install and launch on Android

In a second terminal:

```bash
npm run android
```

If more than one device or emulator is connected, specify the device:

```bash
npx react-native run-android --deviceId=<device-id>
```

For a USB-connected device, reverse the Metro port if the app cannot reach the development server:

```bash
adb reverse tcp:8081 tcp:8081
```

> The Android app is the supported target for this project. The `ios/` directory is the standard React Native scaffold and the iOS target has not been configured or tested for this POS app.

---

## Building an APK

### Debug APK

```bash
cd android
./gradlew assembleDebug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

```bash
cd android
./gradlew assembleRelease
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

To create a copy with a friendlier name:

```bash
cp app/build/outputs/apk/release/app-release.apk "../restaurant pos.apk"
```

Install it on a connected device:

```bash
adb install -r "../restaurant pos.apk"
```

### Release signing

The current `android/app/build.gradle` signs release builds with the Android debug keystore:

```gradle
release {
    signingConfig signingConfigs.debug
}
```

That is convenient for local testing, but it is **not suitable for Play Store distribution**. Before publishing:

1. Generate a production keystore.
2. Add a `release` signing config.
3. Keep keystore passwords and the keystore file out of version control.
4. Update `versionCode` and `versionName` for each release.

Package ID: `com.restaurantposmobile`
Android version: `versionCode 1`, `versionName "1.0"`

---

## First Run

On first launch, the app:

1. Creates the local SQLite database (`restaurant_pos.db`).
2. Applies the schema and lightweight migrations.
3. Seeds demo data if the `categories` table is empty.

The demo data includes six categories, 50 menu items, and two sample customers. It is only inserted when no categories exist, so restarting the app does not duplicate it.

The default currency is BDT. Open **Settings** to change the currency, add shop details, set tax/VAT defaults, and configure a printer.

To reset the app to a clean installation, clear the app data from Android settings:

```text
Settings → Apps → Restaurant POS → Storage → Clear data
```

Alternatively, uninstall and reinstall the app. Either action permanently removes local sales, stock, customer, and accounting data.

---

## Using the App

### Basic order flow

1. Open **Inventory → Products** and add a product.
2. Open **Inventory → Stock** and create a stock record with buy price, sale price, and opening quantity.
3. Open **POS**, choose a category, and tap products to add them to the cart.
4. Optionally select a customer and an order type:
   - **Dine-In** — enter a table number
   - **Take Away** — enter postcode and address
   - **Pickup** — enter a pickup time
5. Apply a fixed discount and adjust tax/VAT if needed.
6. Choose cash, card, or split payment.
7. Tap **Checkout**.
8. The invoice opens automatically after the completed sale. Tap **Print Invoice** to print it.

### Hold/save an order

Tap **Hold/Save** in the POS to save the current cart without taking payment. Saved orders appear under **Orders → Saved**. Use **Load** to put a saved order back into the POS cart, then modify it or check it out.

### Payment notes

- Cash and card payments use the full order total.
- Split payment requires the cash and card amounts to match the order total within one cent.
- Tax and VAT are calculated on the pre-discount subtotal.
- The discount is a fixed amount, not a percentage.

### Stock notes

- A completed checkout reduces stock for each sold item.
- Saving/holding an order does not reduce stock.
- Deleting a completed order does **not** restore stock. Use **Inventory → Stock** to correct stock manually if an order is deleted.

---

## Printer Setup

The app supports two printing paths.

### Bluetooth or Thermal printer

1. Pair the printer in Android's Bluetooth settings.
2. Open **Settings → Printer Settings**.
3. Choose **Bluetooth** or **Thermal**.
4. Enter the printer name or MAC address.
5. Save the settings.
6. Complete a checkout and tap **Print Invoice**.

Android 12 and newer prompt for **Nearby devices** permission (`BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`). Android 11 and older may request location permission because Android requires it for Bluetooth discovery.

### Wi-Fi printer

1. Connect the Android device and printer to the same network.
2. Open **Settings → Printer Settings**.
3. Choose **WiFi**.
4. Enter the printer IP address, for example `192.168.1.50` or `192.168.1.50:9100`.
5. Leave the port out to use the default ESC/POS port `9100`.
6. Complete a checkout and tap **Print Invoice**.

Receipts are formatted for 32-character thermal paper. Currency amounts on printed receipts use the currency code (for example, `GBP 12.50`) for better compatibility with thermal printers.

Printer compatibility varies by model. Test with the actual printer and paper width before deployment.

---

## Data and Database

All data is stored in a local SQLite database named `restaurant_pos.db` in the app's private storage. There is no cloud backup or remote synchronization in this version.

### Tables

| Table | Purpose |
| --- | --- |
| `categories` | Menu categories |
| `products` | Menu products and category assignments |
| `customers` | Customer contact records |
| `stocks` | Stock quantity, buy cost, sale price, and stock status |
| `stock_adjustments` | Increase/decrease stock adjustments |
| `sales` | Order header, payment, totals, and order status |
| `sale_details` | Line items, selling price, and unit-cost snapshot |
| `accounting` | Manual income and expense entries |
| `settings` | Key/value app settings |
| `cart` | Persistent POS cart |
| `sync_queue` | Reserved for future backend synchronization |

### Financial data

- `sales.net_price` stores the item subtotal before tax, VAT, and discount.
- `sales.tax_amount` and `sales.vat_amount` store calculated amounts.
- `sales.discount_amount` stores the fixed discount.
- `sales.grand_total` stores the final amount due.
- `sales.buy_price` stores the total cost of goods for the order.
- `sale_details.unit_cost` stores a cost snapshot at checkout so historical profit does not change when stock prices change.
- Accounting's automatic **Sales Income** uses `net_price` from completed sales.
- **Cost of Goods** uses `quantity × unit_cost` from sale details.
- **Gross Profit** is sales income minus cost of goods.
- Manual accounting entries are separate from the automatic sales summary.

### Migrations

Schema setup and lightweight migrations are applied automatically at startup in `src/core/database/db.ts`. Existing data is preserved when new columns are added.

---

## Project Structure

```text
restaurant-pos-mobile/
├── android/                     # Android native project and Gradle build
│   └── app/src/main/
│       ├── AndroidManifest.xml  # Permissions and app configuration
│       └── ...
├── ios/                         # React Native iOS scaffold (not configured)
├── assets/                      # Application assets
├── database/                    # Reference SQL files
├── src/
│   ├── components/
│   │   └── InvoiceModal.tsx     # Invoice display and print action
│   ├── core/
│   │   ├── constants/           # Colors and supported currencies
│   │   ├── database/
│   │   │   ├── db.ts            # Database initialization and migrations
│   │   │   ├── schema.ts        # SQLite schema
│   │   │   ├── seed.ts          # Demo menu and customer seed data
│   │   │   └── repositories/    # Data-access layer
│   │   └── utils/               # Formatting and helper functions
│   ├── features/
│   │   ├── about/               # About screen
│   │   ├── accounting/          # Income, expenses, and sales summary
│   │   ├── categories/          # Category management
│   │   ├── customers/           # Customer management
│   │   ├── dashboard/           # Home dashboard
│   │   ├── inventory/           # Products/Stock/Categories container
│   │   ├── orders/              # Sales and held orders
│   │   ├── pos/                 # POS and checkout flow
│   │   ├── products/            # Product management
│   │   ├── settings/            # App configuration
│   │   └── stock/               # Stock records and adjustments
│   ├── navigation/
│   │   └── AppNavigator.tsx     # Bottom tabs and navigation stack
│   ├── services/
│   │   └── PrinterService.ts    # Receipt formatting and printer integration
│   ├── store/                   # Zustand app store
│   └── types/                   # TypeScript types and module declarations
├── App.tsx                      # App bootstrap and database initialization
├── index.js                     # React Native entry point
├── package.json
└── tsconfig.json
```

---

## Available Commands

| Command | Description |
| --- | --- |
| `npm start` | Start the Metro development server |
| `npm run android` | Build and install the debug app on a connected Android device |
| `npm run ios` | iOS script from the React Native template; not configured for this app |
| `npx react-native start --reset-cache` | Start Metro with a clean cache |
| `npx tsc --noEmit` | TypeScript type check |
| `cd android && ./gradlew assembleDebug` | Build a debug APK |
| `cd android && ./gradlew assembleRelease` | Build a release APK |
| `cd android && ./gradlew clean` | Clean Android build outputs |

---

## Troubleshooting

### `SDK location not found`

Create `android/local.properties` and set the absolute Android SDK path:

```properties
sdk.dir=/absolute/path/to/Android/Sdk
```

### Gradle fails because Java is missing or the wrong version

Use JDK 17 and set `JAVA_HOME` before running Gradle:

```bash
export JAVA_HOME=/path/to/jdk-17
export PATH="$JAVA_HOME/bin:$PATH"
```

### App opens but cannot connect to Metro

Check the device connection and reverse the Metro port:

```bash
adb devices
adb reverse tcp:8081 tcp:8081
```

Then restart Metro with a clean cache:

```bash
npx react-native start --reset-cache
```

### Android build cache or manifest problems

```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

If the issue persists, remove only generated build output from the project root:

```bash
rm -rf android/app/build
```

### Bluetooth printer is not found

- Pair the printer in Android's system Bluetooth settings first.
- Make sure the printer is powered on and within range.
- Grant **Nearby devices** permission on Android 12+.
- Grant location permission on Android 11 and older.
- Enter the printer's MAC address instead of its display name if matching fails.
- Check that the printer supports ESC/POS commands.

### Wi-Fi printer does not print

- Confirm the phone and printer are on the same network.
- Verify the printer IP address from the printer's configuration page.
- Use `IP:port` if the printer does not use port `9100`.
- Check that the printer accepts raw ESC/POS data on that port.

### “No printer configured” error

Open **Settings → Printer Settings**, select the printer type, enter a valid Bluetooth name/MAC address or Wi-Fi IP address, and save before printing.

### Data needs to be reset

Clearing app data or uninstalling the app removes the local database permanently:

```bash
adb shell pm clear com.restaurantposmobile
```

Use this only when a full reset is intended.

---

## Known Limitations

- **Android only.** The iOS scaffold is not configured or tested.
- **Local-only data.** There is no backend, account system, multi-device sync, or cloud backup.
- **No authentication or user roles.** Anyone with access to the device can use the app.
- **No reprint from order history.** The invoice and print button appear immediately after checkout; saved/completed orders do not currently expose a reprint action.
- **Deleting an order does not restore stock.**
- **Limited reporting.** Dashboard and accounting summaries are basic; there are no charts, exports, or advanced reports.
- **No barcode scanning, kitchen display, email receipts, dark mode, or loyalty features.**
- **Printer support depends on hardware.** Bluetooth/Wi-Fi ESC/POS compatibility must be verified with the target printer.
- **Release APK is debug-signed.** Replace the signing configuration before production distribution.
- **TypeScript declaration warnings.** `npx tsc --noEmit` may report missing type declarations for `react-native-sqlite-storage` and `react-native-vector-icons`. These are third-party declaration issues and do not block the Android build.
- **Minimal automated testing.** The repository contains only the default React Native smoke test for `App`. Test checkout, stock, printing, and accounting flows manually on the target device.

---

## Contributing

1. Create a feature branch.
2. Keep changes focused and consistent with the existing feature/repository structure.
3. Run TypeScript and build checks before submitting changes.
4. Test the affected flow on Android, including checkout and stock behavior where relevant.
5. Document any new database columns, migrations, permissions, or printer requirements.

For database changes, update `src/core/database/schema.ts` and add a safe migration in `src/core/database/db.ts` so existing installations are not broken.

---

## License

No license file is currently included in this repository. Contact the project owner before redistributing or publishing the application.

---

## Acknowledgements

- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage)
- [react-native-bluetooth-escpos-printer](https://github.com/brandon73/react-native-bluetooth-escpos-printer)
- [react-native-thermal-receipt-printer](https://github.com/thiendangit/react-native-thermal-receipt-printer)
- [Obydullah Restaurant POS Lite](https://wordpress.org/plugins/obydullah-restaurant-pos-lite/) for the original feature inspiration

Developer: Shaik Obydullah · [obydullah.com](https://obydullah.com)
