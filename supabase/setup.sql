-- Einmal im Supabase SQL Editor ausführen.
create table if not exists public.plan_entries (
  plan_id    text not null,
  path       text not null,            -- 'days/2026-12-04', 'weeks/2026-11-30', 'settings/main'
  data       jsonb not null default '{}',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (plan_id, path)
);

create table if not exists public.plan_members (
  plan_id text not null,
  email   text not null,
  primary key (plan_id, email)
);

-- Pläne, die jeder mit dem Link lesen darf
create table if not exists public.plans (
  plan_id   text primary key,
  is_public boolean not null default false
);

alter table public.plan_entries enable row level security;
alter table public.plan_members enable row level security;
alter table public.plans        enable row level security;

-- Nur freigeschaltete E-Mail-Adressen dürfen den jeweiligen Plan lesen und schreiben.
create or replace function public.is_plan_member(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plan_members m
                 where m.plan_id = p and lower(m.email) = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.is_plan_public(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plans where plan_id = p and is_public);
$$;

drop policy if exists "members read"   on public.plan_entries;
drop policy if exists "public read"    on public.plan_entries;
drop policy if exists "own membership" on public.plan_members;
drop policy if exists "members insert" on public.plan_entries;
drop policy if exists "members update" on public.plan_entries;
-- Lesen: jeder (auch ohne Login), wenn der Plan öffentlich ist; sonst nur Mitglieder
create policy "public read"    on public.plan_entries for select to anon, authenticated
  using (public.is_plan_public(plan_id) or public.is_plan_member(plan_id));
-- Schreiben: nur freigeschaltete Mitglieder
create policy "members insert" on public.plan_entries for insert to authenticated with check (public.is_plan_member(plan_id));
create policy "members update" on public.plan_entries for update to authenticated using (public.is_plan_member(plan_id)) with check (public.is_plan_member(plan_id));
-- Angemeldete sehen nur ihre eigene Freischaltung (damit die Seite weiß, ob sie bearbeiten darf).
create policy "own membership" on public.plan_members for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
-- Einträge in plans/plan_members nur über das Supabase-Dashboard.

grant select on public.plan_entries to anon;

-- Live-Aktualisierung zwischen Geräten (Fehler "already member" beim zweiten Ausführen ist harmlos)
alter publication supabase_realtime add table public.plan_entries;

-- Leos Plan öffentlich lesbar machen (false = nur Mitglieder sehen ihn)
insert into public.plans (plan_id, is_public) values ('leo-woborsky-2026-27', true)
on conflict (plan_id) do update set is_public = excluded.is_public;

-- Zugang freischalten (E-Mails anpassen):
insert into public.plan_members (plan_id, email) values
  ('leo-woborsky-2026-27', 'leo@beispiel.at'),
  ('leo-woborsky-2026-27', 'coach@beispiel.at'),
  ('leo-woborsky-2026-27', 'office@bbsports.example')
on conflict do nothing;
