begin;

-- Allow the owner to update their own house.
create policy "Owners can update their own house"
  on public.houses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

commit;
