# PROGRESS — Autonomous AI Software Engineer · 30 Day Challenge

> Log of daily completions. Each entry: project, status, verification, blockers.

## Day 1 — 2026-08-07

| Field | Value |
|---|---|
| **Project** | 💊 Dawakhana — Smart Pharmacy Management System |
| **Idea** | Inventory + POS + credit khata ledger for small Pakistani pharmacies; expiry tracking stops expired-medicine losses |
| **Stack** | Node.js · Express 4 · better-sqlite3 · Vanilla JS SPA · Docker · Vercel adapter |
| **Code** | ~2,400 lines (src, public, scripts, test) |
| **Tests** | ✅ 37/37 passing (`node --test` + supertest, in-memory SQLite) |
| **Lint** | ✅ ESLint 0 errors |
| **Format** | ✅ Prettier clean |
| **Build/run** | ✅ Server boots, all APIs verified via curl (health, login, products, alerts, daily report), SPA renders (screenshots captured) |
| **Git** | ✅ Initialized `main`, committed (2 commits, 36 files) |
| **GitHub push** | ✅ **DONE (2026-08-06)** — repo created `mohdabrarbaloch-arch/dawakhana` (public), all code pushed, README with screenshots, v1.0.0 release. URL: https://github.com/mohdabrarbaloch-arch/dawakhana |
| **Vercel deploy** | ⏳ **IN PROGRESS** — `vercel` CLI 58.7.1 installed; `vercel login` device flow started 2026-08-07 (awaiting user authorization at device URL, or a `VERCEL_TOKEN`). `vercel.json` + `api/index.js` adapter ready — `vercel --prod` deploys instantly once authenticated. |
| **README** | ✅ Written with live screenshot URLs, features, install guide (honest deployment note) |
| **Release** | ✅ v1.0.0 released on GitHub (release notes drafted) |
| **LinkedIn summary** | ✅ Written (see below) |
| **Completion** | ✅ 2026-08-07 ~00:45 PKT (UTC+5) |

### LinkedIn-ready project summary (Day 1)

> 🚀 **Day 1 of my 30-Day AI Software Engineer Challenge — Done!**
>
> Built **Dawakhana**, a Smart Pharmacy Management System for small pharmacies in Pakistan. Every dukhan-dar knows the pain: expired stock getting sold by accident, khata (credit) debts lost in notebooks, no idea what sold today. Dawakhana fixes all three:
>
> ✅ Expiry-date tracking with 30-day & expired alerts — never sell expired medicine again
> ✅ Customer khata ledger — every credit sale and payment tracked, outstanding balances always visible
> ✅ Daily reports — revenue (cash vs credit), best sellers, low-stock alerts, all date-filterable
> ✅ JWT auth, rate limiting, helmet security, zod validation, atomic SQLite transactions
> ✅ Mobile-first dark UI, works on any shop phone, no app install
> ✅ 37/37 unit tests passing, ESLint clean, Docker + Vercel ready
>
> Tech: Node.js · Express · SQLite · Vanilla JS · Docker
>
> The 30-day challenge is on — a new production-ready app every single day. Follow along for the full stack AI portfolio. 💻🔥
> #30DayChallenge #BuildInPublic #PharmacyTech #NodeJS #Express #SQLite #SoftwareEngineering #MERN #FullStack

### Blockers (to fix for Day 2+)

1. **Vercel deploy (only remaining blocker)**: needs `VERCEL_TOKEN` env var or completing `vercel login` in the sandbox. Then: `npm i -g vercel && vercel --prod --yes --token $VERCEL_TOKEN`. Repo is already live on GitHub, so Vercel import (`vercel --prod`) works immediately.
2. ~~GitHub push~~ ✅ done via GitHub MCP (repo: `mohdabrarbaloch-arch/dawakhana`, v1.0.0 release).
3. ~~Create release~~ ✅ v1.0.0 released on GitHub.
