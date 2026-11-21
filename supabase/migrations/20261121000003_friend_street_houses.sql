begin;

create view public.friend_street_houses with (security_invoker = true) as
select house.*
from public.houses as house
where house.owner_id is null
   or house.owner_id = (select auth.uid())
   or exists (
     select 1
     from public.friend_requests as friendship
     where friendship.status = 'accepted'
       and (
         (friendship.sender_id = (select auth.uid()) and friendship.recipient_id = house.owner_id)
         or (friendship.recipient_id = (select auth.uid()) and friendship.sender_id = house.owner_id)
       )
   );

revoke all on public.friend_street_houses from public, anon, authenticated;
grant select on public.friend_street_houses to authenticated;

commit;
