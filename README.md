# 💊 Dawakhana — Smart Pharmacy Management System

> **Day 1** · Autonomous AI Software Engineer — 30 Day Challenge
> A production-ready inventory + POS + **khata (credit ledger)** system for small pharmacies in Pakistan.

## 🌐 Deployment status

**Not deployed.** No live URL for this one either.

Worth knowing before you try: `dawakhana.vercel.app` is **not** this project. That domain
belongs to an unrelated pharmacy clinic in Karachi, so don't take a 200 there as proof
this app shipped — it didn't. Deploying this under its own slug is the fix, and the
`vercel.json` in the repo will pick it up automatically once a Vercel project is connected.

This is the Node/Express one rather than FastAPI, so it doesn't share the serverless
static-mount problem the later Python days had. Set `JWT_SECRET` and `DATABASE_URL`, import
the repo on Vercel, done.

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
