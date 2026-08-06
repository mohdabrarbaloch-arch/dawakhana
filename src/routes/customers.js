'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/error');

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  note: z.string().trim().max(200).optional(),
});

const OUTSTANDING_SQL = `
  SELECT c.*,
    COALESCE(SUM(CASE WHEN l.kind='sale' THEN l.amount ELSE -l.amount END), 0) AS outstanding
  FROM customers c
  LEFT JOIN ledger l ON l.customer_id = c.id
`;

// GET /api/customers
router.get('/', (req, res, next) => {
  try {
    const customers = db.prepare(`${OUTSTANDING_SQL} GROUP BY c.id ORDER BY c.name ASC`).all();
    return res.json({ customers });
  } catch (err) {
    return next(err);
  }
});

// POST /api/customers
router.post('/', (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const info = db
      .prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)')
      .run(data.name, data.phone || null, data.address || null);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({ customer: { ...customer, outstanding: 0 } });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Customer not found');
    const data = customerSchema.partial().parse(req.body);
    const merged = { ...existing, ...data };
    db.prepare('UPDATE customers SET name=?, phone=?, address=? WHERE id=?').run(
      merged.name,
      merged.phone || null,
      merged.address || null,
      id
    );
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    return res.json({ customer });
  } catch (err) {
    return next(err);
  }
});

// GET /api/customers/:id/ledger — full khata history + balance
router.get('/:id/ledger', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) throw new AppError(404, 'Customer not found');
    const entries = db
      .prepare(
        `SELECT l.*, p.name AS product_name FROM ledger l
         LEFT JOIN products p ON p.id = l.product_id
         WHERE l.customer_id = ? ORDER BY l.created_at DESC, l.id DESC`
      )
      .all(id);
    const balance = db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN kind='sale' THEN amount ELSE -amount END),0) AS balance FROM ledger WHERE customer_id=?"
      )
      .get(id).balance;
    return res.json({ customer, entries, balance });
  } catch (err) {
    return next(err);
  }
});

// POST /api/customers/:id/payments — record a payment against the khata
router.post('/:id/payments', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) throw new AppError(404, 'Customer not found');
    const { amount, note } = paymentSchema.parse(req.body);
    const info = db
      .prepare('INSERT INTO ledger (customer_id, amount, kind, note) VALUES (?, ?, ?, ?)')
      .run(id, amount, 'payment', note || null);
    const entry = db.prepare('SELECT * FROM ledger WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json({ entry });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
