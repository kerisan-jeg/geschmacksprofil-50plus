# Zentrale Speicherung und Abschlussbefragung

Stand 30.10.2026. Umsetzung des Vorschlags vom 29.10.2026: Die Antworten bleiben nicht mehr nur auf dem Smartphone der Testperson, sondern gehen nach der Einwilligung laufend an eine zentrale Datenbank des Teams. Dazu kommt eine kurze Befragung am Schluss und eine Abschlussbestätigung, die erst nach erfolgreicher Übertragung erscheint.

## Ablauf für die Teilnehmenden

Link öffnen → Studieninformation auf dem Startbildschirm → Vorname → Altersgruppe und Einwilligung („Was wird gespeichert?“ aufklappbar) → drei Fragen → bis zu vier Runden → Mein Profil → kurze Befragung (fünf Fragen) → Abschlussbestätigung mit Teilnahmenummer.

- Die Befragung ist vom Profil und vom Abschluss jeder Runde aus erreichbar, sobald mindestens eine Runde abgeschlossen oder beendet ist („Kurze Befragung“ im Profil). Vier Fragen mit Auswahl sind Pflicht (Bedienung, Verständlichkeit, Passung des Profils, Länge), die offene Frage („Was war unklar oder hat dir gefehlt?“) ist freiwillig.
- Die Abschlussbestätigung zeigt „Vielen Dank“ erst, wenn die letzte Übertragung gelungen ist. Vorher steht „Einen Moment“, bei einem Fehler „Noch nicht übermittelt“ mit „Erneut senden“. Darunter steht die Teilnahmenummer (die zufällige `sessionId`), mit der das Team eine Sitzung findet, zum Beispiel für eine Löschung.
- Der Vorname bleibt auf dem Gerät (`PRIVACY.logParticipantName = false`). App-Daten und Befragung hängen über die Teilnahmenummer zusammen, nicht über den Namen.

## Was übertragen wird

Nach jeder gespeicherten Änderung der Sitzung (Antwort, Profiländerung, Rundenende, Befragung) überträgt `src/sync/sync.js` die ganze Sitzung als Upsert, gebündelt mit 1,5 Sekunden Verzögerung; beim Absenden der Befragung sofort. Die Zeile in der Tabelle `sessions`:

| Spalte | Inhalt |
|---|---|
| `id` | `sessionId` (Teilnahmenummer, 12 Hexzeichen) |
| `token` | zufälliges Geheimnis des Geräts (`syncToken`); nur wer es kennt, darf die Zeile überschreiben |
| `participant_code`, `app_version`, `rule_version`, `started_at`, `ended_at`, `finished`, `events`, `updated_at` | Kennzahlen für die Übersicht; `finished` wird mit der Befragung wahr |
| `data` | die ganze Sitzung als JSON, identisch mit dem lokalen Export (Onboarding, Ereignisse, Profil, `trace`, `survey`) |

Ohne Verbindung bleibt die Sitzung lokal gespeichert; die App versucht es nach 5, 15 und dann alle 60 Sekunden erneut, und sobald das Gerät wieder online ist. Lokal bleibt alles wie bisher (`localStorage`, Admin-Ansicht `?admin=1`), die Admin-Ansicht zeigt je Sitzung, ob sie übertragen ist.

Gespeichert werden weiterhin Gesundheitsdaten (Allergien, Unverträglichkeiten). Der Einwilligungstext in der App nennt die Übermittlung an das Projektteam; die Studieninformation auf dem Startbildschirm und „Was wird gespeichert?“ unter der Einwilligung zählen die Daten auf.

## Einrichtung (einmalig, etwa 20 Minuten)

Die App spricht eine PostgREST-Schnittstelle an. Vorgesehen ist **Supabase** (kostenloser Tarif, keine Kreditkarte, Projekt in der EU wählbar), es geht aber jede PostgREST-Datenbank.

