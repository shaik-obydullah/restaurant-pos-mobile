import {getDBConnection} from '../db';
import {Stock} from '../../../types';

export class StockRepository {
  static async getAll(): Promise<Stock[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM stocks');
    const stocks: Stock[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      stocks.push(results.rows.item(i));
    }
    return stocks;
  }

  static async getByProductId(productId: number): Promise<Stock | null> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM stocks WHERE product_id = ?', [productId]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  static async getAllByProductId(productId: number): Promise<Stock[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT * FROM stocks WHERE product_id = ? ORDER BY id ASC',
      [productId],
    );
    const stocks: Stock[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      stocks.push(results.rows.item(i));
    }
    return stocks;
  }

  static async getById(id: number): Promise<Stock | null> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM stocks WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  static async create(stock: Omit<Stock, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO stocks (product_id, net_cost, sale_cost, quantity, status, is_active, cooking_instructions, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [stock.product_id, stock.net_cost, stock.sale_cost, stock.quantity, stock.status, stock.is_active ?? 1, stock.cooking_instructions || null, stock.sync_status],
    );
    return result.insertId;
  }

  static async update(id: number, stock: Partial<Stock>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE stocks SET net_cost = ?, sale_cost = ?, quantity = ?, status = ?, is_active = ?, cooking_instructions = ?, sync_status = ?, updated_at = datetime("now") WHERE id = ?',
      [stock.net_cost, stock.sale_cost, stock.quantity, stock.status, stock.is_active ?? 1, stock.cooking_instructions || null, stock.sync_status, id],
    );
  }

  static async setActive(id: number, active: boolean): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE stocks SET is_active = ?, updated_at = datetime("now") WHERE id = ?',
      [active ? 1 : 0, id],
    );
  }

  static async updateCookingInstructions(id: number, instructions: string | null): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE stocks SET cooking_instructions = ?, updated_at = datetime("now") WHERE id = ?',
      [instructions || null, id],
    );
  }

  static async updateQuantity(id: number, quantity: number): Promise<void> {
    const db = await getDBConnection();
    let status = 'inStock';
    if (quantity <= 0) status = 'outStock';
    else if (quantity < 10) status = 'lowStock';
    await db.executeSql(
      'UPDATE stocks SET quantity = ?, status = ?, updated_at = datetime("now") WHERE id = ?',
      [quantity, status, id],
    );
  }
}
