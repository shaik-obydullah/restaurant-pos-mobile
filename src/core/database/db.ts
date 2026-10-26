import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

const database_name = 'restaurant_pos.db';
const database_version = '1.0';
const database_displayname = 'Restaurant POS Database';
const database_size = 200000;

export const getDBConnection = async () => {
  return SQLite.openDatabase(
    database_name,
    database_version,
    database_displayname,
    database_size,
  );
};

export const initDatabase = async () => {
  const db = await getDBConnection();
  const schema = require('./schema').default;
  const queries = schema.split(';').filter((q: string) => q.trim() !== '');
  
  for (const query of queries) {
    try {
      await db.executeSql(query);
    } catch (error) {
      console.error('Error executing query:', error);
    }
  }

  // Lightweight migrations for databases created before these columns existed.
  // ALTER TABLE fails with "duplicate column name" once applied, which is safe to ignore.
  const migrations = [
    'ALTER TABLE sales ADD COLUMN postcode TEXT DEFAULT NULL',
    'ALTER TABLE sales ADD COLUMN address TEXT DEFAULT NULL',
    'ALTER TABLE sales ADD COLUMN pickup_time TEXT DEFAULT NULL',
    'ALTER TABLE sales ADD COLUMN cash_amount REAL DEFAULT NULL',
    'ALTER TABLE sales ADD COLUMN card_amount REAL DEFAULT NULL',
    'ALTER TABLE accounting ADD COLUMN category TEXT DEFAULT NULL',
  ];
  for (const migration of migrations) {
    try {
      await db.executeSql(migration);
    } catch (error) {
      // Column already exists — ignore.
    }
  }

  // Add the cost snapshot to sale details once, and backfill old rows from
  // the current stock buy price. New sales snapshot the cost at checkout.
  const [detailColumns] = await db.executeSql('PRAGMA table_info(sale_details)');
  let hasUnitCost = false;
  for (let i = 0; i < detailColumns.rows.length; i++) {
    if (detailColumns.rows.item(i).name === 'unit_cost') {
      hasUnitCost = true;
      break;
    }
  }
  if (!hasUnitCost) {
    try {
      await db.executeSql(
        'ALTER TABLE sale_details ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0',
      );
      await db.executeSql(
        'UPDATE sale_details SET unit_cost = COALESCE((SELECT net_cost FROM stocks WHERE stocks.id = sale_details.stock_id), 0)',
      );
      await db.executeSql(
        'UPDATE sales SET buy_price = COALESCE((SELECT SUM(sd.quantity * sd.unit_cost) FROM sale_details sd WHERE sd.sale_id = sales.id), 0) WHERE buy_price = 0',
      );
    } catch (error) {
      console.error('sale_details.unit_cost migration failed:', error);
    }
  }
  
  return db;
};
