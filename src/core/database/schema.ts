export default `
-- Obydullah Restaurant POS Lite - SQLite Schema
-- Mobile App Local Database Schema

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    name TEXT NOT NULL UNIQUE,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    name TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL,
    image TEXT DEFAULT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT DEFAULT NULL,
    address TEXT DEFAULT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL
);

-- Stocks Table
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    product_id INTEGER NOT NULL,
    net_cost REAL NOT NULL DEFAULT 0.00,
    sale_cost REAL NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT CHECK(status IN ('inStock', 'outStock', 'lowStock')) DEFAULT 'inStock',
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Stock Adjustments Table
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    stock_id INTEGER NOT NULL,
    adjustment_type TEXT CHECK(adjustment_type IN ('increase', 'decrease')) NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT DEFAULT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE RESTRICT
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    uuid TEXT UNIQUE NOT NULL,
    customer_id INTEGER DEFAULT NULL,
    invoice_id TEXT DEFAULT NULL,
    net_price REAL NOT NULL DEFAULT 0.00,
    vat_amount REAL NOT NULL DEFAULT 0.00,
    tax_amount REAL NOT NULL DEFAULT 0.00,
    shipping_cost REAL NOT NULL DEFAULT 0.00,
    discount_amount REAL NOT NULL DEFAULT 0.00,
    grand_total REAL NOT NULL DEFAULT 0.00,
    paid_amount REAL DEFAULT NULL,
    buy_price REAL NOT NULL DEFAULT 0.00,
    sale_type TEXT CHECK(sale_type IN ('dineIn', 'takeAway', 'pickUp')) DEFAULT 'dineIn',
    table_number TEXT DEFAULT NULL,
    cooking_instructions TEXT DEFAULT NULL,
    status TEXT CHECK(status IN ('saveSale', 'completed', 'canceled')) DEFAULT 'completed',
    payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'split')) DEFAULT 'cash',
    note TEXT DEFAULT NULL,
    synced INTEGER DEFAULT 0,
    sync_attempts INTEGER DEFAULT 0,
    last_sync_error TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Sale Details Table
CREATE TABLE IF NOT EXISTS sale_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0.00,
    total_price REAL NOT NULL DEFAULT 0.00,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE RESTRICT
);

-- Accounting Table
CREATE TABLE IF NOT EXISTS accounting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER UNIQUE,
    in_amount REAL DEFAULT NULL,
    out_amount REAL DEFAULT NULL,
    description TEXT DEFAULT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT CHECK(entity_type IN ('category', 'product', 'customer', 'stock', 'stock_adjustment', 'sale', 'sale_detail', 'accounting')) NOT NULL,
    entity_id INTEGER NOT NULL,
    operation TEXT CHECK(operation IN ('create', 'update', 'delete')) NOT NULL,
    payload TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    last_attempt_at DATETIME DEFAULT NULL
);

-- Cart Table
CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    cooking_instructions TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_stocks_product ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_uuid ON sales(uuid);
CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);
CREATE INDEX IF NOT EXISTS idx_sale_details_sale ON sale_details(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_stock ON stock_adjustments(stock_id);
`;
