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

test('sales: cash sale decrements stock', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Panadol',
    category: 'Medicine',
    price_pkr: 40,
    stock_qty: 10,
  });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 3 }],
    method: 'cash',
    paid: 120,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.sale.total, 120);
  assert.equal(res.body.sale.paid, 120);
  const list = await helpers.authRequest('get', '/api/products');
  const updated = list.body.products.find((x) => x.id === p.body.product.id);
  assert.equal(updated.stock_qty, 7);
});

test('sales: credit sale requires a customer', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Disprin',
    category: 'Medicine',
    price_pkr: 25,
    stock_qty: 10,
  });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 2 }],
    method: 'credit',
  });
  assert.equal(res.status, 400);
});

test('sales: credit sale records ledger and outstanding', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Calpol',
    category: 'Medicine',
    price_pkr: 95,
    stock_qty: 20,
  });
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Khata Customer' });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 2 }],
    method: 'credit',
    customer_id: c.body.customer.id,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.sale.credit, 190);
  const ledger = await helpers.authRequest('get', `/api/customers/${c.body.customer.id}/ledger`);
  assert.equal(ledger.body.balance, 190);
});

test('sales: rejects insufficient stock', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Rare Med',
    category: 'Medicine',
    price_pkr: 500,
    stock_qty: 2,
  });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 5 }],
    method: 'cash',
    paid: 2500,
  });
  assert.equal(res.status, 409);
});

test('sales: partial payment computes credit', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'ORS',
    category: 'Medicine',
    price_pkr: 15,
    stock_qty: 100,
  });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 10 }],
    method: 'cash',
    paid: 100,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.sale.credit, 50);
});

test('sales: paid cannot exceed total', async () => {
  await helpers.registerOwner();
  const p = await helpers.authRequest('post', '/api/products', {
    name: 'Tape',
    category: 'Supply',
    price_pkr: 60,
    stock_qty: 20,
  });
  const res = await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: p.body.product.id, qty: 1 }],
    method: 'cash',
    paid: 9999,
  });
  assert.equal(res.status, 400);
});
