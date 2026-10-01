-- Just a Baby → Customer.io sync
--
-- Database triggers write to public.cio_outbox, then poke the `cio-sync` Edge
-- Function, which sends people (attributes) and events to Customer.io's Track
-- API. A pg_cron job retries anything that didn't go through. Nothing here can
-- block or slow an app write: failures are caught and retried later.
--
-- Run after schema.sql. Safe to re-run. See CUSTOMERIO.md for the data dictionary.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ─────────────────────────────────────────────────────────────
-- Outbox (not readable or writable from the app; service role only)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cio_outbox (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('identify','event','delete')),
  user_id     uuid not null,
  name        text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  attempts    int not null default 0,
  claimed_at  timestamptz,
  sent_at     timestamptz,
  last_error  text
);
create index if not exists cio_outbox_pending_idx on public.cio_outbox (id) where sent_at is null;
alter table public.cio_outbox enable row level security;
revoke all on public.cio_outbox from anon, authenticated;

create index if not exists events_created_by_idx on public.events (created_by, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Poke the Edge Function. The anon key is public; the function only ever
-- processes rows already in the outbox, so calling it can't inject data.
-- ─────────────────────────────────────────────────────────────
create or replace function public.cio_kick()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://svxozivzsgckrmglukca.supabase.co/functions/v1/cio-sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eG96aXZ6c2dja3JtZ2x1a2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTQ5ODUsImV4cCI6MjEwNjI5MDk4NX0.vJiQd6Y3L5HNXKsO9lnsVRRtX5Y7pWpK3FEic_3Tv8E'
    ),
    timeout_milliseconds := 10000
  );
exception when others then
  raise warning 'cio_kick failed: %', sqlerrm;
end $$;

