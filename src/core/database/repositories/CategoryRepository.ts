import {getDBConnection} from '../db';
import {Category} from '../../../types';

export class CategoryRepository {
  static async getAll(): Promise<Category[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM categories ORDER BY name ASC');
    const categories: Category[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      categories.push(results.rows.item(i));
    }
    return categories;
  }

  static async getById(id: number): Promise<Category | null> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM categories WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  static async create(category: Omit<Category, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO categories (name, status, sync_status, updated_at) VALUES (?, ?, ?, datetime("now"))',
      [category.name, category.status, category.sync_status],
    );
    return result.insertId;
  }

  static async update(id: number, category: Partial<Category>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE categories SET name = ?, status = ?, sync_status = ?, updated_at = datetime("now") WHERE id = ?',
      [category.name, category.status, category.sync_status, id],
    );
  }

  static async delete(id: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM categories WHERE id = ?', [id]);
  }
}
