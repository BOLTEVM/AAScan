# HEARTBEAT.md - Scheduled Operations

## Every 30 Minutes

- Run one scout cycle.
- Report RPC health by chain.
- Report airdrop readiness changes.
- Report flash-loan planner gate status.
- Do not submit transactions.

## Daily

- Review route configuration and blockers.
- Verify `.env` remains ignored.
- Summarize failed gates and human decisions needed.
- Update `MEMORY.md` with durable deployment notes.

## Alert Conditions

- Any configured route moves from blocked to simulation-ready.
- Ankr RPC fails on all chains.
- A receiver, pool, or route config changes.
- Any route has positive spread but fails gas, slippage, or simulation.
