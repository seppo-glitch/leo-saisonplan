-- Einmal im Supabase SQL Editor ausführen (kann gefahrlos erneut ausgeführt werden).
-- Prinzip: Lesen für alle mit dem Link (wenn der Plan öffentlich ist),
--          Schreiben nur mit Bearbeitungs-Code. Keine E-Mail-Adressen, kein Login.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.plans (
  plan_id        text primary key,
  is_public      boolean not null default true,
  edit_code_hash text
);
alter table public.plans add column if not exists edit_code_hash text;

create table if not exists public.plan_entries (
  plan_id    text not null,
  path       text not null,            -- 'days/2026-12-04', 'weeks/2026-11-30', 'settings/main'
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (plan_id, path)
);

create table if not exists public.code_failures (
  plan_id text not null,
  at      timestamptz not null default now()
);
create index if not exists code_failures_idx on public.code_failures (plan_id, at);

alter table public.plans         enable row level security;
alter table public.plan_entries  enable row level security;
alter table public.code_failures enable row level security;

-- Alte Policies aus der E-Mail-Variante entfernen (falls vorhanden)
drop policy if exists "members read"   on public.plan_entries;
drop policy if exists "members insert" on public.plan_entries;
drop policy if exists "members update" on public.plan_entries;
drop policy if exists "public read"    on public.plan_entries;

-- Direktes Lesen nur für öffentliche Pläne (nötig für Live-Aktualisierung). Direktes Schreiben: nie.
create policy "public read" on public.plan_entries for select to anon, authenticated
  using (exists (select 1 from public.plans p where p.plan_id = plan_entries.plan_id and p.is_public));
revoke insert, update, delete on public.plan_entries from anon, authenticated;
revoke all on public.plans, public.code_failures from anon, authenticated;

-- ---------- Funktionen ----------
create or replace function public.plan_is_public(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_public from public.plans where plan_id = p), false);
$$;

-- Prüft den Code. Nach 10 Fehlversuchen in 15 Minuten wird der Plan für 15 Minuten gesperrt.
create or replace function public.check_code(p text, code text) returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare h text; fails int;
begin
  select count(*) into fails from public.code_failures where plan_id = p and at > now() - interval '15 minutes';
  if code is null or length(code) = 0 then return false; end if;
  if fails >= 10 then raise exception 'locked'; end if;
  select edit_code_hash into h from public.plans where plan_id = p;
  if h is not null and crypt(code, h) = h then return true; end if;
  insert into public.code_failures(plan_id) values (p);
  delete from public.code_failures where at < now() - interval '1 day';
  return false;
end $$;

create or replace function public.get_entries(p text, code text default null)
returns table(path text, data jsonb)
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.plan_is_public(p) and not public.check_code(p, code) then raise exception 'invalid code'; end if;
  return query select e.path, e.data from public.plan_entries e where e.plan_id = p;
end $$;

create or replace function public.save_entry(p text, code text, path text, data jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.check_code(p, code) then raise exception 'invalid code'; end if;
  if path !~ '^((days|weeks)/\d{4}-\d{2}-\d{2}|settings/main)$' then raise exception 'invalid path'; end if;
  if jsonb_typeof(data) <> 'object' or octet_length(data::text) > 100000 then raise exception 'invalid data'; end if;
  insert into public.plan_entries(plan_id, path, data, updated_at) values (p, path, data, now())
  on conflict (plan_id, path) do update set data = excluded.data, updated_at = now();
end $$;

revoke all on function public.check_code(text,text), public.get_entries(text,text), public.save_entry(text,text,text,jsonb), public.plan_is_public(text) from public;
grant execute on function public.check_code(text,text), public.get_entries(text,text), public.save_entry(text,text,text,jsonb), public.plan_is_public(text) to anon, authenticated;

-- Live-Aktualisierung (Fehlermeldung "already member" beim zweiten Ausführen ist harmlos)
do $$ begin
  alter publication supabase_realtime add table public.plan_entries;
exception when duplicate_object then null; end $$;

-- ---------- Plan anlegen / Code setzen ----------
-- CODE ÄNDERN: 'HIER-EIGENEN-CODE' ersetzen (mind. 10 Zeichen, z. B. drei Wörter: puck-ossiach-sauna).
-- Zum späteren Wechseln nur diesen Block mit neuem Code erneut ausführen; alte Geräte werden dann gesperrt.
insert into public.plans (plan_id, is_public, edit_code_hash)
values ('leo-woborsky-2026-27', true, crypt('HIER-EIGENEN-CODE', gen_salt('bf')))
on conflict (plan_id) do update set is_public = excluded.is_public, edit_code_hash = excluded.edit_code_hash;
