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
  
  return db;
};
