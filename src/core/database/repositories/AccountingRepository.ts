import {getDBConnection} from '../db';

export interface Accounting {
  id: number;
  server_id?: number;
  in_amount?: number;
  out_amount?: number;
  description?: string;
  category?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
}

export interface SalesSummary {
  salesIncome: number;
  costOfGoods: number;
}

export interface SalesEntry {
  id: number;
  created_at: string;
  net_price: number;
  grand_total: number;
  vat_amount: number;
  tax_amount: number;
  discount_amount: number;
  sale_type: string;
  payment_method: string;
  item_count: number;
  item_quantity: number;
}

export class AccountingRepository {
  static async getAll(): Promise<Accounting[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM accounting ORDER BY created_at DESC');
    const items: Accounting[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(results.rows.item(i));
    }
    return items;
  }

  static async create(entry: Omit<Accounting, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO accounting (server_id, in_amount, out_amount, description, category, sync_status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        entry.server_id || null,
        entry.in_amount || null,
        entry.out_amount || null,
        entry.description || null,
        entry.category || null,
        entry.sync_status,
      ],
    );
    return result.insertId;
  }

  static async update(id: number, entry: Partial<Accounting>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE accounting SET in_amount = ?, out_amount = ?, description = ?, category = ?, sync_status = ? WHERE id = ?',
      [
        entry.in_amount ?? null,
        entry.out_amount ?? null,
        entry.description ?? null,
        entry.category ?? null,
        entry.sync_status ?? 'pending',
        id,
      ],
    );
  }

  static async delete(id: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM accounting WHERE id = ?', [id]);
  }

  static async getSalesEntries(from?: string, to?: string): Promise<SalesEntry[]> {
    const db = await getDBConnection();
    const conditions = ["s.status = 'completed'"];
    const params: string[] = [];

    if (from) {
      conditions.push('date(s.created_at) >= date(?)');
      params.push(from);
    }
    if (to) {
      conditions.push('date(s.created_at) <= date(?)');
      params.push(to);
    }

    const [results] = await db.executeSql(
      `SELECT
         s.id,
         s.created_at,
         s.net_price,
         s.grand_total,
         s.vat_amount,
         s.tax_amount,
         s.discount_amount,
         s.sale_type,
         s.payment_method,
         (SELECT COUNT(*) FROM sale_details sd WHERE sd.sale_id = s.id) AS item_count,
         (SELECT COALESCE(SUM(sd.quantity), 0) FROM sale_details sd WHERE sd.sale_id = s.id) AS item_quantity
       FROM sales s
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.created_at DESC`,
      params,
    );

    const entries: SalesEntry[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      entries.push(results.rows.item(i));
    }
    return entries;
  }

  static async getSalesSummary(from?: string, to?: string): Promise<SalesSummary> {
    const db = await getDBConnection();
    const conditions = ["s.status = 'completed'"];
    const params: string[] = [];

    if (from) {
      conditions.push('date(s.created_at) >= date(?)');
      params.push(from);
    }
    if (to) {
      conditions.push('date(s.created_at) <= date(?)');
      params.push(to);
    }

    const where = conditions.join(' AND ');

    const [incomeResult] = await db.executeSql(
      `SELECT COALESCE(SUM(s.net_price), 0) AS total FROM sales s WHERE ${where}`,
      params,
    );
    const [costResult] = await db.executeSql(
      `SELECT COALESCE(SUM(sd.quantity * sd.unit_cost), 0) AS total
       FROM sale_details sd
       JOIN sales s ON s.id = sd.sale_id
       WHERE ${where}`,
      params,
    );

    return {
      salesIncome: Number(incomeResult.rows.item(0).total) || 0,
      costOfGoods: Number(costResult.rows.item(0).total) || 0,
    };
  }
}
