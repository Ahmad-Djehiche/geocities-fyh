create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  description text not null default '',
  color text not null default '#ff70a6',
  style text not null default 'pixel',
  created_at timestamptz not null default now()
);

alter table public.houses enable row level security;

create policy "Houses are publicly readable"
  on public.houses for select using (true);

create policy "Anyone can add a house"
  on public.houses for insert with check (true);
