'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const helpers = require('./helpers');

let app;
before(() => {
  app = helpers.setup();
});
after(() => helpers.cleanDb());
beforeEach(() => helpers.cleanDb());

test('reports: daily report returns zeros for empty day', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('get', '/api/reports/daily');
  assert.equal(res.status, 200);
  assert.equal(res.body.summary.salesCount, 0);
  assert.equal(res.body.summary.revenue, 0);
});

test('reports: daily report aggregates sales', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Vitamin D3',
    category: 'Supplement',
    price_pkr: 350,
    stock_qty: 100,
  });
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Rashid' });
  await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 1 }],
    method: 'cash',
    paid: 350,
  });
  await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 2 }],
    method: 'credit',
    customer_id: c.body.customer.id,
  });
  const res = await helpers.authRequest('get', '/api/reports/daily');
  assert.equal(res.body.summary.salesCount, 2);
  assert.equal(res.body.summary.revenue, 1050);
  assert.equal(res.body.summary.cashRevenue, 350);
  assert.equal(res.body.summary.creditRevenue, 700);
  assert.equal(res.body.summary.collected, 350);
  assert.equal(res.body.topProducts.length, 1);
  assert.equal(res.body.topProducts[0].qty_sold, 3);
});

test('reports: daily report by date param', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('get', '/api/reports/daily?date=2026-01-01');
  assert.equal(res.status, 200);
  assert.equal(res.body.date, '2026-01-01');
  assert.equal(res.body.summary.salesCount, 0);
});
