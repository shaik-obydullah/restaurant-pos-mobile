import {getDBConnection} from '../db';
import {SaleDetail} from '../../../types';

export class SaleDetailRepository {
  static async getBySaleId(saleId: number): Promise<SaleDetail[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT * FROM sale_details WHERE sale_id = ?',
      [saleId],
    );
    const details: SaleDetail[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      details.push(results.rows.item(i));
    }
    return details;
  }

  static async create(detail: Omit<SaleDetail, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      `INSERT INTO sale_details (
        server_id, sale_id, product_id, stock_id, product_name,
        quantity, unit_price, total_price, unit_cost, base_price, extras,
        removed_ingredients, cooking_instructions, sync_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [
        detail.server_id || null,
        detail.sale_id,
        detail.product_id,
        detail.stock_id,
        detail.product_name,
        detail.quantity,
        detail.unit_price,
        detail.total_price,
        detail.unit_cost,
        detail.base_price ?? detail.unit_price,
        detail.extras || null,
        detail.removed_ingredients || null,
        detail.cooking_instructions || null,
        detail.sync_status,
      ],
    );
    return result.insertId;
  }

  static async deleteBySaleId(saleId: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM sale_details WHERE sale_id = ?', [saleId]);
  }
}
