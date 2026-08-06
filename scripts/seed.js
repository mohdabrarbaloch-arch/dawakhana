'use strict';

/* Seed the database with demo data. Usage: npm run seed */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { db, transaction } = require('../src/db');

const demo = {
  users: [
    { name: 'Abrar Baloch', email: 'owner@dawakhana.pk', password: 'admin12345', role: 'owner' },
    { name: 'Salim (Staff)', email: 'staff@dawakhana.pk', password: 'staff12345', role: 'staff' },
  ],
  products: [
    { name: 'Panadol 500mg (10 tabs)', category: 'Medicine', price_pkr: 40, cost_pkr: 30, stock_qty: 120, min_stock: 20, expiry_date: '2027-05-01' },
    { name: 'Disprin 300mg', category: 'Medicine', price_pkr: 25, cost_pkr: 18, stock_qty: 80, min_stock: 15, expiry_date: '2027-02-15' },
    { name: 'Vitamin D3 2000IU', category: 'Supplement', price_pkr: 350, cost_pkr: 280, stock_qty: 45, min_stock: 10, expiry_date: '2027-08-30' },
    { name: 'Calpol 250mg (60ml)', category: 'Medicine', price_pkr: 95, cost_pkr: 75, stock_qty: 6, min_stock: 10, expiry_date: '2026-09-12' },
    { name: 'Zinc Sulfate Syrup 100ml', category: 'Supplement', price_pkr: 120, cost_pkr: 95, stock_qty: 30, min_stock: 8, expiry_date: '2026-10-01' },
    { name: 'Bandage Roll', category: 'Medical Supply', price_pkr: 60, cost_pkr: 40, stock_qty: 2, min_stock: 5, expiry_date: null },
    { name: 'ORS Sachet', category: 'Medicine', price_pkr: 15, cost_pkr: 10, stock_qty: 200, min_stock: 50, expiry_date: '2027-01-10' },
    { name: 'Cough Syrup (100ml)', category: 'Medicine', price_pkr: 140, cost_pkr: 110, stock_qty: 25, min_stock: 6, expiry_date: '2026-08-20' },
  ],
  customers: [
    { name: 'Ahmed Raza', phone: '0300-1234567', address: 'Gulshan-e-Iqbal, Karachi' },
    { name: 'Fatima Noor', phone: '0312-7654321', address: 'Clifton, Karachi' },
    { name: 'Usman Sheikh', phone: '0333-1122334', address: 'Bahadurabad, Karachi' },
  ],
};

function todayPlus(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function seed() {
  transaction(() => {
    // users
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    for (const u of demo.users) {
      const hash = bcrypt.hashSync(u.password, 10);
      insertUser.run(u.name, u.email, hash, u.role);
    }

    // products (with a couple of near-expiry + one expired to demo alerts)
    const insertProduct = db.prepare(
      `INSERT INTO products (name, category, price_pkr, cost_pkr, stock_qty, min_stock, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const expiries = [
      todayPlus(365), // Panadol
      todayPlus(190), // Disprin
      todayPlus(388), // Vitamin D3
      todayPlus(36), // Calpol — expiring soon
      todayPlus(55), // Zinc syrup
      null, // Bandage
      todayPlus(155), // ORS
      todayPlus(13), // Cough syrup — expiring very soon
    ];
    demo.products.forEach((p, i) =>
      insertProduct.run(p.name, p.category, p.price_pkr, p.cost_pkr, p.stock_qty, p.min_stock, expiries[i])
    );

    // customers
    const insertCustomer = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)');
    const customerIds = demo.customers.map((c) => insertCustomer.run(c.name, c.phone, c.address).lastInsertRowid);

    // a couple of sales for the daily report
    const panadol = db.prepare('SELECT id, price_pkr FROM products WHERE name LIKE ?').get('Panadol%');
    const d3 = db.prepare('SELECT id, price_pkr FROM products WHERE name LIKE ?').get('Vitamin D3%');
    const ors = db.prepare('SELECT id, price_pkr FROM products WHERE name LIKE ?').get('ORS%');

    const mkSale = (customerId, items, method, paid, daysAgo) => {
      const created = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
      let total = 0;
      const lines = items.map(([p, qty]) => {
        total += p.price_pkr * qty;
        return [p, qty, p.price_pkr, p.price_pkr * qty];
      });
      const info = db
        .prepare(
          `INSERT INTO sales (customer_id, total, paid, method, created_at) VALUES (?, ?, ?, ?, ?)`
        )
        .run(customerId, total, paid, method, created);
      const insertItem = db.prepare(
        'INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total) VALUES (?, ?, ?, ?, ?)'
      );
      for (const [p, qty, price, line] of lines) {
        insertItem.run(info.lastInsertRowid, p.id, qty, price, line);
        db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(qty, p.id);
      }
      if (method === 'credit') {
        db.prepare(
          "INSERT INTO ledger (customer_id, amount, kind, note) VALUES (?, ?, 'sale', 'Credit sale')"
        ).run(customerId, total);
      }
    };

    mkSale(customerIds[0], [[panadol, 2], [ors, 5]], 'cash', 205, 0);
    mkSale(customerIds[1], [[d3, 1], [panadol, 1]], 'credit', 0, 0);
    mkSale(customerIds[2], [[ors, 10], [panadol, 3]], 'cash', 445, 1);
  });

  console.log('\n✅ Seed complete!');
  console.log('   Owner : owner@dawakhana.pk / admin12345');
  console.log('   Staff : staff@dawakhana.pk / staff12345\n');
}

seed();
