# 💊 Dawakhana — Smart Pharmacy Management System

> **Day 1** · Autonomous AI Software Engineer — 30 Day Challenge
> A production-ready inventory + POS + **khata (credit ledger)** system for small pharmacies in Pakistan.

**Built in one day**: Node.js · Express · SQLite · Vanilla JS SPA · Docker · Vercel-ready.

---

## 🚀 Live Demo

> ✅ **GitHub:** [github.com/mohdabrarbaloch-arch/dawakhana](https://github.com/mohdabrarbaloch-arch/dawakhana) — code pushed, v1.0.0 released.
> ⏳ **Vercel:** deploy in progress — `vercel` CLI installed, device login awaiting authorization. The app is fully built, tested (37/37), linted, and verified locally. See [Deployment](#deployment) below.

## 📸 Screenshots

| Dashboard | Products & Expiry Alerts |
|---|---|
| ![Dashboard](https://static.teamily.ai/sites/1fcc63e9-cd8c-4061-8f91-a391ed89ac5f/documents/dashboard/dashboard.png) | ![Products](https://static.teamily.ai/sites/1fcc63e9-cd8c-4061-8f91-a391ed89ac5f/documents/products/products.png) |

| Customer Khata (Credit Ledger) | Daily Reports |
|---|---|
| ![Khata](https://static.teamily.ai/sites/1fcc63e9-cd8c-4061-8f91-a391ed89ac5f/documents/khata/khata.png) | ![Reports](https://static.teamily.ai/sites/1fcc63e9-cd8c-4061-8f91-a391ed89ac5f/documents/reports/reports.png) |

---

## 🎯 The Problem

Small pharmacies (dawakhanas) in Pakistan still run on paper registers and memory:

- ❌ **Expired medicine** gets sold or thrown away — a health hazard and financial loss (regulators fine and seal pharmacies over expired stock).
- ❌ **Credit sales** ("likh do, baad mein dey dunga") are noted in notebooks and never reconciled — shopkeepers lose thousands of rupees to forgotten debts.
- ❌ **No daily reports** — owners don't know daily revenue, best sellers, or low stock until it's too late.

## ✨ Features

- **📦 Inventory with expiry tracking** — per-batch expiry dates; dashboard flags items **already expired** and **expiring within 30 days**; low-stock (≤ min) alerts.
- **🧾 POS-style sales** — cash or **khata (credit)**; automatic atomic stock deduction; insufficient-stock rejection.
- **👥 Customer khata ledger** — every customer has a running balance; sales add, payments subtract; full ledger history per customer; outstanding balances on every screen.
- **📈 Daily reports** — revenue (cash vs credit split), items sold, top-5 products, low-stock & expiring counts. Date-filterable.
- **🔐 Multi-user auth** — JWT + bcrypt; first user becomes `owner`, others `staff`; rate-limited login; helmet security headers; zod validation on every input.
- **📱 Mobile-first responsive UI** — no build step, instant load, works on any phone in the shop.
- **🐳 Docker + ☁️ Vercel-ready** — one command to deploy anywhere.

## 🏗️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express 4 | Ubiquitous, simple, battle-tested |
| Database | better-sqlite3 (WAL) | Zero-config, real SQL, transactions; swappable for Postgres |
| Frontend | Vanilla JS SPA | No build step, offline-fast, single deployable unit |
| Auth | JWT + bcrypt + rate-limit | Stateless, secure, standard |
| Validation | zod | Typed, declarative, zero-trust inputs |
| Security | helmet + CORS + CSP | Secure headers, locked-down defaults |

## 📁 Project Structure

```
dawakhana/
├── api/index.js            # Vercel serverless entry
├── public/
│   ├── index.html          # SPA shell (auth + app)
│   └── app.js              # Dashboard, products, sales, khata, reports
├── scripts/seed.js         # Demo data: owner account + Pakistani pharmacy stock
├── src/
│   ├── server.js           # Express app (helmet, rate-limit, routes, static)
│   ├── config.js           # Env config (JWT_SECRET, DB_PATH, ports)
│   ├── db.js               # SQLite schema + WAL + transactions
│   ├── middleware/         # auth (JWT), error handler
│   └── routes/             # auth, products, customers, sales, reports
├── test/                   # 37 unit tests (node:test + supertest, in-memory DB)
├── Dockerfile / docker-compose.yml
├── vercel.json
├── DESIGN.md               # Architecture, data model, API spec
└── .env.example
```

## 🔌 API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register (1st user = owner) |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET/POST | `/api/products` | ✅ | List (filters: `q`, `low=1`, `expiring=30`) / create |
| GET | `/api/products/alerts` | ✅ | Low stock + expiring/expired in one call |
| PUT/DELETE | `/api/products/:id` | ✅ | Update / delete (only if never sold) |
| GET/POST | `/api/customers` | ✅ | List (with outstanding) / create |
| GET | `/api/customers/:id/ledger` | ✅ | Khata history + balance |
| POST | `/api/customers/:id/payments` | ✅ | Record payment |
| POST | `/api/sales` | ✅ | Create sale (cash/credit, atomic) |
| GET | `/api/sales` | ✅ | Recent / `?date=` |
| GET | `/api/reports/daily` | ✅ | `?date=` revenue, top products, alerts |
| GET | `/api/health` | — | Liveness |

## 🛠️ Installation & Local Run

```bash
git clone https://github.com/mohdabrarbaloch-arch/dawakhana.git
cd dawakhana

# 1. Configure
cp .env.example .env          # then set a strong JWT_SECRET (openssl rand -hex 32)

# 2. Install & start
npm install
npm run seed                  # demo data (owner@dawakhana.pk / admin12345)
npm start                     # → http://localhost:5000
```

**Demo login:** `owner@dawakhana.pk` / `admin12345`

### Docker

```bash
docker compose up --build     # → http://localhost:5000
```

### Vercel

```bash
npm i -g vercel
vercel                          # set env: JWT_SECRET, DB_PATH=/tmp/pharmacy.db
vercel --prod
```

> **Serverless caveat:** on Vercel the SQLite file lives on `/tmp` (ephemeral per instance) — perfect for demos; use an external Postgres (the repository layer in `src/db.js` isolates DB access) for multi-instance production.

## ✅ Quality

- **37/37 unit tests passing** (`npm test`) — auth, products (CRUD/filters/expiry), sales (cash/credit/stock/ledger), customers (khata/payments), reports (aggregates/alerts)
- **ESLint 0 errors**, **Prettier-formatted**
- Production build verified: server boots, API responds, SPA renders (screenshots above)
- SQL fully parameterized · zod on all inputs · bcrypt hashed passwords · helmet + rate limiting

## 📄 License

[MIT](./LICENSE) © 2026 ABraz Baloch

---

*Part of the [Autonomous AI Software Engineer — 30 Day Challenge](https://github.com/mohdabrarbaloch-arch): 30 unique production apps, one per day.*
