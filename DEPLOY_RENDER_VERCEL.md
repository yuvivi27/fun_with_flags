# Flags Trivia Online Deployment (Render + Vercel)

This setup makes your API and database public online, so both web and mobile can log in.

## 1) Push your code to GitHub

Render and Vercel both deploy from GitHub.

## 2) Deploy API + Postgres on Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Click **New** -> **Blueprint**.
3. Select your GitHub repo and deploy using `render.yaml`.
4. Wait for both resources:
   - PostgreSQL database: `flags-trivia-db`
   - Web service: `flags-trivia-api`
5. In the API service settings, set:
   - `CORS_ORIGIN=https://<your-vercel-domain>`
     - If you use custom domain, include it too.
     - For multiple origins, comma-separate them.

Render will run:
- build: `pnpm install --frozen-lockfile && pnpm --filter api build`
- start: `pnpm --filter api exec prisma migrate deploy && pnpm --filter api start:prod`

After deploy, copy your public API URL:
- `https://<your-render-api>.onrender.com`

## 3) Deploy web app on Vercel

The repo includes a root [`vercel.json`](./vercel.json) so the install/build/output paths work with **pnpm workspaces** and **`@repo/player-leveling`** (Turbo builds it before Next).

1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project** -> import same repo.
3. Configure:
   - **Root Directory**: `.` (repository root — **not** `apps/web`). If Root Directory is wrong, the deployment usually fails because workspace packages are not installed/built in order.
   - Leave **Build / Output / Install** empty so Vercel uses `vercel.json`, or match it manually:
     - **Install Command**: `corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile`
     - **Build Command**: `pnpm exec turbo run build --filter=web`
     - **Output Directory**: `apps/web/out`
4. Set Environment Variables in Vercel project:
   - `NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com`
   - `NEXT_PUBLIC_FIREBASE_API_KEY=...`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=flags-trivia-app-2026.firebaseapp.com`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=flags-trivia-app-2026`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=flags-trivia-app-2026.firebasestorage.app`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=477584272299`
   - `NEXT_PUBLIC_FIREBASE_APP_ID=1:477584272299:web:c7bf692a51636b7c9500ee`
5. Deploy.

Copy your web URL:
- `https://<your-vercel-web>.vercel.app`

## 4) Update Render CORS with final web domain

In Render API env vars:
- `CORS_ORIGIN=https://<your-vercel-web>.vercel.app`

Redeploy API after updating.

## 5) Rebuild Android app to use public API

Update `apps/web/.env.local`:

`NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com`

Then rebuild and sync:

```bash
pnpm --filter web build:static
pnpm --filter web exec cap sync android
pnpm --filter web exec cap build android
```

Install APK from:
- `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`

## 6) Quick verification

1. Web: sign up/login works on Vercel URL.
2. Mobile APK: sign up/login works.
3. Play one round.
4. Firestore:
   - `players/{userId}` is created/updated.
5. Leaderboard page loads Firestore top players.

## Troubleshooting

- `401` on mobile/web:
  - Check API URL points to Render.
- CORS errors in browser:
  - `CORS_ORIGIN` missing/incorrect on Render.
- Render cold starts (free plan):
  - First request may take longer.
- Firestore permission errors:
  - Ensure deployed rules are active (`firebase deploy --only firestore`).
