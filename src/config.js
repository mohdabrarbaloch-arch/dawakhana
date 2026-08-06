'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function requireEnv(name, { minLength = 0 } = {}) {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'test') return value || 'test-secret-value-1234567890-abcdef';
  if (!value || value.length < minLength) {
    throw new Error(`[config] Missing or too-short environment variable: ${name}`);
  }
  return value;
}

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  isTest: process.env.NODE_ENV === 'test',
  jwtSecret: requireEnv('JWT_SECRET', { minLength: 32 }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'pharmacy.db'),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  },
};

module.exports = config;
