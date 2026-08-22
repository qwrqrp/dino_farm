# DINO FARM — CLEAN START

This is **Stage 1**: a deliberately simple, deploy-first Next.js + TypeScript demo.

## Why this version exists

The first repository mixed Next.js, Prisma, PostgreSQL, Telegram auth, payments and game logic before the first deployment had been proven. This clean version removes database/Prisma/payment dependencies so the first goal is one thing only: **a green Vercel deployment**.

## Included

- Next.js App Router + TypeScript
- mobile-first DINO EGG FARM UI
- Nest screen
- 4×4 merge board
- local demo production
- Coins / DNA demo economy
- deposit calculator (no real payments)
- friends/referral placeholder
- localStorage persistence
- zero environment variables required
- no Prisma / no database / no secrets in Stage 1

## GitHub upload — IMPORTANT

Create a **new empty repository** such as `dino-farm-clean`.

Upload the **contents of this folder directly into the repository root**.

The GitHub root must look like:

```text
package.json
next.config.ts
tsconfig.json
next-env.d.ts
README.md
src/
public/
```

Do NOT upload the containing folder itself and do NOT create paths like:

```text
dino-farm-clean/dino-farm-clean/...
```

## Vercel

Import the new GitHub repository.

Use:

- Framework Preset: `Next.js`
- Root Directory: leave empty / repository root
- Build Command: default
- Install Command: default
- Environment Variables: none for Stage 1

Then Deploy.

## After the first green deployment

Only after Stage 1 works, add features in separate steps:

1. PostgreSQL (Neon/Vercel-compatible provider)
2. Prisma schema + migrations
3. server-authoritative game state and ledger
4. Telegram initData verification
5. admin/config
6. payment provider interfaces
7. deposits/withdrawals only after provider + legal review

This staged approach prevents database, framework and deployment errors from being mixed together.
