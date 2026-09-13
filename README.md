# Bharat Goat Farm (Geedgarh)

Farm management dashboard for the herd: goat registry with lineage and photos, health & vaccination, breeding, weight tracking, milk production, expenses, sales, and printable reports with CSV export (₹ INR).

Built with React + Vite + Tailwind CSS, backed by Supabase (Postgres, auth, storage).

## Features

- **Dashboard** — active herd, health and kidding due dates, milk and net income this month, income vs expenses chart, herd by breed, quick actions.
- **Goats** — searchable, paginated registry with auto-numbered tags (`BGF-001`, `BGF-002`, …), photos, and a profile page per goat: timeline, growth chart, health, breeding, milk, offspring.
- **Health & Vaccination** — records with next-due dates, overdue highlighting, filter by type or goat.
- **Breeding** — matings with the expected kidding date calculated automatically (~150 days), outcomes and litter size.
- **Weight Tracking** — weigh-ins with a growth chart per goat.
- **Milk Production** — record a whole milking session (morning/evening) for all does on one screen; daily totals, per-doe ranking.
- **Expenses & Sales** — date-range filters, category/type breakdowns; recording a goat sale can mark the goat as sold.
- **Reports** — profit & loss by month for any period, expense and income breakdowns, herd summary, print, and CSV downloads of every record type.
- **Notifications** — a bell in the header for vaccinations/treatments due within 7 days or overdue, kiddings due within 14 days, and active goats not weighed in 60 days. Alerts clear themselves once the record is updated; each user can dismiss them.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (the free tier is enough).
2. Click **New project**, pick a name, set a database password (save it somewhere safe), and choose a region close to India (e.g. Mumbai or Singapore).
3. Wait a couple of minutes for it to finish provisioning.

> **Free projects pause after about a week without activity.** If the app suddenly can't sign in, open the Supabase dashboard and click **Restore project**.

## 2. Set up the database

In your Supabase project open **SQL Editor → New query**, then paste and **Run** each of these files from the `supabase/` folder, in order:

| File | What it does |
|------|--------------|
| [`schema.sql`](supabase/schema.sql) | Core tables (goats, health, breeding, weight, expenses, sales) with row-level security |
| [`storage_setup.sql`](supabase/storage_setup.sql) | `goat-photos` storage bucket |
| [`profiles_setup.sql`](supabase/profiles_setup.sql) | User profiles (name + photo) and the `avatars` bucket |
| [`upgrade_v2.sql`](supabase/upgrade_v2.sql) | Milk production table, reporting functions, and performance indexes |
| [`upgrade_v3.sql`](supabase/upgrade_v3.sql) | Notifications feed and per-user dismissals |

`storage_setup.sql`, `profiles_setup.sql`, `upgrade_v2.sql` and `upgrade_v3.sql` are safe to run again. If a page shows *"Database update needed"*, run the upgrade files.

## 3. Add your API keys

1. In Supabase, go to **Project Settings → API** and copy the **Project URL** and the **anon / public** key.
2. In this folder, copy `.env.example` to `.env` and fill them in:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 4. Create staff accounts

There's no public sign-up — an admin creates accounts in Supabase:

1. **Authentication → Users → Add user**.
2. Enter the email and a temporary password, and tick **Auto Confirm User**.
3. Staff can change their password from their **Profile** page after signing in.

## 5. Run it locally

```bash
npm install
npm run dev
```

Open the local URL it prints (usually `http://localhost:5173`).

## 6. Deploy

The app is set up for [Vercel](https://vercel.com): import the GitHub repo (framework preset: Vite), add the two `VITE_SUPABASE_*` environment variables, and deploy. `vercel.json` makes direct links like `/goats` work.

## Project structure

```
src/
  components/   Shared UI — layout, tables, forms, modals, charts
  context/      Auth and toast notifications
  hooks/        Data fetching, server-side pagination, goat picker options
  lib/          Supabase client, dates, formatting, CSV export
  pages/        One page per section
supabase/       SQL to run in the Supabase SQL Editor
```
