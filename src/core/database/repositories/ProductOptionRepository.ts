import {getDBConnection} from '../db';
import {ProductOption} from '../../../types';

export interface ProductOptionInput {
  name: string;
  price: number;
}

export class ProductOptionRepository {
  static async getByProduct(productId: number): Promise<ProductOption[]> {
    const db = await getDBConnection();
    const [results] = await db.executeSql(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [productId],
    );
    const options: ProductOption[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      options.push(results.rows.item(i));
    }
    return options;
  }

  static async replaceForProduct(
    productId: number,
    options: ProductOptionInput[],
  ): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM product_options WHERE product_id = ?', [productId]);
    for (let i = 0; i < options.length; i++) {
      await db.executeSql(
        'INSERT INTO product_options (product_id, name, price, sort_order, updated_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [productId, options[i].name, options[i].price, i],
      );
    }
  }

  static async deleteByProduct(productId: number): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('DELETE FROM product_options WHERE product_id = ?', [productId]);
  }
}
