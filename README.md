# WebStreet 🏡

**A GeoCities-inspired pixel-art neighbourhood where every house is someone's homepage.**

Built at **FirstYearHack 2026** for the **Old Tech, New Tricks** track.

[🎮 **Play WebStreet**](https://ahmad-djehiche.github.io/geocities-fyh/) · [Source code](https://github.com/Ahmad-Djehiche/geocities-fyh)

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white) ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=flat-square&logo=github&logoColor=white)

## The idea

GeoCities made the early web feel personal: people created their own homepages and explored online neighbourhoods. For FirstYearHack, we reimagined that experience as a walkable pixel-art street where **your homepage is a house and your friends are your neighbours**.

## Try it

**[Open the live demo →](https://ahmad-djehiche.github.io/geocities-fyh/)**

Explore the neighbourhood, visit houses and try the interactive features. A gameplay recording or screenshots can be added here to give visitors a preview without leaving GitHub.

## Features

- **Explore:** use **WASD** or the **arrow keys** to move, and **E** to interact.
- **Build a house:** create an account, claim a plot, choose a house colour, write an introduction and link your website or GitHub.
- **Visit homepages:** walk to neighbours' houses to see their pages.
- **Make friends:** send requests by username and add friends' houses to your street.
- **Send letters:** use a neighbour's mailbox to send a private message, delivered by a flying pixel-art pig.
- **Expand the street:** the neighbourhood starts with four plots and grows as more friends and houses are added.
- **Avoid plot conflicts:** when two users select the same plot, the database assigns the second house to the next vacant plot.

## Tech stack

| Category | Technology | Purpose |
| --- | --- | --- |
| Frontend | JavaScript, React | Interactive UI and neighbourhood |
| Development/build | Vite | Local dev server and production builds |
| Authentication/database | Supabase | Accounts and shared application data |
| Deployment | GitHub Actions, GitHub Pages | Build and hosting |
| Linting | Oxlint | Code checks |

## Getting started

**Prerequisites:** Node.js and npm (use a Node version supported by the installed Vite version). A Supabase project is needed for online account and social features.

```bash
git clone https://github.com/Ahmad-Djehiche/geocities-fyh.git
cd geocities-fyh
npm install
```

To configure online features, copy `.env.example` to `.env.local` and supply your own Supabase project settings:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-client-key
```

On macOS/Linux, copy with `cp .env.example .env.local`; on Windows Command Prompt, use `copy .env.example .env.local`.

**Important:** Only put a public Supabase client key in `VITE_` variables; these values are exposed to the browser. Never use a service-role key or database password. The Supabase database schema and access policies must also be configured for full online functionality. The app includes a local browser-based house preview that can be explored without Supabase.

Start the development server:

```bash
npm run dev
```

Open the URL shown by Vite. To check the code or preview a production build:

```bash
npm run lint
npm run build
npm run preview
```

## How we built it

We used React and Vite for the browser game, Supabase for authentication and shared data, and GitHub Actions and GitHub Pages to publish the website. Players can build homepages, explore friends' houses and send messages through mailboxes.

## Future improvements

- Improve mobile touch controls and accessibility.
- Add more house and homepage customisation.
- Add more scenery and interactive neighbourhood features.
- Introduce automated tests for gameplay and social interactions.

## Credits

Built as a team project at **FirstYearHack 2026**. Teammates and individual contributions can be credited here with their agreement.

House sprite artwork: **CraftPix — Main Characters Home Free Top-Down Pixel Art pack** (subject to the creator's asset licence).
