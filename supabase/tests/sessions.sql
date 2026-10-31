-- Im SQL Editor als Projektadministration ausführen. Alle Testdaten werden zurückgerollt.
-- Prüft echte PostgreSQL-Rechte und RLS, ohne pgTAP oder andere Erweiterungen.
begin;

insert into public.sessions (id, token, data)
values ('setup-rls-b', 'setup-rls-token-b', '{}');

set local role anon;
select set_config('request.headers', '{"x-session-token":"setup-rls-token-a"}', true);

-- Erstes Speichern und anschliessender Upsert derselben Sitzung müssen funktionieren.
insert into public.sessions (id, token, events, data)
values ('setup-rls-a', 'setup-rls-token-a', 1, '{}');
insert into public.sessions (id, token, events, data)
values ('setup-rls-a', 'setup-rls-token-a', 2, '{}')
on conflict (id) do update set events = excluded.events, data = excluded.data;

do $$
begin
  if (select count(*) from public.sessions) <> 1
      or (select events from public.sessions where id = 'setup-rls-a') is distinct from 2 then
    raise exception 'Eigene Sitzung fehlt, Upsert scheitert oder fremde Zeilen sind sichtbar';
  end if;
  if has_table_privilege(current_user, 'public.sessions', 'DELETE,TRUNCATE') then
    raise exception 'App darf weder löschen noch die Tabelle leeren';
  end if;
  begin
    delete from public.sessions where id = 'setup-rls-a';
    raise exception 'Löschen mit App-Rechten wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Ohne Header darf weder gelesen noch eingefügt werden.
select set_config('request.headers', '{}', true);
do $$
begin
  if exists (select 1 from public.sessions) then
    raise exception 'Ohne Token sind Sitzungen sichtbar';
  end if;
  begin
    insert into public.sessions (id, token, data)
    values ('setup-rls-c', 'setup-rls-token-c', '{}');
    raise exception 'Einfügen ohne Header wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Auch ein leerer Header darf keine Sitzung freigeben.
select set_config('request.headers', '{"x-session-token":""}', true);
do $$
begin
  begin
    insert into public.sessions (id, token, data) values ('setup-rls-c', '', '{}');
    raise exception 'Einfügen mit leerem Token wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Ein zweites Gerät darf die erste Sitzung weder lesen noch überschreiben oder übernehmen.
select set_config('request.headers', '{"x-session-token":"setup-rls-token-b"}', true);
do $$
begin
  if exists (select 1 from public.sessions where id = 'setup-rls-a') then
    raise exception 'Fremde Sitzung ist lesbar';
  end if;
  begin
    insert into public.sessions (id, token, events, data)
    values ('setup-rls-a', 'setup-rls-token-b', 999, '{}')
    on conflict (id) do update set token = excluded.token, events = excluded.events;
    raise exception 'Übernehmen einer fremden Sitzung wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.sessions (id, token, data)
    values ('setup-rls-c', 'setup-rls-token-c', '{}');
    raise exception 'Einfügen mit fremdem Token wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.headers', '{"x-session-token":"setup-rls-token-a"}', true);
do $$
begin
  if (select events from public.sessions where id = 'setup-rls-a') is distinct from 2 then
    raise exception 'Fremder Zugriff hat die erste Sitzung verändert';
  end if;
  begin
    update public.sessions set token = 'setup-rls-token-b' where id = 'setup-rls-a';
    raise exception 'Tokenwechsel auf ein fremdes Token wurde zugelassen';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
do $$
begin
  if has_table_privilege(current_user, 'public.sessions', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then
    raise exception 'Die ungenutzte Login-Rolle darf keine Tabellenrechte haben';
  end if;
end $$;

reset role;
set local role service_role;
do $$
begin
  if (select count(*) from public.sessions where id in ('setup-rls-a', 'setup-rls-b')) <> 2 then
    raise exception 'Der Teamschlüssel muss beide Sitzungen lesen können';
  end if;
end $$;

reset role;
rollback;
select 'OK: Sitzungsrechte geprüft, alle Testdaten zurückgerollt' as ergebnis;
