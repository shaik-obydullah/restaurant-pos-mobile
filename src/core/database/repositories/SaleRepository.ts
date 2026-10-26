import {getDBConnection} from '../db';
import {Sale, SaleDetail} from '../../../types';

export class SaleRepository {
  static async getAll(): Promise<Sale[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM sales ORDER BY created_at DESC');
    const sales: Sale[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      sales.push(results.rows.item(i));
    }
    return sales;
  }

  static async getById(id: number): Promise<Sale | null> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM sales WHERE id = ?', [id]);
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    return null;
  }

  static async create(sale: Omit<Sale, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      `INSERT INTO sales (
        server_id, uuid, customer_id, invoice_id, net_price, vat_amount, tax_amount,
        shipping_cost, discount_amount, grand_total, paid_amount, buy_price,
        sale_type, table_number, postcode, address, pickup_time, cooking_instructions, status,
        payment_method, cash_amount, card_amount, note, synced, sync_attempts,
        last_sync_error, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [
        sale.server_id || null,
        sale.uuid,
        sale.customer_id || null,
        sale.invoice_id || null,
        sale.net_price,
        sale.vat_amount,
        sale.tax_amount,
        sale.shipping_cost,
        sale.discount_amount,
        sale.grand_total,
        sale.paid_amount || null,
        sale.buy_price,
        sale.sale_type,
        sale.table_number || null,
        sale.postcode || null,
        sale.address || null,
        sale.pickup_time || null,
        sale.cooking_instructions || null,
        sale.status,
        sale.payment_method,
        sale.cash_amount ?? null,
        sale.card_amount ?? null,
        sale.note || null,
        sale.synced,
        sale.sync_attempts,
        sale.last_sync_error || null,
      ],
    );
    return result.insertId;
  }

  static async update(id: number, sale: Partial<Sale>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE sales SET updated_at = datetime("now") WHERE id = ?',
      [id],
    );
  }

  static async delete(id: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM sales WHERE id = ?', [id]);
  }

  static async getTodaySales(): Promise<Sale[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      "SELECT * FROM sales WHERE date(created_at) = date('now') ORDER BY created_at DESC",
    );
    const sales: Sale[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      sales.push(results.rows.item(i));
    }
    return sales;
  }
}
