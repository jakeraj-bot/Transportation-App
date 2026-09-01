# Passaic County Transportation Review App

Internal web app for the Passaic County Superintendent transportation office. Staff enter contracts, route descriptions, bid specs, emergency quotes, and annual certification **status**; print folder tabs and labels; fill approve/disapprove letters; send PT-4s from Outlook; and keep one insurance certificate per contractor per district.

Do **not** upload annual-cert driver packets (they contain SSNs).

## Run it

```bash
npm install
npx prisma db push
npm run db:seed:demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On your computer this is a **demo** with sample contracts and staff so you can click around.

Demo sign-in (password for all is `Passaic2026!`):

- `jjacobs@doe.nj.gov` — Super Admin
- `tanisha@passaic.nj.us` — reviewer
- `mary@passaic.nj.us` — intake
- `debby@passaic.nj.us` — office manager

When you deploy the live office site, use a new empty database and run `npm run db:seed:empty` (or seed with `SEED_DEMO=0` / `NODE_ENV=production`). That keeps statuses, districts, and your login, but does **not** copy the sample packets. Do not upload the local `prisma/dev.db` file to production.

## Optional connections

Put these in `.env`:

- `OPENAI_API_KEY` — fuller NJ-code answers and bid-spec reading
- `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOX` — send PT-4 and follow-up email from the county Outlook mailbox (county IT registers an Azure app with application Mail.Send)

Without Outlook, emails are saved as drafts and the Word/PDF files still download.

## Production (Vercel + Supabase Postgres)

Do **not** upload `prisma/dev.db`. Vercel’s disk is ephemeral — a SQLite *file* there will vanish. Production data lives in **your Supabase Postgres** project, so contracts, users, insurance, and the rest survive deploys and sleeps.

Localhost still uses SQLite (`prisma/schema.prisma` + `file:./dev.db`). Vercel uses `prisma/schema.postgres.prisma`.

Empty office only: `SEED_DEMO=0` so `shouldSeedDemo()` is false. That seeds statuses, districts, checklists, settings, and the office login — no sample packets, no Garden State Bus, no Tanisha/Mary/Debby.

Vercel env vars (Production):

- `DATABASE_URL` — Supabase **Transaction pooler** URI (`postgres://...`, port **6543**, add `?pgbouncer=true`). Never `file:`.
- `DIRECT_URL` — Supabase **Session pooler** or **direct** URI (port **5432**). Used for `prisma db push`.
- `AUTH_SECRET` — strong random secret
- `SEED_DEMO=0`

Office sign-in after empty seed: `jjacobs@doe.nj.gov` / `Passaic2026!` — change that password after first login.

### Dashboard steps

1. [Supabase](https://supabase.com/dashboard) → **New project** (empty) named e.g. `passaic-transport`. Save the database password.
2. Project **Settings → Database → Connection string → URI**.
   - **Transaction pooler** → Vercel `DATABASE_URL` (append `?pgbouncer=true` if it is not already there).
   - **Session pooler** (or Direct) → Vercel `DIRECT_URL`.
   - Use the database connection URI, **not** the `anon` / `service_role` API keys.
3. [Vercel](https://vercel.com) → **Add New… → Project** → import this app (or `npx vercel login` then `npx vercel --prod`).
4. Open [Vercel → transportation-app](https://vercel.com/yea14/transportation-app) → **Settings** → **Environment Variables**. Add all four for **Production** (enable them for the build):
   - `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SEED_DEMO` = `0`
   - The two URLs must start with `postgres://` or `postgresql://`. If you see `file:./dev.db`, that is the local demo value — do not use it on Vercel.
5. **Deployments** → newest commit → **Redeploy** with **Use existing Build Cache** turned **off**. `vercel-build` runs `node scripts/vercel-db-setup.cjs`, then `next build`. If it fails, the log line starting with `Error:` says which env var to fix.

`npm run build` locally still uses SQLite generate only. It does not write to Supabase.

## Letters

Upload your Word templates in Settings. Merge fields: `{district}`, `{contractor}`, `{vendorCode}`, `{letterDate}`, `{schoolYear}`, `{multiContractNumber}`, `{routes}`, `{type}`, `{decision}`, `{notes}`, `{missingItems}`.
