# Dawakhana — Smart Pharmacy Management System

> **Day 1** of the Autonomous AI Software Engineer 30-Day Challenge.
> A production-ready inventory + POS + credit-ledger system for small pharmacies in Pakistan.

## 1. Problem

Small pharmacies (dawakhanas) in Pakistan run on paper registers and memory:

- **Expired medicine** is sold or thrown away because nobody tracks expiry dates — a health hazard and a direct financial loss (regulators regularly fine and seal pharmacies over expired stock).
- **Credit sales** ("likh do, baad mein dey dunga") are recorded in notebooks and never reconciled — shopkeepers lose thousands of rupees to forgotten debts.
- **No daily reports** — owners don't know daily revenue, best sellers, or which stock is running low until it's too late.

## 2. Solution

A single-page, mobile-friendly web app that a pharmacist opens on any device:

- **Inventory with expiry tracking** — every batch has an expiry date; the dashboard flags items expiring within 30 days and low-stock items.
- **Credit ledger** — customers get a running ledger (khata); sales can be cash or credit; payments reduce the balance; outstanding balances are visible everywhere.
- **Sales & reports** — create sales with automatic stock deduction; a daily report shows revenue (cash vs credit), items sold, and top products.
- **Multi-user auth** — JWT-based login/register so only the owner and staff can use the system.

## 3. Architecture

```
┌──────────────────────────────┐
│  Browser (vanilla JS SPA)   │  /public
│  fetch() + token in header  │
└──────────────────┬───────────┘
                   │ REST / JSON
┌──────────────────▼───────────┐
│  Express API  (src/)        │
│  helmet · rate-limit · cors │
│  zod validation             │
│  JWT auth middleware        │
└──────────────────┬───────────┘
                   │ better-sqlite3
┌──────────────────▼───────────┐
│  SQLite (data/pharmacy.db)  │  WAL mode, FK constraints
└──────────────────────────────┘
```

**Stack choices**

- **Node.js + Express 4** — ubiquitous, easy to deploy (Vercel/Docker/Railway), massive ecosystem.
- **better-sqlite3** — zero-config embedded DB with real SQL, transactions, and WAL. Perfect for a single-pharmacy deployment; can be swapped for Postgres later (repository layer is isolated in `src/db.js`).
- **Vanilla JS SPA** — no build step, instant load, works offline-first; served statically by the same server (single deployable unit). Keeps the app deployable to any static+serverless host.
- **JWT + bcrypt** — stateless auth with hashed passwords.

## 4. Data Model

```sql
users      (id, name, email UNIQUE, password_hash, role CHECK IN ('owner','staff'), created_at)
products   (id, name, category, price_pkr REAL, cost_pkr REAL, stock_qty INTEGER,
            min_stock INTEGER, expiry_date TEXT, created_at)
customers  (id, name, phone, address, created_at)
ledger     (id, customer_id FK, product_id FK NULL, amount REAL, kind CHECK IN ('sale','payment'),
            note, created_at)                      -- running credit ledger (khata)
sales      (id, customer_id FK NULL, total REAL, paid REAL, method CHECK IN ('cash','credit'),
            created_at)
sale_items (id, sale_id FK, product_id FK, qty INTEGER, unit_price REAL, line_total REAL)
```

**Business rules**

- A sale with `method='credit'` requires a customer and records `paid=0`; it also appends a `ledger` row (`kind='sale'`) increasing the customer's balance.
- A `payment` appends a ledger row (`kind='payment'`) decreasing the balance.
- Creating a sale decrements `products.stock_qty` and refuses if insufficient stock (atomic via a transaction).
- Deleting a product is soft-guarded: only possible if it has never been sold (FK `sale_items` with `ON DELETE RESTRICT`).

## 5. API Specification

| Method | Path                          | Auth | Body / Notes                                                                                 |
| ------ | ----------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/register`          | —    | `{name,email,password}` → creates first user as `owner`                                      |
| POST   | `/api/auth/login`             | —    | `{email,password}` → `{token,user}`                                                          |
| GET    | `/api/auth/me`                | ✅   | current user                                                                                 |
| GET    | `/api/products`               | ✅   | all products, `?expiring=30` / `?low=1` filters                                              |
| POST   | `/api/products`               | ✅   | create product (validates expiry ≥ today)                                                    |
| PUT    | `/api/products/:id`           | ✅   | update product                                                                               |
| DELETE | `/api/products/:id`           | ✅   | delete (only if never sold)                                                                  |
| GET    | `/api/customers`              | ✅   | all customers with `outstanding` balance                                                     |
| POST   | `/api/customers`              | ✅   | `{name,phone?,address?}`                                                                     |
| PUT    | `/api/customers/:id`          | ✅   | update customer                                                                              |
| GET    | `/api/customers/:id/ledger`   | ✅   | ledger entries + balance                                                                     |
| POST   | `/api/customers/:id/payments` | ✅   | `{amount,note?}` → record payment                                                            |
| POST   | `/api/sales`                  | ✅   | `{items:[{product_id,qty}], method:'cash'\|'credit', customer_id?, paid?}`                   |
| GET    | `/api/sales`                  | ✅   | recent sales (latest 50), `?date=YYYY-MM-DD`                                                 |
| GET    | `/api/reports/daily`          | ✅   | `?date=` → revenue, cash/credit split, items sold, top products, low-stock & expiring counts |
| GET    | `/api/health`                 | —    | liveness probe                                                                               |

## 6. Security

- **helmet** sets secure HTTP headers (CSP, X-Frame-Options, etc.).
- **express-rate-limit** (200 req / 15 min per IP; stricter 20 req / 15 min on auth routes).
- **bcrypt** password hashing (10 rounds).
- **JWT** signed with `JWT_SECRET` (min 32 chars enforced at boot), 7-day expiry.
- **zod** validation on every input; SQL is fully parameterized (no injection).
- **CORS** locked to same-origin in production (configurable via env).
- `NODE_ENV=production` hides error stack traces.
- CSP allows only same-origin scripts/styles; inline styles used by the SPA are allowed via a narrowly-scoped `style-src 'unsafe-inline'` (documented tradeoff for the no-build SPA).

## 7. Deployment

- **Docker** — multi-stage `Dockerfile` (npm ci → copy → `node src/server.js`), `docker-compose.yml` with a persistent volume for SQLite.
- **Vercel** — `vercel.json` maps the Express app as a serverless function (`api/index.js`); SQLite file lives on a writable runtime path (`/tmp`) so the app works in serverless mode (documented caveat: use an external DB for multi-instance production).
- **Local** — `npm start` → http://localhost:5000.

## 8. Testing

- `node --test` (built-in test runner) + `supertest` against the Express app with an **in-memory SQLite DB** (`:memory:`), so tests are hermetic and fast.
- Coverage: auth (register/login/me/validation), products (CRUD + low/expiring filters + expiry validation), customers (CRUD + ledger + payment), sales (cash/credit, stock decrement, insufficient-stock rejection, reports).
