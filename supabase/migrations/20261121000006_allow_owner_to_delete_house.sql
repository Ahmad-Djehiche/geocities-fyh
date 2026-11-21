begin;

grant delete on public.houses to authenticated;

create policy "Owners can delete their own house"
  on public.houses for delete to authenticated
  using (owner_id = (select auth.uid()));

commit;
