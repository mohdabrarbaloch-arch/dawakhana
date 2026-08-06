'use strict';

const { Router } = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();
router.use(requireAuth);

// GET /api/reports/daily?date=YYYY-MM-DD (defaults to today)
router.get('/daily', (req, res, next) => {
  try {
    const date =
      req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : null;
    const dateExpr = date ? 'date(s.created_at) = ?' : "date(s.created_at) = date('now')";
    const params = date ? [date] : [];

    const totals = db
      .prepare(
        `SELECT
           COUNT(*) AS sales_count,
           COALESCE(SUM(s.total),0) AS revenue,
           COALESCE(SUM(s.paid),0) AS collected,
           COALESCE(SUM(CASE WHEN s.method='credit' THEN s.total ELSE 0 END),0) AS credit_revenue,
           COALESCE(SUM(CASE WHEN s.method='cash' THEN s.total ELSE 0 END),0) AS cash_revenue
         FROM sales s WHERE ${dateExpr}`
      )
      .get(...params);

    const itemsSold = db
      .prepare(
        `SELECT COALESCE(SUM(si.qty),0) AS qty, COALESCE(SUM(si.line_total),0) AS value
         FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE ${dateExpr}`
      )
      .get(...params);

    const topProducts = db
      .prepare(
        `SELECT p.id, p.name, SUM(si.qty) AS qty_sold, SUM(si.line_total) AS revenue
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN products p ON p.id = si.product_id
         WHERE ${dateExpr}
         GROUP BY p.id ORDER BY qty_sold DESC LIMIT 5`
      )
      .all(...params);

    const lowStockCount = db
      .prepare('SELECT COUNT(*) AS n FROM products WHERE stock_qty <= min_stock')
      .get().n;
    const expiringCount = db
      .prepare(
        "SELECT COUNT(*) AS n FROM products WHERE expiry_date IS NOT NULL AND expiry_date <= date('now','+30 days')"
      )
      .get().n;

    return res.json({
      date: date || new Date().toISOString().slice(0, 10),
      summary: {
        salesCount: totals.sales_count,
        revenue: totals.revenue,
        collected: totals.collected,
        cashRevenue: totals.cash_revenue,
        creditRevenue: totals.credit_revenue,
        itemsSoldQty: itemsSold.qty,
        itemsSoldValue: itemsSold.value,
      },
      topProducts,
      alerts: { lowStockCount, expiringCount },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
