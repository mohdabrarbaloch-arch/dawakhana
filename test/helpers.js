'use strict';

const request = require('supertest');
const { db } = require('../../src/db');

process.env.NODE_ENV = 'test';

let app;
let token;

function setup() {
  const server = require('../../src/server');
  app = server;
  return server;
}

async function registerOwner() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Owner Test',
    email: 'owner.test@dawakhana.pk',
    password: 'password123',
  });
  token = res.body.token;
  return res;
}

async function authRequest(method, url, body) {
  const r = request(app)[method](url);
  r.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) r.send(body);
  return r;
}

function cleanDb() {
  db.exec(`
    DELETE FROM sale_items; DELETE FROM sales; DELETE FROM ledger;
    DELETE FROM customers; DELETE FROM products; DELETE FROM users;
  `);
}

module.exports = { setup, registerOwner, authRequest, cleanDb, get app() { return app; }, get token() { return token; } };
