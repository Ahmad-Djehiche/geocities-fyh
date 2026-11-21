begin;

-- Existing houses have no recorded owner. Preserve them and assign owners to new builds.
alter table public.houses
  add column owner_id uuid references auth.users (id) on delete set null,
  add column website_url text,
  add column github_url text;

alter table public.houses
  alter column owner_id set default auth.uid(),
  add constraint houses_one_per_account unique (owner_id),
  add constraint houses_website_url_valid check (
    website_url is null or (
      char_length(website_url) <= 2048
      and website_url !~ '[[:space:][:cntrl:]]'
      and strpos(website_url, chr(92)) = 0
      and website_url ~* '^https?://[^/?#@]+([/?#]|$)'
    )
  ),
  add constraint houses_github_url_valid check (
    github_url is null or (
      char_length(github_url) <= 2048
      and github_url !~ '[[:space:][:cntrl:]]'
      and strpos(github_url, chr(92)) = 0
      and github_url ~* '^https://(www[.])?github[.]com/[^/?#]+'
    )
  );

drop policy if exists "Anyone can add a house" on public.houses;
revoke insert on public.houses from public, anon;
grant insert on public.houses to authenticated;

create policy "Accounts can build their own house"
  on public.houses for insert to authenticated
  with check (owner_id = (select auth.uid()));

commit;
