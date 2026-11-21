begin;

create or replace function public.assign_house_plot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  occupied_count bigint;
  highest_plot integer;
  visible_plot_limit bigint;
begin
  -- Keep simultaneous claims from selecting the same vacancy.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('public.houses.plot_id', 0));

  select count(*), coalesce(max(plot_id), 0) into occupied_count, highest_plot
  from public.houses;

  -- Match the street: four base plots, then two more at 4, 6, 8, and so on.
  -- Keep the full pair around existing northern houses even if there are gaps.
  visible_plot_limit := greatest(
    case when occupied_count < 4 then 4 else 6 + 2 * ((occupied_count - 4) / 2) end,
    4 + 2 * greatest(0, (highest_plot::bigint - 3) / 2)
  );

  if new.plot_id between 1 and visible_plot_limit and not exists (
    select 1 from public.houses where plot_id = new.plot_id
  ) then
    return new;
  end if;

  -- Among the first N + 1 plots at least one is vacant for N houses.
  select candidate into new.plot_id
  from pg_catalog.generate_series(1, occupied_count + 1) as plots(candidate)
  where not exists (select 1 from public.houses where plot_id = candidate)
  order by candidate
  limit 1;

  return new;
end;
$$;

commit;
