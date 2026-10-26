import {getDBConnection} from '../db';

export interface Setting {
  id: number;
  key: string;
  value: string | null;
  updated_at?: string;
}

export class SettingsRepository {
  static async get(key: string): Promise<string | null> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT value FROM settings WHERE key = ?', [key]);
    if (results.rows.length > 0) {
      const item = results.rows.item(0);
      return item.value;
    }
    return null;
  }

  static async set(key: string, value: string): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
      [key, value],
    );
  }

  static async getAll(): Promise<Setting[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM settings');
    const settings: Setting[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      settings.push(results.rows.item(i));
    }
    return settings;
  }

  static async delete(key: string): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM settings WHERE key = ?', [key]);
  }
}
