import {getDBConnection} from '../db';
import {Product} from '../../../types';

export class ProductRepository {
  static async getAll(): Promise<Product[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM products ORDER BY name ASC');
    const products: Product[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }
    return products;
  }

  static async getByCategory(categoryId: number): Promise<Product[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM products WHERE category_id = ? AND status = "active" ORDER BY name ASC', [categoryId]);
    const products: Product[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }
    return products;
  }

  static async create(product: Omit<Product, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO products (name, category_id, image, ingredients, status, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [product.name, product.category_id, product.image || null, product.ingredients || null, product.status, product.sync_status],
    );
    return result.insertId;
  }

  static async update(id: number, product: Partial<Product>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE products SET name = ?, category_id = ?, image = ?, ingredients = ?, status = ?, sync_status = ?, updated_at = datetime("now") WHERE id = ?',
      [product.name, product.category_id, product.image, product.ingredients || null, product.status, product.sync_status, id],
    );
  }

  static async getSaleDetailsCount(id: number): Promise<number> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT COUNT(*) AS count FROM sale_details WHERE product_id = ?',
      [id],
    );
    return results.rows.item(0).count;
  }

  static async delete(id: number): Promise<void> {
    const db = await getDBConnection();
    // Remove rows that depend on this product's stock, then the product itself.
    // Past sale_details are kept because they store product_name for history.
    await db.executeSql('DELETE FROM cart WHERE product_id = ?', [id]);
    await db.executeSql('DELETE FROM product_options WHERE product_id = ?', [id]);
    await db.executeSql(
      'DELETE FROM stock_adjustments WHERE stock_id IN (SELECT id FROM stocks WHERE product_id = ?)',
      [id],
    );
    await db.executeSql('DELETE FROM stocks WHERE product_id = ?', [id]);
    await db.executeSql('DELETE FROM products WHERE id = ?', [id]);
  }
}