1. **Projekt anlegen:** supabase.com → New project, Region *Frankfurt (eu-central-1)* oder *Zürich*, Datenbankpasswort sicher ablegen.
2. **Tabelle und Regeln anlegen:** SQL Editor → New query → den Block unten ausführen.
3. **Schlüssel kopieren:** Settings → API: *Project URL* und *anon public key* (öffentlich, steht später im Build der App). Den *service_role key* nur für den Export des Teams aufbewahren, nie in die App und nie ins Repository.
4. **Repository-Variablen setzen:** GitHub → Settings → Secrets and variables → Actions → Variables: `VITE_SYNC_URL` (Project URL, z. B. `https://abcd1234.supabase.co`) und `VITE_SYNC_KEY` (anon key). Der nächste Push auf `main` baut die App damit (`.github/workflows/deploy.yml`). Lokal dieselben Werte in `.env.local` (steht in `.gitignore`).
5. **Prüfen:** App im Browser öffnen, eine Testsitzung durchspielen, in Supabase unter Table Editor → `sessions` die Zeile sehen; in `?admin=1` steht „Zentral übertragen“.

```sql
create table public.sessions (
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

-- Testpersonen (anon key): eine neue Zeile anlegen …
create policy "anon_insert" on public.sessions
  for insert to anon with check (true);

-- … und nur die eigene Zeile überschreiben (gleiches Token im Header x-session-token)
create policy "anon_update_own" on public.sessions
  for update to anon
  using (token = current_setting('request.headers', true)::json ->> 'x-session-token')
  with check (token = current_setting('request.headers', true)::json ->> 'x-session-token');

-- Kein select für anon: niemand kann mit dem öffentlichen Schlüssel Daten lesen.
```

Die App schickt `POST /rest/v1/sessions` mit `Prefer: resolution=merge-duplicates,return=minimal`; der Konfliktfall ist ein Update und unterliegt der zweiten Regel. Gelesen wird nur mit dem service_role key.

## Export für die Auswertung

```bash
SYNC_URL=https://abcd1234.supabase.co SYNC_SERVICE_KEY=… npm run export:zentral
```

oder beide Werte in `.env.local` (`VITE_SYNC_URL`, `SYNC_SERVICE_KEY`). Das Skript `scripts/export-sessions.mjs` holt alle Zeilen und schreibt `auswertung/sitzungen-<datum>.json` (alles) und `auswertung/ereignisse-<datum>.csv` (eine Zeile pro Ereignis, mit den Spalten `surveyEase`, `surveyClarity`, `surveyFit`, `surveyLength`, `surveyRemarks`). Danach wie bisher `npm run auswertung -- auswertung/sitzungen-<datum>.json` für die Lernkurve. Die Admin-Ansicht auf einem Gerät exportiert weiterhin nur die Sitzungen dieses Geräts.

Alternativ zeigt Supabase die Tabelle im Table Editor (CSV-Export dort enthält `data` als JSON-Text).

## Datenschutz und Betrieb

- Gespeichert: Teilnahmenummer, Altersgruppe, Ernährungsform, Ausschlüsse (Allergien: Gesundheitsdaten), alle Antworten mit Zeitpunkten, Profil, Bildschirmwechsel, Befragung. Nicht gespeichert: Vorname, Handynummer, Geräte- oder Netzwerkadressen durch die App (Supabase protokolliert Zugriffe serverseitig nach seinen Bedingungen).
- Löschung auf Wunsch: Zeile mit der Teilnahmenummer im Table Editor löschen. Nach der Studie: Tabelle exportieren, Projekt löschen oder pausieren.
- Der anon key im Build erlaubt nur Einfügen und das Überschreiben der eigenen Zeile. Missbrauch (Müllzeilen) wäre möglich, aber ohne Nutzen; die Testleitung notiert je Person die Teilnahmenummer von der Abschlussbestätigung (das Eingabefeld Teilnehmer-Nr. gibt es seit dem 29.10.2026 nicht mehr, `participant_code` bleibt leer).
- Ohne gesetzte Variablen (z. B. lokal) verhält sich die App wie bisher: alles bleibt auf dem Gerät, die Texte sagen das („Deine Antworten bleiben auf diesem Gerät“).

## Offen für das Team

1. Supabase-Projekt anlegen und die beiden Variablen setzen (Schritte 1 bis 5).
2. Einwilligungstext und Studieninformation mit Tibor abstimmen (Frage F4: Gesundheitsdaten, Speicherort EU, Aufbewahrung).
3. Pilottest mit 5 bis 10 Personen ab 50, dabei prüfen, dass jede Sitzung in der Tabelle ankommt (`finished` wahr, Befragung ausgefüllt).
