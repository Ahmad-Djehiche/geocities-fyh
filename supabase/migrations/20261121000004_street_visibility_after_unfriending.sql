begin;

-- Keep the pair when an accepted request is deleted so both streets remember the removal.
create table public.friendship_history (
  first_user_id uuid not null references public.profiles (id) on delete cascade,
  second_user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (first_user_id, second_user_id),
  check (first_user_id < second_user_id)
);
create index friendship_history_second_user_idx on public.friendship_history (second_user_id);

alter table public.friendship_history enable row level security;
revoke all on public.friendship_history from public, anon, authenticated;
grant select on public.friendship_history to authenticated;
create policy "Participants can read their friendship history"
  on public.friendship_history for select to authenticated
  using ((select auth.uid()) in (first_user_id, second_user_id));

create function public.remember_accepted_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.friendship_history (first_user_id, second_user_id)
    values (least(new.sender_id, new.recipient_id), greatest(new.sender_id, new.recipient_id))
    on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.remember_accepted_friendship() from public, anon, authenticated;

create trigger remember_accepted_friendship
  after insert or update of status on public.friend_requests
  for each row when (new.status = 'accepted')
  execute function public.remember_accepted_friendship();

insert into public.friendship_history (first_user_id, second_user_id)
  select least(sender_id, recipient_id), greatest(sender_id, recipient_id)
  from public.friend_requests where status = 'accepted'
  on conflict do nothing;

create view public.visible_street_houses with (security_invoker = true) as
  with former_friends as (
    select case when pair.first_user_id = (select auth.uid())
      then pair.second_user_id else pair.first_user_id end as friend_id
    from public.friendship_history pair
    where (select auth.uid()) in (pair.first_user_id, pair.second_user_id)
      and not exists (
        select 1 from public.friend_requests request
        where request.status = 'accepted'
          and least(request.sender_id, request.recipient_id) = pair.first_user_id
          and greatest(request.sender_id, request.recipient_id) = pair.second_user_id
      )
  )
  select houses.* from public.houses
  where not exists (select 1 from former_friends where friend_id = houses.owner_id);

revoke all on public.visible_street_houses from public, anon, authenticated;
grant select on public.visible_street_houses to authenticated;

commit;
