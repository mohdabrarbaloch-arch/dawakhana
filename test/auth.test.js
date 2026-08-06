'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const helpers = require('./helpers');

let app;

before(() => {
  app = helpers.setup();
});

after(() => {
  helpers.cleanDb();
});

beforeEach(() => {
  helpers.cleanDb();
});

test('register: creates the first user as owner', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Ali Khan',
    email: 'ali.khan@dawakhana.pk',
    password: 'password123',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'owner');
  assert.ok(res.body.token);
});

test('register: subsequent users become staff', async () => {
  await request(app).post('/api/auth/register').send({
    name: 'Ali Khan',
    email: 'ali.khan@dawakhana.pk',
    password: 'password123',
  });
  const res = await request(app).post('/api/auth/register').send({
    name: 'Sara Khan',
    email: 'sara.khan@dawakhana.pk',
    password: 'password123',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'staff');
});

test('register: rejects duplicate email with 409', async () => {
  const payload = { name: 'Ali Khan', email: 'dup@dawakhana.pk', password: 'password123' };
  await request(app).post('/api/auth/register').send(payload);
  const res = await request(app).post('/api/auth/register').send(payload);
  assert.equal(res.status, 409);
});

test('register: rejects short password', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Ali Khan',
    email: 'short@dawakhana.pk',
    password: '123',
  });
  assert.equal(res.status, 400);
});

test('login: succeeds with correct credentials', async () => {
  await helpers.registerOwner();
  const res = await request(app).post('/api/auth/login').send({
    email: 'owner.test@dawakhana.pk',
    password: 'password123',
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'owner.test@dawakhana.pk');
});

test('login: rejects wrong password', async () => {
  await helpers.registerOwner();
  const res = await request(app).post('/api/auth/login').send({
    email: 'owner.test@dawakhana.pk',
    password: 'wrong-password',
  });
  assert.equal(res.status, 401);
});

test('me: returns the authenticated user', async () => {
  await helpers.registerOwner();
  const res = await helpers.authRequest('get', '/api/auth/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'owner.test@dawakhana.pk');
});

test('me: rejects missing token', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});