create or replace function public.cio_enqueue(p_kind text, p_user uuid, p_name text default null, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  -- attribute refreshes are throttled to one per user per 10 minutes; events and deletes always go
  if p_kind = 'identify' and exists (
    select 1 from public.cio_outbox
    where user_id = p_user and created_at > now() - interval '10 minutes'
      and (sent_at is null or kind in ('identify','event'))
  ) then return; end if;
  insert into public.cio_outbox (kind, user_id, name, data)
  values (p_kind, p_user, p_name, coalesce(p_data, '{}'::jsonb));
  perform public.cio_kick();
exception when others then
  raise warning 'cio_enqueue failed: %', sqlerrm;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Person attributes, computed fresh each time they're sent
-- Timestamps are Unix seconds so Customer.io treats them as dates.
-- ─────────────────────────────────────────────────────────────
create or replace function public.cio_profile(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with u as (
    select id, email, created_at, email_confirmed_at, last_sign_in_at from auth.users where id = p_user
  ), m as (
    select bm.baby_id, bm.role, b.name, b.birth, b.settings
    from public.baby_members bm join public.babies b on b.id = bm.baby_id
    where bm.user_id = p_user order by bm.created_at limit 1
  ), ev as (
    select count(*) as n, min(created_at) as first_at, max(created_at) as last_at
    from public.events where created_by = p_user
  )
  select case when not exists (select 1 from u) then null else jsonb_strip_nulls(jsonb_build_object(
    'email',              (select email from u),
    'created_at',         extract(epoch from (select coalesce(email_confirmed_at, created_at) from u))::bigint,
    'last_sign_in_at',    extract(epoch from (select last_sign_in_at from u))::bigint,
    'babies_count',       (select count(*) from public.baby_members where user_id = p_user),
    'role',               (select role from m),
    'baby_id',            (select baby_id from m),
    'baby_name',          (select name from m),
    'baby_birth_date',    (select birth::text from m),
    'baby_birth_at',      extract(epoch from (select birth from m)::timestamptz)::bigint,
    'caregivers_count',   (select count(*) from public.baby_members where baby_id = (select baby_id from m)),
    'bottle_unit',        (select settings->>'unit' from m),
    'total_logs',         (select n from ev),
    'logs_last_7_days',   (select count(*) from public.events where created_by = p_user and created_at > now() - interval '7 days'),
    'first_logged_at',    extract(epoch from (select first_at from ev))::bigint,
    'last_logged_at',     extract(epoch from (select last_at from ev))::bigint,
    'app',                'just-a-baby'
  )) end;
$$;

-- Claim a batch for sending (skip rows another run is working on)
create or replace function public.cio_claim(p_limit int default 50)
returns setof public.cio_outbox language sql security definer set search_path = public as $$
  update public.cio_outbox o set claimed_at = now(), attempts = o.attempts + 1
  where o.id in (
    select id from public.cio_outbox
    where sent_at is null and attempts < 8
      and (claimed_at is null or claimed_at < now() - interval '2 minutes')
    order by id limit p_limit
    for update skip locked
  )
  returning o.*;
$$;

create or replace function public.cio_done(p_id bigint, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update public.cio_outbox
  set sent_at = case when p_error is null then now() end,
      last_error = p_error  -- claimed_at stays set, so a failed row waits 2 minutes before its next try
  where id = p_id;
$$;

revoke all on function public.cio_kick() from public, anon, authenticated;
revoke all on function public.cio_enqueue(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.cio_profile(uuid) from public, anon, authenticated;
revoke all on function public.cio_claim(int) from public, anon, authenticated;
revoke all on function public.cio_done(bigint, text) from public, anon, authenticated;
grant execute on function public.cio_profile(uuid) to service_role;
grant execute on function public.cio_claim(int) to service_role;
grant execute on function public.cio_done(bigint, text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- Accounts: signed_up when the email is first confirmed; delete from Customer.io when the account goes
create or replace function public.cio_on_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.cio_enqueue('delete', old.id);
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.email_confirmed_at is not null then
      perform public.cio_enqueue('event', new.id, 'signed_up', '{}'::jsonb);
    end if;
  elsif old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.cio_enqueue('event', new.id, 'signed_up', '{}'::jsonb);
  elsif new.email is distinct from old.email or new.last_sign_in_at is distinct from old.last_sign_in_at then
    perform public.cio_enqueue('identify', new.id);
  end if;
  return new;
end $$;
drop trigger if exists cio_users on auth.users;
create trigger cio_users after insert or update or delete on auth.users
  for each row execute function public.cio_on_user();

-- Membership: baby_created / joined_as_caregiver, and tell owners when a caregiver joins
create or replace function public.cio_on_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare b public.babies; o record;
begin
  if tg_op = 'INSERT' then
    select * into b from public.babies where id = new.baby_id;
    if new.role = 'owner' then
      perform public.cio_enqueue('event', new.user_id, 'baby_created',
        jsonb_strip_nulls(jsonb_build_object('baby_id', b.id, 'baby_name', b.name, 'baby_birth_date', b.birth::text)));
    else
      perform public.cio_enqueue('event', new.user_id, 'joined_as_caregiver',
        jsonb_build_object('baby_id', b.id, 'baby_name', b.name));
      for o in select user_id from public.baby_members where baby_id = new.baby_id and role = 'owner' and user_id <> new.user_id loop
        perform public.cio_enqueue('event', o.user_id, 'caregiver_joined',
          jsonb_build_object('baby_id', b.id, 'baby_name', b.name));
      end loop;
    end if;
    return new;
  else
    perform public.cio_enqueue('identify', old.user_id);
    return old;
  end if;
end $$;
drop trigger if exists cio_members on public.baby_members;
create trigger cio_members after insert or delete on public.baby_members
  for each row execute function public.cio_on_member();

-- Renaming a baby or adding a birthday refreshes everyone who cares for them
create or replace function public.cio_on_baby()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.name is distinct from old.name or new.birth is distinct from old.birth
     or (new.settings->>'unit') is distinct from (old.settings->>'unit') then
    for r in select user_id from public.baby_members where baby_id = new.id loop
      perform public.cio_enqueue('event', r.user_id, 'baby_updated',
        jsonb_strip_nulls(jsonb_build_object('baby_id', new.id, 'baby_name', new.name, 'baby_birth_date', new.birth::text)));
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists cio_babies on public.babies;
create trigger cio_babies after update on public.babies
  for each row execute function public.cio_on_baby();

-- Invites
create or replace function public.cio_on_invite()
returns trigger language plpgsql security definer set search_path = public as $$
declare b public.babies;
begin
  select * into b from public.babies where id = new.baby_id;
  perform public.cio_enqueue('event', new.created_by, 'caregiver_invited',
    jsonb_build_object('baby_id', b.id, 'baby_name', b.name, 'expires_at', extract(epoch from new.expires_at)::bigint));
  return new;
end $$;
drop trigger if exists cio_invites on public.invites;
create trigger cio_invites after insert on public.invites
  for each row execute function public.cio_on_invite();

-- Logging: first_log and milestones as events; otherwise a (throttled) attribute refresh.
-- Individual feeds, naps and diapers are NOT sent: only counts and timestamps.
create or replace function public.cio_on_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare n bigint; b public.babies;
begin
  if new.created_by is null then return new; end if;
  select count(*) into n from public.events where created_by = new.created_by;
  if n = 1 then
    select * into b from public.babies where id = new.baby_id;
    perform public.cio_enqueue('event', new.created_by, 'first_log',
      jsonb_build_object('log_type', new.type, 'baby_id', b.id, 'baby_name', b.name));
  elsif n in (10, 25, 50, 100, 250, 500, 1000, 2500, 5000) then
    perform public.cio_enqueue('event', new.created_by, 'log_milestone', jsonb_build_object('total_logs', n));
  else
    perform public.cio_enqueue('identify', new.created_by);
  end if;
  return new;
end $$;
drop trigger if exists cio_events on public.events;
create trigger cio_events after insert on public.events
  for each row execute function public.cio_on_event();

-- ─────────────────────────────────────────────────────────────
-- Retries and housekeeping
-- ─────────────────────────────────────────────────────────────
create or replace function public.cio_retry()
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.cio_outbox where sent_at is null and attempts < 8 and created_at < now() - interval '1 minute') then
    perform public.cio_kick();
  end if;
  delete from public.cio_outbox where sent_at is not null and sent_at < now() - interval '30 days';
end $$;
revoke all on function public.cio_retry() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('cio-sync-retry');
exception when others then null;
end $$;
select cron.schedule('cio-sync-retry', '*/2 * * * *', $$select public.cio_retry()$$);

-- Trigger functions are only ever called by their triggers
revoke all on function public.cio_on_user() from public, anon, authenticated;
revoke all on function public.cio_on_member() from public, anon, authenticated;
revoke all on function public.cio_on_baby() from public, anon, authenticated;
revoke all on function public.cio_on_invite() from public, anon, authenticated;
revoke all on function public.cio_on_event() from public, anon, authenticated;
