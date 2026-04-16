# ListsSync.ai

Local development notes.

## Run with 1Password

This repo is set up to load secrets from the `ListsSync` item in the `Private` 1Password vault using `.env.1password`.

### Prereqs
- 1Password desktop app signed in
- 1Password CLI installed (`op`)
- CLI desktop integration enabled
- A `ListsSync` item exists in the `Private` vault

### Commands

```bash
npm run dev:op
npm run check:op
npm run build:op
npm run start:op
npm run db:push:op
```

## Files

- `.env.example` — placeholder env vars
- `.env.1password` — 1Password secret references (`op://...`)
- `.env` — legacy local env file from earlier setup; avoid relying on it for normal development

## Notes

If 1Password is locked, `op run` will prompt through the desktop app.
