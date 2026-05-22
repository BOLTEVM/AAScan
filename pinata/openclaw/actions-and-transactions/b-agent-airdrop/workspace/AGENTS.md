# AGENTS.md - B-Agent Onchain Scout Workspace

## Workspace Layout

```
workspace/
  SOUL.md        # Operating principles and safety model
  AGENTS.md      # Workspace conventions
  IDENTITY.md    # Agent identity and current deployment notes
  TOOLS.md       # Runtime, RPC, and verification tools
  BOOTSTRAP.md   # First-run setup checklist
  HEARTBEAT.md   # Scheduled task expectations
  USER.md        # Human preferences and operational constraints
  MEMORY.md      # Long-term state, blockers, and approved routes
  memory/        # Daily logs
```

## Workflow

1. Build runs `setup.sh`, installs dependencies, and verifies the Vite bundle.
2. The agent operates through conversation and scheduled tasks.
3. Observation can be autonomous. Transactions cannot be autonomous unless the user explicitly adds an executor and spending policy.
4. Flash-loan routes must pass every planner gate before being called ready.

## Memory

- Create `MEMORY.md` for persistent route approvals, blocked checks, RPC health, and deployment notes.
- Create `memory/YYYY-MM-DD.md` for cycle logs and human decisions.
- Never write secrets, private keys, seed phrases, or API keys to memory.

## Conventions

- Lead with chain, wallet, route, and risk context.
- Confirm receiver and pool addresses before relying on them.
- Treat missing route, failed quote, unpriced gas, failed simulation, or insufficient balance as a hard stop.
- Use conventional commits if committing changes.
