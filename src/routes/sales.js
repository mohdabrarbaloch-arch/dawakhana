'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { db, transaction } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/error');

const router = Router();
router.use(requireAuth);

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().int().positive('Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item is required'),
  method: z.enum(['cash', 'credit']),
  customer_id: z.number().int().positive().nullable().optional(),
  paid: z.number().nonnegative().optional(),
});

// POST /api/sales — create a sale (atomic: stock decrement + ledger if credit)
router.post('/', (req, res, next) => {
  try {
    const data = saleSchema.parse(req.body);
    if (data.method === 'credit' && !data.customer_id) {
      throw new AppError(400, 'A customer is required for credit sales');
    }
    if (data.customer_id) {
      const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(data.customer_id);
      if (!customer) throw new AppError(404, 'Customer not found');
    }

    const saleId = transaction(() => {
      let total = 0;
      const lineItems = data.items.map((item) => {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!product) throw new AppError(404, `Product ${item.product_id} not found`);
        if (product.stock_qty < item.qty) {
          throw new AppError(
            409,
            `Insufficient stock for "${product.name}" (${product.stock_qty} left)`
          );
        }
        const lineTotal = Number((product.price_pkr * item.qty).toFixed(2));
        total += lineTotal;
        db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(
          item.qty,
          product.id
        );
        return {
          product_id: product.id,
          qty: item.qty,
          unit_price: product.price_pkr,
          line_total: lineTotal,
        };
      });

      const method = data.method;
      const paid = method === 'credit' ? 0 : Number((data.paid ?? total).toFixed(2));
      if (paid > total) throw new AppError(400, 'Paid amount cannot exceed the total');
      const credit = method === 'credit' ? total : Number((total - paid).toFixed(2));

      const info = db
        .prepare('INSERT INTO sales (customer_id, total, paid, method) VALUES (?, ?, ?, ?)')
        .run(data.customer_id || null, total, paid, method);

      const insertItem = db.prepare(
        'INSERT INTO sale_items (sale_id, product_id, qty, unit_price, line_total) VALUES (?, ?, ?, ?, ?)'
      );
      for (const li of lineItems) {
        insertItem.run(info.lastInsertRowid, li.product_id, li.qty, li.unit_price, li.line_total);
      }

      // Khata: credit sale increases the customer's balance
      if (method === 'credit') {
        db.prepare(
          'INSERT INTO ledger (customer_id, product_id, amount, kind, note) VALUES (?, ?, ?, ?, ?)'
        ).run(data.customer_id, null, total, 'sale', 'Credit sale');
      }

      return { id: info.lastInsertRowid, total, paid, credit };
    });

    const sale = db
      .prepare(
        `SELECT s.*, c.name AS customer_name FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`
      )
      .get(saleId.id);
    const items = db
      .prepare(
        `SELECT si.*, p.name AS product_name FROM sale_items si
         JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?`
      )
      .all(saleId.id);
    return res.status(201).json({ sale: { ...sale, credit: saleId.credit, items } });
  } catch (err) {
    return next(err);
  }
});

// GET /api/sales?date=YYYY-MM-DD — recent sales or a day's sales
router.get('/', (req, res, next) => {
  try {
    const { date } = req.query;
    let rows;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      rows = db
        .prepare(
          `SELECT s.*, c.name AS customer_name FROM sales s
           LEFT JOIN customers c ON c.id = s.customer_id
           WHERE date(s.created_at) = ? ORDER BY s.id DESC`
        )
        .all(date);
    } else {
      rows = db
        .prepare(
          `SELECT s.*, c.name AS customer_name FROM sales s
           LEFT JOIN customers c ON c.id = s.customer_id
           ORDER BY s.id DESC LIMIT 50`
        )
        .all();
    }
    return res.json({ sales: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/sales/:id — one sale with items
router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sale = db
      .prepare(
        `SELECT s.*, c.name AS customer_name FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`
      )
      .get(id);
    if (!sale) throw new AppError(404, 'Sale not found');
    const items = db
      .prepare(
        `SELECT si.*, p.name AS product_name FROM sale_items si
         JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?`
      )
      .all(id);
    return res.json({ sale: { ...sale, items } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
