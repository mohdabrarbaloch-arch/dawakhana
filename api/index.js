'use strict';

/* Vercel serverless entry — adapts the Express app for serverless runtime.
   In serverless mode SQLite lives on /tmp (ephemeral, per-instance) so
   persistence across cold starts requires an external DB (see DESIGN.md). */

const path = require('path');

process.env.DB_PATH = process.env.DB_PATH || path.join('/tmp', 'pharmacy.db');
if (!process.env.JWT_SECRET) {
  // Serverless-safe fallback; set a real secret in Vercel env vars in production.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'vercel-default-secret-change-me-32chars!';
}

const app = require('../src/server');

module.exports = app;
