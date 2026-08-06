'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/error');

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  category: z.string().trim().max(60).default('General'),
  price_pkr: z.number().nonnegative('Price cannot be negative'),
  cost_pkr: z.number().nonnegative('Cost cannot be negative').default(0),
  stock_qty: z.number().int().nonnegative('Stock cannot be negative').default(0),
  min_stock: z.number().int().nonnegative('Min stock cannot be negative').default(5),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry must be YYYY-MM-DD')
    .nullable()
    .optional(),
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const withFilters = (req) => {
  const { expiring, low, q } = req.query;
  const clauses = [];
  const params = [];
  if (expiring) {
    const days = parseInt(expiring, 10);
    if (!Number.isNaN(days) && days > 0) {
      clauses.push(
        "expiry_date IS NOT NULL AND expiry_date <= date('now', ?) AND expiry_date >= date('now')"
      );
      params.push(`+${days} days`);
    }
  }
  if (low === '1' || low === 'true') {
    clauses.push('stock_qty <= min_stock');
  }
  if (q) {
    clauses.push('(name LIKE ? OR category LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
};

// GET /api/products?expiring=30&low=1&q=panadol
router.get('/', (req, res, next) => {
  try {
    const { where, params } = withFilters(req);
    const rows = db
      .prepare(
        `SELECT * FROM products ${where} ORDER BY
           CASE WHEN expiry_date IS NOT NULL AND expiry_date < date('now') THEN 0 ELSE 1 END,
           expiry_date ASC, name ASC`
      )
      .all(...params);
    return res.json({ products: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/products/alerts — low stock + expiring/expired in one call
router.get('/alerts', (req, res, next) => {
  try {
    const lowStock = db
      .prepare('SELECT * FROM products WHERE stock_qty <= min_stock ORDER BY stock_qty ASC')
      .all();
    const expiring = db
      .prepare(
        "SELECT * FROM products WHERE expiry_date IS NOT NULL AND expiry_date <= date('now','+30 days') ORDER BY expiry_date ASC"
      )
      .all();
    return res.json({ lowStock, expiring });
  } catch (err) {
    return next(err);
  }
});

// POST /api/products
router.post('/', (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    if (data.expiry_date && data.expiry_date < todayStr()) {
      throw new AppError(400, 'Expiry date cannot be in the past');
    }
    const info = db
      .prepare(
        `INSERT INTO products (name, category, price_pkr, cost_pkr, stock_qty, min_stock, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.category,
        data.price_pkr,
        data.cost_pkr,
        data.stock_qty,
        data.min_stock,
        data.expiry_date || null
      );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({ product });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Product not found');

    const data = productSchema.partial().parse(req.body);
    if (data.expiry_date && data.expiry_date < todayStr()) {
      throw new AppError(400, 'Expiry date cannot be in the past');
    }
    const merged = { ...existing, ...data };
    db.prepare(
      `UPDATE products SET name=?, category=?, price_pkr=?, cost_pkr=?, stock_qty=?, min_stock=?, expiry_date=?
       WHERE id=?`
    ).run(
      merged.name,
      merged.category,
      merged.price_pkr,
      merged.cost_pkr,
      merged.stock_qty,
      merged.min_stock,
      merged.expiry_date || null,
      id
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Product not found');
    const sold = db.prepare('SELECT COUNT(*) AS n FROM sale_items WHERE product_id = ?').get(id).n;
    if (sold > 0) {
      throw new AppError(409, 'Cannot delete a product that has been sold');
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
