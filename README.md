# Ahmed Goat Farm

Internal dashboard for managing the herd — registry, health & vaccination, breeding, weight tracking, expenses, and sales (₹ INR).

Built with React + Vite + Tailwind CSS, backed by Supabase (Postgres + auth).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough for this scale).
2. Click **New project**. Pick any name (e.g. "ahmed-goat-farm"), set a database password (save it somewhere safe), and choose a region close to India (e.g. Singapore).
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** → **New query**.
2. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) in this repo, paste it in, and click **Run**.
3. This creates all tables (goats, health_records, breeding_records, weight_records, expenses, sales) with row-level security so only signed-in users can read/write data.

## 3. Set up photo storage

1. Still in **SQL Editor** → **New query**, paste the contents of [`supabase/storage_setup.sql`](supabase/storage_setup.sql) and click **Run**.
2. This creates a `goat-photos` storage bucket (public read, signed-in write only, 5 MB limit) so goat photos uploaded from the app have somewhere to live.

## 4. Set up user profiles

1. Still in **SQL Editor** → **New query**, paste the contents of [`supabase/profiles_setup.sql`](supabase/profiles_setup.sql) and click **Run**.
2. This creates a `profiles` table (display name + avatar per user) and an `avatars` storage bucket, so each signed-in user can set their name and photo from the app's profile page.

## 5. Get your API keys

1. In Supabase, go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon / public** key.
3. In this project folder, copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. Fill in the two values:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 6. Create farm staff accounts

There's no public sign-up — an admin creates accounts directly in Supabase:

1. Go to **Authentication** → **Users** → **Add user**.
2. Enter each staff member's email and a temporary password, and check **Auto Confirm User**.
3. Share the email/password with them — they can sign in immediately at the app's `/login` page.

## 7. Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`) and sign in.

## 8. Deploy online

Recommended: [Vercel](https://vercel.com) (free tier).

1. Push this project to a GitHub repo.
2. In Vercel, **New Project** → import the repo (framework preset: Vite).
3. Add the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Vercel gives you a URL staff can open from any device.

## Project structure

```
src/
  components/   Shared UI (layout, modals, forms, tables)
  context/      Auth state
  hooks/        Data-fetching hook for Supabase tables
  lib/          Supabase client, currency/date formatting
  pages/        One page per module (Dashboard, Goats, Health, Breeding, Weight, Expenses, Sales)
supabase/
  schema.sql          Database schema — run once in the Supabase SQL editor
  storage_setup.sql   Goat photo storage bucket — run once in the Supabase SQL editor
  profiles_setup.sql  User profiles table + avatar storage bucket — run once in the Supabase SQL editor
```
