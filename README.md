# Flags Trivia

Monorepo: **web** (Next.js + static export for web/Capacitor), **api** (NestJS + Prisma + PostgreSQL), and shared **packages** (`@repo/eslint-config`, `@repo/typescript-config`, `@repo/player-leveling`).

## Setup

```sh
pnpm install
```

**Local API database (optional):** from the repo root, `docker compose up -d` starts PostgreSQL (see `docker-compose.yml`).

## Scripts (root)

| Command | Description |
|--------|-------------|
| `pnpm dev` | Next app on port 3000 |
| `pnpm dev:all` | All apps via Turbo |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` / `pnpm check-types` | Lint and typecheck |

**Web** (`apps/web`): `pnpm --filter web dev`, `flags:build-db`, Capacitor Android under `android/`.

**API** (`apps/api`): `pnpm --filter api start:dev`, Prisma in `prisma/`.

## Deploy

See [DEPLOY_RENDER_VERCEL.md](./DEPLOY_RENDER_VERCEL.md) for Render (API + DB) and Vercel (static web).

## Remote cache (optional)

[Turborepo remote caching](https://turborepo.dev/docs/core-concepts/remote-caching): `turbo login` and `turbo link` if you use a Vercel account for shared build cache.
