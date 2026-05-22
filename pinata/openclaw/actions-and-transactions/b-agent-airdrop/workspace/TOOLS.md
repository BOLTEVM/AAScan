# TOOLS.md - Environment Notes

## Stack

- Runtime: Bun preferred, npm fallback
- Frontend: Vite + React
- Onchain: ethers v6
- RPC: Ankr via `VITE_ANKR_API_KEY`
- Planning: `src/logic/flashloan-planner.js`
- Scout loop: `src/logic/scout.js`

## Commands

```bash
bun install
bun run lint
bun run build
bun run dev -- --host 127.0.0.1 --port 5173
```

## RPC Notes

- `.env` is ignored and must hold real secrets locally.
- `.env.example` must contain placeholders only.
- If Ankr returns 404 for keyed URLs, verify the key belongs to an active RPC project.
- Public Ankr URLs may return unauthorized responses without a key.

## Transaction Notes

- The shipped app plans and simulates; it does not submit transactions.
- `config.autonomy.executeTransactions` must remain false until an executor, spending policy, and confirmation flow are added.
- Flash-loan gas cost must be represented in the borrowed asset before a plan can pass.
