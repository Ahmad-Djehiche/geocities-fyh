begin;

lock table public.houses in access exclusive mode;
alter table public.houses add column if not exists plot_id integer;

-- Keep the earliest house on each valid plot and assign the rest to vacancies.
with ranked_houses as (
  select id, plot_id, row_number() over (partition by plot_id order by created_at, id) as plot_rank
  from public.houses
),
unplaced_houses as (
  select id, row_number() over (order by plot_id, plot_rank, id) as vacancy_rank
  from ranked_houses
  where plot_id is null or plot_id < 1 or plot_rank > 1
),
vacancies as (
  select candidate, row_number() over (order by candidate) as vacancy_rank
  from generate_series(1, (select count(*)::integer from public.houses)) as plots(candidate)
  where not exists (
    select 1 from ranked_houses where plot_id = candidate and plot_rank = 1
  )
)
update public.houses as house
set plot_id = vacancies.candidate
from unplaced_houses
join vacancies using (vacancy_rank)
where house.id = unplaced_houses.id;

alter table public.houses
  alter column plot_id drop default,
  alter column plot_id set not null,
  add constraint houses_plot_id_positive check (plot_id > 0),
  add constraint houses_plot_id_unique unique (plot_id);

create function public.assign_house_plot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- Players can choose one of the four plots visible on the street map.
  preferred_plot integer := case when new.plot_id between 1 and 4 then new.plot_id end;
begin
  -- Serialize claims so two builders checking the same vacancy get different plots.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('public.houses.plot_id', 0));

  select candidate into new.plot_id
  from pg_catalog.generate_series(
    1, greatest(4, (select count(*)::integer + 1 from public.houses))
  ) as plots(candidate)
  where not exists (select 1 from public.houses where plot_id = candidate)
  order by candidate is distinct from preferred_plot, candidate
  limit 1;

  return new;
end;
$$;

create trigger assign_house_plot
  before insert on public.houses
  for each row execute function public.assign_house_plot();

commit;
