begin;

create table public.house_messages (
  id uuid primary key,
  house_id uuid references public.houses (id) on delete set null,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index house_messages_inbox_idx
  on public.house_messages (recipient_id, created_at desc, id desc);

alter table public.house_messages enable row level security;
revoke all on public.house_messages from public, anon, authenticated;
grant select on public.house_messages to authenticated;

create policy "Recipients can read their house mail"
  on public.house_messages for select to authenticated
  using (recipient_id = (select auth.uid()));

create function public.send_house_message(message_id uuid, target_house_id uuid, message_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender uuid := auth.uid();
  recipient uuid;
  sender_label text;
  cleaned_body text := pg_catalog.regexp_replace(message_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
begin
  if sender is null then
    raise exception 'Sign in to send mail.';
  end if;
  if message_id is null or cleaned_body is null or pg_catalog.char_length(cleaned_body) not between 1 and 280 then
    raise exception 'Enter a message between 1 and 280 characters.';
  end if;

  -- Reusing the same ID after an ambiguous network failure must not deliver twice.
  if exists (select 1 from public.house_messages where id = message_id and sender_id = sender
    and house_id = target_house_id and body = cleaned_body) then
    return;
  end if;

  select owner_id into recipient from public.houses where id = target_house_id for share;
  if recipient is null then
    raise exception 'This mailbox has no account owner.';
  end if;

  select username into sender_label from public.profiles where id = sender;
  insert into public.house_messages (id, house_id, recipient_id, sender_id, sender_name, body)
  values (message_id, target_house_id, recipient, sender, coalesce(sender_label, 'Webstreet neighbor'), cleaned_body)
  on conflict (id) do nothing;

  if not exists (select 1 from public.house_messages where id = message_id and sender_id = sender
    and house_id = target_house_id and body = cleaned_body) then
    raise exception 'This message ID is already in use.';
  end if;
end;
$$;

create function public.read_house_message(message_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.house_messages set read_at = now()
  where id = message_id and recipient_id = (select auth.uid()) and read_at is null;
$$;

revoke all on function public.send_house_message(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.read_house_message(uuid) from public, anon, authenticated;
grant execute on function public.send_house_message(uuid, uuid, text) to authenticated;
grant execute on function public.read_house_message(uuid) to authenticated;

alter publication supabase_realtime add table public.house_messages;

commit;
