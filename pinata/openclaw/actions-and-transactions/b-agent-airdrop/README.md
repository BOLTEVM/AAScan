# B-Agent Airdrop Pinata Template

## What This Is

An OpenClaw-style Pinata agent template for running B-Agent as a hosted onchain scout. It follows the Pinata template pattern: a manifest, workspace constitution files, setup script, secrets, and scheduled tasks.

## Capabilities

- Multi-chain Ankr RPC health checks
- Wallet readiness and airdrop scouting
- Fail-closed flash-loan planning
- Aave V3 `flashLoanSimple` calldata construction
- Route profitability gates for quotes, premium, gas, slippage, and simulation
- Scheduled monitoring tasks that report blockers instead of transacting

## Deployment Shape

1. Deploy this template in Pinata Agents.
2. Add the required `VITE_ANKR_API_KEY` secret.
3. Add optional flash-loan receiver and pool secrets only after they are verified.
4. Configure reviewed routes in `src/config.js`.
5. Let scheduled tasks monitor and summarize. Transactions remain disabled until an executor is intentionally added.

## Safety Model

The agent is autonomous for observation and planning only. Any route without complete receiver, pool, route, quote, gas, slippage, and simulation checks fails closed.
