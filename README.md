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

Before deploying, apply any pending migrations from `supabase/migrations` in filename order. The plot migration moves duplicate plot claims to vacant plots. `20261121000002_customize_owned_houses.sql` adds house ownership and optional links. Houses created before ownership was recorded stay visible as unowned houses.

Sign in and choose a vacant lot or use **Build a house** to take the first open plot. Pick a house colour and optionally add a personal website and a GitHub URL. Each account can build one house. After building, the top button and vacant plots open **Add a friend**.

If another player claims the selected lot first, the database places the house on the next available plot. Open shared streets refresh automatically. The street opens two more plots to the north once four houses are occupied and adds another pair at each later even milestone. Apply `supabase/migrations/20261121000004_expand_plot_allocation.sql` to let shared builders claim a specific unlocked northern plot.

Open **Friends** and send a request to another player’s username. The recipient can accept it from **Incoming requests**. Both players will then see each other under **Your friends**. The open Friends panel refreshes automatically.

To check the setup across machines, sign into two accounts in separate browser profiles or on separate devices, send a request from the first account, and accept it from the second.

Visitors can view houses on the shared street. Local preview allows one custom house per browser and keeps it in local storage.

## House mail

Apply the migrations in order, including `20261121000002_customize_owned_houses.sql` and `20261121000003_house_messages.sql`. The latter creates the private inbox and enables Supabase Realtime updates. The app also refreshes the inbox periodically to catch deliveries after a disconnect.

On the shared street, sign in and walk to another player's mailbox. Send a letter to launch the pig from that mailbox. The recipient can read it from **Inbox** or their own mailbox. When the recipient's house is on screen, the pig descends to its mailbox. Houses created before account ownership need an assigned owner to receive mail.

## Art credits

The street house sprite comes from CraftPix's Main Characters Home Free Top-Down Pixel Art asset pack.
