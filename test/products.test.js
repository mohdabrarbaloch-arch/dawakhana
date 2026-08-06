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

test('products: create a product', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('post', '/api/products', {
    name: 'Panadol 500mg',
    category: 'Medicine',
    price_pkr: 40,
    cost_pkr: 30,
    stock_qty: 100,
    min_stock: 10,
    expiry_date: '2027-01-01',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.product.name, 'Panadol 500mg');
  assert.equal(res.body.product.stock_qty, 100);
});

test('products: rejects past expiry date', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('post', '/api/products', {
    name: 'Old Med',
    category: 'Medicine',
    price_pkr: 10,
    stock_qty: 5,
    expiry_date: '2020-01-01',
  });
  assert.equal(res.status, 400);
});

test('products: requires auth', async () => {
  const res = await require('supertest')(app).get('/api/products');
  assert.equal(res.status, 401);
});

test('products: list and filter by expiring', async () => {
  await helpers.registerOwner();
  await helpers.authRequest('post', '/api/products', {
    name: 'Soon Expiring',
    category: 'Medicine',
    price_pkr: 20,
    stock_qty: 10,
    expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  });
  await helpers.authRequest('post', '/api/products', {
    name: 'Far Expiry',
    category: 'Medicine',
    price_pkr: 20,
    stock_qty: 10,
    expiry_date: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
  });
  const res = await helpers.authRequest('get', '/api/products?expiring=30');
  assert.equal(res.status, 200);
  const names = res.body.products.map((p) => p.name);
  assert.ok(names.includes('Soon Expiring'));
  assert.ok(!names.includes('Far Expiry'));
});

test('products: low stock filter', async () => {
  await helpers.registerOwner();
  await helpers.authRequest('post', '/api/products', {
    name: 'Low Item',
    category: 'Supply',
    price_pkr: 50,
    stock_qty: 3,
    min_stock: 10,
  });
  await helpers.authRequest('post', '/api/products', {
    name: 'Healthy Item',
    category: 'Supply',
    price_pkr: 50,
    stock_qty: 50,
    min_stock: 10,
  });
  const res = await helpers.authRequest('get', '/api/products?low=1');
  const names = res.body.products.map((p) => p.name);
  assert.ok(names.includes('Low Item'));
  assert.ok(!names.includes('Healthy Item'));
});

test('products: update a product', async () => {
  await helpers.registerOwner();
  const created = await helpers.authRequest('post', '/api/products', {
    name: 'Cough Syrup',
    category: 'Medicine',
    price_pkr: 140,
    stock_qty: 20,
  });
  const id = created.body.product.id;
  const res = await helpers.authRequest('put', `/api/products/${id}`, { price_pkr: 150 });
  assert.equal(res.status, 200);
  assert.equal(res.body.product.price_pkr, 150);
});

test('products: delete unsold product', async () => {
  await helpers.registerOwner();
  const created = await helpers.authRequest('post', '/api/products', {
    name: 'Delete Me',
    category: 'Supply',
    price_pkr: 10,
    stock_qty: 1,
  });
  const res = await helpers.authRequest('delete', `/api/products/${created.body.product.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('products: cannot delete sold product', async () => {
  await helpers.registerOwner();
  const created = await helpers.authRequest('post', '/api/products', {
    name: 'Sold Item',
    category: 'Medicine',
    price_pkr: 100,
    stock_qty: 10,
  });
  const id = created.body.product.id;
  await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: id, qty: 1 }],
    method: 'cash',
    paid: 100,
  });
  const res = await helpers.authRequest('delete', `/api/products/${id}`);
  assert.equal(res.status, 409);
});
