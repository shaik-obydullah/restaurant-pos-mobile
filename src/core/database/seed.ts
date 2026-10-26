import {CategoryRepository} from './repositories/CategoryRepository';
import {ProductRepository} from './repositories/ProductRepository';
import {CustomerRepository} from './repositories/CustomerRepository';
import {StockRepository} from './repositories/StockRepository';

export const seedDemoData = async () => {
  try {
    const categories = await CategoryRepository.getAll();
    if (categories.length > 0) {
      console.log('Demo data already exists, skipping seed');
      return;
    }

    // Create categories
    const chipsCat = await CategoryRepository.create({
      name: 'Chips',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    const milkshakesCat = await CategoryRepository.create({
      name: 'Milkshakes',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    const drinksCat = await CategoryRepository.create({
      name: 'Soft Drinks',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    const dessertsCat = await CategoryRepository.create({
      name: 'Desserts',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    const munchBoxCat = await CategoryRepository.create({
      name: 'Munch Box Special',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    const chickenFeastCat = await CategoryRepository.create({
      name: 'Chicken Feast Box',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    // Chips
    const addProduct = async (name: string, categoryId: number, price: number) => {
      const productId = await ProductRepository.create({
        name,
        category_id: categoryId,
        status: 'active',
        sync_status: 'synced',
        created_at: '',
        updated_at: undefined,
      } as any);
      await StockRepository.create({
        product_id: productId,
        net_cost: price * 0.6,
        sale_cost: price,
        quantity: 100,
        status: 'inStock',
        sync_status: 'synced',
        created_at: '',
        updated_at: undefined,
      } as any);
    };

    await addProduct('Chips', chipsCat, 2.8);
    await addProduct('Chips & Cheese', chipsCat, 4.5);
    await addProduct('Peri Peri Chips', chipsCat, 3.99);
    await addProduct('Spicy Chips', chipsCat, 3.99);
    await addProduct('Garlic Chips', chipsCat, 3.99);
    await addProduct('Loaded Chips (with Chicken & Cheese)', chipsCat, 4.99);
    await addProduct('Spicy Loaded Chips (with Jalapeno, Red Onion & Cheese)', chipsCat, 4.99);
    await addProduct('Loaded Chips with Turkey Bacon', chipsCat, 4.99);
    await addProduct('Loaded Chips with Pepperoni', chipsCat, 4.99);
    await addProduct('Loaded Chips with Burger (Sliced Burger chips & Cheese)', chipsCat, 5.99);
    await addProduct('Add Grated Cheese', chipsCat, 1.8);

    // Milkshakes
    await addProduct('Strawberry Milkshake', milkshakesCat, 4.99);
    await addProduct('Banana Milkshake', milkshakesCat, 4.99);
    await addProduct('Snickers Milkshake', milkshakesCat, 4.99);
    await addProduct('Mango Milkshake', milkshakesCat, 4.99);
    await addProduct('Oreo Milkshake', milkshakesCat, 4.99);
    await addProduct('Add Whipped Cream', milkshakesCat, 0.99);

    // Soft Drinks
    await addProduct('Coca Cola Can', drinksCat, 1.4);
    await addProduct('Diet Pepsi Can', drinksCat, 1.4);
    await addProduct('Pepsi Max Can', drinksCat, 1.4);
    await addProduct('Pepsi Can', drinksCat, 1.4);
    await addProduct('7 Up Can', drinksCat, 1.4);
    await addProduct('Dr Pepper Can', drinksCat, 1.4);
    await addProduct('Orange Tango Can', drinksCat, 1.4);
    await addProduct('Cherry Coke Can', drinksCat, 1.4);
    await addProduct('Cherry Pepsi Max Can', drinksCat, 1.4);
    await addProduct('Monster Energy Drink (Original)', drinksCat, 2.99);
    await addProduct('Monster Energy Drink (Mango Loco)', drinksCat, 2.99);
    await addProduct('Monster Energy Drink (Pipeline Punch)', drinksCat, 2.99);
    await addProduct('Monster Energy Drink (Ultra)', drinksCat, 2.99);
    await addProduct('Water', drinksCat, 1.4);
    await addProduct('Pepsi Bottle 1.5Ltr', drinksCat, 3.5);
    await addProduct('Diet Pepsi Bottle 1.5Ltr', drinksCat, 3.5);
    await addProduct('Pepsi Max Bottle 1.5Ltr', drinksCat, 3.5);
    await addProduct('7up Bottle 1.5Ltr', drinksCat, 3.5);
    await addProduct('Orange Tango Bottle 1.5Ltr', drinksCat, 3.5);

    // Desserts
    await addProduct('Chocolate Fudge Cake', dessertsCat, 3.2);
    await addProduct('Cookies (4 pcs)', dessertsCat, 4.5);
    await addProduct('Strawberry Cheesecake', dessertsCat, 3.2);
    await addProduct("Ben & Jerry's Ice Cream (Chocolate Fudge Brownie)", dessertsCat, 6.99);
    await addProduct("Ben & Jerry's Ice Cream (Cookie Dough)", dessertsCat, 6.99);
    await addProduct("Ben & Jerry's Ice Cream (Phish Food)", dessertsCat, 6.99);
    await addProduct("Ben & Jerry's Ice Cream (Caramel)", dessertsCat, 6.99);

    // Munch Box Special
    await addProduct('Munch Box 1', munchBoxCat, 9.9);
    await addProduct('Munch Box 2', munchBoxCat, 14.99);
    await addProduct('Munch Box 3', munchBoxCat, 15.99);
    await addProduct('Munch Box 4', munchBoxCat, 17.0);
    await addProduct('Munch Box 5', munchBoxCat, 23.99);
    await addProduct('Munch Box 6', munchBoxCat, 20.0);

    // Chicken Feast Box
    await addProduct('Chicken Feast Box', chickenFeastCat, 34.99);

    // Create customers
    await CustomerRepository.create({
      name: 'John Doe',
      email: 'john@example.com',
      mobile: '01712345678',
      address: 'Dhaka',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    await CustomerRepository.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      mobile: '01812345678',
      address: 'Chittagong',
      status: 'active',
      sync_status: 'synced',
      created_at: '',
      updated_at: undefined,
    } as any);

    console.log('Menu data seeded successfully');
  } catch (error) {
    console.error('Error seeding menu data:', error);
  }
};
