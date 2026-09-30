-- Just a Baby: database schema for Supabase (Postgres)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to re-run: every object is created with IF NOT EXISTS or CREATE OR REPLACE.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- A baby is the thing everything hangs off. Settings and avatar look are JSON
-- so the app can add options without a migration.
create table if not exists public.babies (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default 'Baby' check (char_length(name) between 1 and 40),
  birth       date,
  settings    jsonb not null default '{}'::jsonb,   -- unit, feedH, wakeH, diaperH, playH, sound, lastAmount
  look        jsonb not null default '{}'::jsonb,   -- skin, hair, hairColor, eyes, outfit, style, paci
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Who can see and log for a baby. The creator is the owner; invited people are caregivers.
create table if not exists public.baby_members (
  baby_id     uuid not null references public.babies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'caregiver' check (role in ('owner','caregiver')),
  created_at  timestamptz not null default now(),
  primary key (baby_id, user_id)
);
create index if not exists baby_members_user_idx on public.baby_members(user_id);

-- One row per logged thing. `id` is generated on the device so a log can be
-- written optimistically and retried without creating duplicates.
create table if not exists public.events (
  id          text primary key check (char_length(id) between 6 and 40),
  baby_id     uuid not null references public.babies(id) on delete cascade,
  type        text not null check (type in ('feed','sleep','diaper','play','bath')),
  t           timestamptz not null,                 -- start time
  end_t       timestamptz,                          -- sleep only; null while asleep
  sub         text check (sub is null or char_length(sub) <= 20),
  amount      numeric check (amount is null or (amount >= 0 and amount <= 1000)),  -- ml
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists events_baby_t_idx on public.events(baby_id, t desc);

-- Invite links for a second caregiver. Single use, expire after 7 days.
create table if not exists public.invites (
  code        text primary key default replace(gen_random_uuid()::text, '-', ''),
  baby_id     uuid not null references public.babies(id) on delete cascade,
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users(id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

-- True when the signed-in user belongs to this baby. SECURITY DEFINER so the
-- policies below can call it without recursing into baby_members' own policy.
create or replace function public.is_member(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.baby_members where baby_id = b and user_id = auth.uid());
$$;

create or replace function public.is_owner(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.baby_members where baby_id = b and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists babies_touch on public.babies;
create trigger babies_touch before update on public.babies
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row-level security: nobody reads or writes anything they aren't a member of
-- ─────────────────────────────────────────────────────────────

alter table public.babies       enable row level security;
alter table public.baby_members enable row level security;
alter table public.events       enable row level security;
alter table public.invites      enable row level security;

drop policy if exists babies_select on public.babies;
drop policy if exists babies_update on public.babies;
drop policy if exists babies_delete on public.babies;
create policy babies_select on public.babies for select using (public.is_member(id));
create policy babies_update on public.babies for update using (public.is_member(id)) with check (public.is_member(id));
create policy babies_delete on public.babies for delete using (public.is_owner(id));
-- No insert policy: babies are created through create_baby() so the owner row is always added.

drop policy if exists members_select on public.baby_members;
drop policy if exists members_delete on public.baby_members;
create policy members_select on public.baby_members for select using (public.is_member(baby_id));
-- You can leave a baby, and an owner can remove a caregiver.
create policy members_delete on public.baby_members for delete
  using (user_id = auth.uid() or public.is_owner(baby_id));

drop policy if exists events_select on public.events;
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
create policy events_select on public.events for select using (public.is_member(baby_id));
create policy events_insert on public.events for insert with check (public.is_member(baby_id));
create policy events_update on public.events for update using (public.is_member(baby_id)) with check (public.is_member(baby_id));
create policy events_delete on public.events for delete using (public.is_member(baby_id));

drop policy if exists invites_select on public.invites;
drop policy if exists invites_insert on public.invites;
drop policy if exists invites_delete on public.invites;
create policy invites_select on public.invites for select using (public.is_member(baby_id));
create policy invites_insert on public.invites for insert with check (public.is_member(baby_id) and created_by = auth.uid());
create policy invites_delete on public.invites for delete using (public.is_member(baby_id));

-- ─────────────────────────────────────────────────────────────
-- RPCs the app calls
-- ─────────────────────────────────────────────────────────────

-- Create a baby and make the caller its owner, in one step.
create or replace function public.create_baby(p_name text, p_birth date, p_settings jsonb, p_look jsonb)
returns public.babies language plpgsql security definer set search_path = public as $$
declare b public.babies;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from public.baby_members where user_id = auth.uid()) >= 10 then
    raise exception 'baby limit reached';
  end if;
  insert into public.babies (created_by, name, birth, settings, look)
  values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'Baby'), p_birth,
          coalesce(p_settings, '{}'::jsonb), coalesce(p_look, '{}'::jsonb))
  returning * into b;
  insert into public.baby_members (baby_id, user_id, role) values (b.id, auth.uid(), 'owner');
  return b;
end $$;

-- Redeem an invite code. Returns the baby id.
create or replace function public.accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invites;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.invites where code = p_code for update;
  if not found then raise exception 'invite not found'; end if;
  if exists (select 1 from public.baby_members where baby_id = inv.baby_id and user_id = auth.uid()) then
    return inv.baby_id;  -- already a member; opening the link twice is fine
  end if;
  if inv.used_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at < now() then raise exception 'invite expired'; end if;
  insert into public.baby_members (baby_id, user_id, role) values (inv.baby_id, auth.uid(), 'caregiver');
  update public.invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return inv.baby_id;
end $$;

-- Permanently delete the caller: babies they own (with all events), their
-- memberships, and their login. Caregivers on those babies lose access too.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.babies b
    where exists (select 1 from public.baby_members m where m.baby_id = b.id and m.user_id = auth.uid() and m.role = 'owner');
  delete from public.baby_members where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.create_baby(text, date, jsonb, jsonb) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.create_baby(text, date, jsonb, jsonb) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime: push changes to every open device for that baby
-- ─────────────────────────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.babies; exception when duplicate_object then null; end;
end $$;
