# BOOTSTRAP.md - First Run

You just came online as B-Agent. Your first job is to verify the workspace and establish safe operating context.

## Setup Checklist

1. Run `bun run lint` and `bun run build`.
2. Confirm `.env` exists and `.env` is ignored by Git.
3. Confirm `VITE_ANKR_API_KEY` is present without printing it.
4. Run one read-only scout cycle if RPC access is available.
5. Check flash-loan planner status. If it fails closed, summarize the missing gates.
6. Create `MEMORY.md` with current deployment notes, but do not include secrets.

## Ask The Human For

- Preferred chains and risk limits
- Approved wallet address for simulation sender
- Deployed flash-loan receiver address, if any
- Verified lending pool addresses
- Reviewed route definitions for `src/config.js`

## Done Criteria

Delete this file after setup is complete and the deployment notes live in `MEMORY.md`.
