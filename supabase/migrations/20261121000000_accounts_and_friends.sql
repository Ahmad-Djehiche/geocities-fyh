begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$')
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  check (sender_id <> recipient_id)
);

-- A pair can have at most one request or friendship, even for simultaneous requests.
create unique index friend_requests_pair_idx on public.friend_requests (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id)
);
create index friend_requests_sender_idx on public.friend_requests (sender_id);
create index friend_requests_recipient_idx on public.friend_requests (recipient_id);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;

revoke all on public.profiles, public.friend_requests from public, anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant select, insert, delete, update (status) on public.friend_requests to authenticated;

create policy "Signed-in users can find profiles"
  on public.profiles for select to authenticated using (true);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

create policy "Participants can read their requests"
  on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "Senders can create pending requests"
  on public.friend_requests for insert to authenticated
  with check ((select auth.uid()) = sender_id and status = 'pending');

create policy "Recipients can accept pending requests"
  on public.friend_requests for update to authenticated
  using ((select auth.uid()) = recipient_id and status = 'pending')
  with check ((select auth.uid()) = recipient_id and status = 'accepted');

create policy "Participants can remove their requests or friendships"
  on public.friend_requests for delete to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

commit;
