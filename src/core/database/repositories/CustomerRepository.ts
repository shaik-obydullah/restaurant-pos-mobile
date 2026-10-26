import {getDBConnection} from '../db';
import {Customer} from '../../../types';

export class CustomerRepository {
  static async getAll(): Promise<Customer[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql('SELECT * FROM customers ORDER BY name ASC');
    const customers: Customer[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      customers.push(results.rows.item(i));
    }
    return customers;
  }

  static async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<number> {
    const db = await getDBConnection();
    const [result] = await db.executeSql(
      'INSERT INTO customers (name, email, mobile, address, status, sync_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [customer.name, customer.email, customer.mobile || null, customer.address || null, customer.status, customer.sync_status],
    );
    return result.insertId;
  }

  static async update(id: number, customer: Partial<Customer>): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      'UPDATE customers SET name = ?, email = ?, mobile = ?, address = ?, status = ?, sync_status = ?, updated_at = datetime("now") WHERE id = ?',
      [customer.name, customer.email, customer.mobile || null, customer.address || null, customer.status, customer.sync_status, id],
    );
  }

  static async delete(id: number): Promise<void> {
    const db = await getDBConnection();
    // Keep historical sales valid if foreign keys are not enforced.
    await db.executeSql('UPDATE sales SET customer_id = NULL WHERE customer_id = ?', [id]);
    await db.executeSql('DELETE FROM customers WHERE id = ?', [id]);
  }
}
