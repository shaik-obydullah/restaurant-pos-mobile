import {getDBConnection} from '../db';
import {CartItem} from '../../../types';

export class CartRepository {
  static async getBySession(sessionId: string): Promise<CartItem[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT * FROM cart WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
    );
    const items: CartItem[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(results.rows.item(i));
    }
    return items;
  }

  static async addItem(item: Omit<CartItem, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      `INSERT INTO cart (session_id, product_id, stock_id, quantity, unit_price, base_price, extras, removed_ingredients, cooking_instructions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [
        item.session_id,
        item.product_id,
        item.stock_id,
        item.quantity,
        item.unit_price,
        item.base_price ?? item.unit_price,
        item.extras || null,
        item.removed_ingredients || null,
        item.cooking_instructions || null,
      ],
    );
    return result.insertId;
  }

  static async updateCookingInstructions(id: number, instructions: string | null): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE cart SET cooking_instructions = ?, updated_at = datetime("now") WHERE id = ?',
      [instructions || null, id],
    );
  }

  static async updateQuantity(id: number, quantity: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE cart SET quantity = ?, updated_at = datetime("now") WHERE id = ?',
      [quantity, id],
    );
  }

  static async removeItem(id: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM cart WHERE id = ?', [id]);
  }

  static async clearSession(sessionId: string): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM cart WHERE session_id = ?', [sessionId]);
  }
}
