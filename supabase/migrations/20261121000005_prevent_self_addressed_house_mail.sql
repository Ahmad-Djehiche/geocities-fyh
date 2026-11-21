begin;

create or replace function public.send_house_message(message_id uuid, target_house_id uuid, message_body text)
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
    and house_id = target_house_id and body = cleaned_body and recipient_id <> sender) then
    return;
  end if;

  select owner_id into recipient from public.houses where id = target_house_id for share;
  if recipient is null then
    raise exception 'This mailbox has no account owner.';
  end if;
  if recipient = sender then
    raise exception 'You cannot send mail to yourself.' using errcode = '22023';
  end if;

  select username into sender_label from public.profiles where id = sender;
  insert into public.house_messages (id, house_id, recipient_id, sender_id, sender_name, body)
  values (message_id, target_house_id, recipient, sender, coalesce(sender_label, 'Webstreet neighbor'), cleaned_body)
  on conflict (id) do nothing;

  if not exists (select 1 from public.house_messages where id = message_id and sender_id = sender
    and house_id = target_house_id and body = cleaned_body and recipient_id <> sender) then
    raise exception 'This message ID is already in use.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
