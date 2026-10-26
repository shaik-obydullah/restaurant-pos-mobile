import {getDBConnection} from '../db';
import {StockAdjustment} from '../../../types';

export class StockAdjustmentRepository {
  static async getByStockId(stockId: number): Promise<StockAdjustment[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT * FROM stock_adjustments WHERE stock_id = ? ORDER BY created_at DESC',
      [stockId],
    );
    const adjustments: StockAdjustment[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      adjustments.push(results.rows.item(i));
    }
    return adjustments;
  }

  static async create(
    adjustment: Omit<StockAdjustment, 'id' | 'created_at'>,
  ): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO stock_adjustments (stock_id, adjustment_type, quantity, note, sync_status) VALUES (?, ?, ?, ?, ?)',
      [
        adjustment.stock_id,
        adjustment.adjustment_type,
        adjustment.quantity,
        adjustment.note || null,
        adjustment.sync_status,
      ],
    );
    return result.insertId;
  }
}
