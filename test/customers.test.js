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

test('customers: create a customer', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('post', '/api/customers', {
    name: 'Ahmed Raza',
    phone: '0300-1234567',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.customer.name, 'Ahmed Raza');
  assert.equal(res.body.customer.outstanding, 0);
});

test('customers: list with outstanding balance', async () => {
  await helpers.registerOwner();
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Fatima Noor' });
  const product = await helpers.authRequest('post', '/api/products', {
    name: 'Vitamin D3',
    category: 'Supplement',
    price_pkr: 350,
    stock_qty: 50,
  });
  await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: product.body.product.id, qty: 2 }],
    method: 'credit',
    customer_id: c.body.customer.id,
  });
  const res = await helpers.authRequest('get', '/api/customers');
  const customer = res.body.customers.find((x) => x.id === c.body.customer.id);
  assert.equal(customer.outstanding, 700);
});

test('customers: ledger shows sale and payment', async () => {
  await helpers.registerOwner();
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Usman' });
  const product = await helpers.authRequest('post', '/api/products', {
    name: 'ORS',
    category: 'Medicine',
    price_pkr: 15,
    stock_qty: 100,
  });
  await helpers.authRequest('post', '/api/sales', {
    items: [{ product_id: product.body.product.id, qty: 10 }],
    method: 'credit',
    customer_id: c.body.customer.id,
  });
  const pay = await helpers.authRequest('post', `/api/customers/${c.body.customer.id}/payments`, {
    amount: 50,
    note: 'Partial payment',
  });
  assert.equal(pay.status, 201);
  const ledger = await helpers.authRequest('get', `/api/customers/${c.body.customer.id}/ledger`);
  assert.equal(ledger.body.balance, 100); // 150 sale - 50 payment
  assert.equal(ledger.body.entries.length, 2);
});

test('customers: payment requires positive amount', async () => {
  await helpers.registerOwner();
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Zain' });
  const res = await helpers.authRequest('post', `/api/customers/${c.body.customer.id}/payments`, {
    amount: -5,
  });
  assert.equal(res.status, 400);
});

test('customers: update customer', async () => {
  await helpers.registerOwner();
  const c = await helpers.authRequest('post', '/api/customers', { name: 'Ali' });
  const res = await helpers.authRequest('put', `/api/customers/${c.body.customer.id}`, {
    address: 'Karachi',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.customer.address, 'Karachi');
});
