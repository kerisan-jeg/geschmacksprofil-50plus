-- Einmal im Supabase SQL Editor ausführen. Wiederholbar, ohne Sitzungsdaten zu löschen.
-- Das frühere SQL aus docs/zentrale-speicherung.md wird damit ebenfalls korrigiert.
begin;

create table if not exists public.sessions (
  id text primary key,
  token text not null,
  participant_code text,
  app_version text,
  rule_version text,
  started_at timestamptz,
  ended_at timestamptz,
  finished boolean not null default false,
  events integer not null default 0,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

alter table public.sessions enable row level security;

-- RLS ersetzt keine Tabellenrechte. Insbesondere DELETE und TRUNCATE bleiben dem Team vorbehalten.
revoke all on table public.sessions from public, anon, authenticated;
grant usage on schema public to anon, service_role;
grant select, insert, update on table public.sessions to anon;
grant select, insert, update, delete on table public.sessions to service_role;

drop policy if exists anon_insert on public.sessions;
drop policy if exists anon_update_own on public.sessions;
drop policy if exists anon_select_own on public.sessions;

-- Einfügen nur mit einem nichtleeren Token, das zum Request-Header passt.
create policy anon_insert on public.sessions
  for insert to anon
  with check (
    token = nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-session-token', '')
  );

-- Postgres braucht bei UPDATE/Upsert auch eine SELECT-Regel. Sie gibt nur eigene Sitzungen frei.
-- Ohne Header oder mit einem fremden Token sind keine Zeilen sichtbar.
create policy anon_select_own on public.sessions
  for select to anon
  using (
    token = nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-session-token', '')
  );

create policy anon_update_own on public.sessions
  for update to anon
  using (
    token = nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-session-token', '')
  )
  with check (
    token = nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-session-token', '')
  );

notify pgrst, 'reload schema';
commit;
