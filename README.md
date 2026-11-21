# Webstreet

A GeoCities-inspired neighborhood where every house is someone's homepage.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Without Supabase credentials, Webstreet uses browser local storage so it still works offline.

## Accounts and friends on a shared street

1. Create a Supabase project. For a fresh project, run `supabase/schema.sql` in the SQL editor to set up houses. Skip this step if the houses table is already configured.
2. Run `supabase/migrations/20261121000000_accounts_and_friends.sql` once in the SQL editor. It adds profiles and friend requests to the project.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Every deployment used by the group must point to the same Supabase project.
4. In Supabase Authentication, enable email/password sign-in and sign-ups. Set the Site URL and allow your app URLs as redirect URLs for email confirmation, including your Vite URL if testing locally.
5. Restart Vite. Open **Sign in** to create an account. Confirm your email if prompted, then choose a unique username.

Open **Friends** and send a request to another player’s username. The recipient can accept it from **Incoming requests**. Both players will then see each other under **Your friends**. The open Friends panel refreshes automatically.

To check the setup across machines, sign into two accounts in separate browser profiles or on separate devices, send a request from the first account, and accept it from the second.

The app will switch to the shared `houses` table automatically. The schema allows public reads and public house creation for this hackathon prototype.

## Art credits

The street house sprite comes from CraftPix's Main Characters Home Free Top-Down Pixel Art asset pack.
