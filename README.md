# Webstreet

A GeoCities-inspired neighborhood where every house is someone's homepage.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Without Supabase credentials, Webstreet uses browser local storage so it still works offline.

## Optional: shared street with Supabase

1. Create a Supabase project.
2. In the Supabase SQL editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the dev server.

The app will switch to the shared `houses` table automatically. The schema allows public reads and public house creation for this hackathon prototype.
