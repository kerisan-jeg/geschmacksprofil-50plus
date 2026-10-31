# Zentrale Speicherung und Abschlussbefragung

Stand 31.10.2026. Die zentrale Anbindung nach dem Vorschlag vom 29.10.2026 ist im Code umgesetzt. **Eine Datenbank entsteht dadurch noch nicht:** Erst wenn das Supabase-Projekt eingerichtet ist und beide Verbindungsvariablen im Build stehen, werden Antworten nach der Einwilligung zentral übertragen. Ohne diese Einrichtung bleiben sie auf dem Gerät. Dazu kommen eine kurze Befragung am Schluss und eine Abschlussbestätigung, die bei aktiver zentraler Speicherung erst nach erfolgreicher Übertragung erscheint.

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

## Nächste Schritte: Wer übernimmt was?

Das Team-Projekt `geschmacksprofil-50plus` ist unter `https://dfzpnkumksztmvtpdfem.supabase.co` in **Paris (`eu-west-3`, EU)** eingerichtet. Die Tabelle `sessions` ist über die API erreichbar; Einfügen, Aktualisieren, Befragung und die Sperre fremder Zugriffe wurden am 31.10.2026 erfolgreich gegen diese Datenbank geprüft. `VITE_SYNC_URL` und `VITE_SYNC_KEY` sind lokal und als GitHub-Actions-Variablen gesetzt. Die Schritte unten dokumentieren die Einrichtung und eine spätere Wiederholung; eine direkte Verknüpfung von Supabase mit dem GitHub-Repository ist nicht erforderlich.

| Schritt | Zuständigkeit |
|---|---|
| Supabase-Konto anmelden und ein Team-Projekt auswählen oder anlegen | Team; Kontozugang bleibt beim Team |
| Datenbanktabelle und Zugriffsregeln einrichten | Mit verbundenem Supabase-Zugang kann Codex das übernehmen; alternativ SQL unten selbst ausführen |
| Öffentliche Verbindungsdaten lokal und in GitHub setzen | Codex kann das nach Verbindung zum richtigen Projekt übernehmen |
| Änderungen veröffentlichen und Übertragung prüfen | Codex kann das nach der Datenbankeinrichtung übernehmen |
| Studieninformation, Aufbewahrung und Einwilligung mit Tibor abstimmen | Team, vor dem Einsatz mit echten Testpersonen |

## Einrichtung

1. **Projekt anlegen:** [Supabase Dashboard](https://supabase.com/dashboard) → New project, Name z. B. `geschmacksprofil-50plus`. Als konkrete EU-Region **Paris (`eu-west-3`, im Team-Projekt gewählt)** oder **Frankfurt (`eu-central-1`)** wählen. Zürich (`eu-central-2`) liegt in der Schweiz und ist keine EU-Region. Das Datenbankpasswort im Passwortmanager des Teams ablegen. Die [Supabase-Dokumentation zu Regionen](https://supabase.com/docs/guides/platform/regions) beschreibt die Auswahl.
2. **Tabelle und Regeln anlegen:** SQL Editor → New query → den gesamten Inhalt von [`supabase/migrations/20261031000000_sessions.sql`](../supabase/migrations/20261031000000_sessions.sql) einfügen → Run. Die Datei kann auch auf einer nach dem früheren SQL eingerichteten Tabelle ausgeführt werden; Sitzungsdaten werden dabei nicht gelöscht.
3. **Regeln prüfen:** Im SQL Editor den gesamten Inhalt von [`supabase/tests/sessions.sql`](../supabase/tests/sessions.sql) ausführen. Der Test arbeitet mit künstlichen Zeilen und nimmt seine Änderungen am Schluss mit `ROLLBACK` zurück. Er prüft Einfügen, Aktualisieren, Lesen und verweigerte fremde Zugriffe.
4. **Öffentliche Verbindungsdaten holen:** Project URL aus dem Connect-Dialog und den **Publishable Key** (`sb_publishable_…`) aus Settings → API Keys kopieren. Ein älterer `anon`-JWT funktioniert ebenfalls. Der geheime **Secret Key** (`sb_secret_…`, früher `service_role`) wird nur für den Gesamtexport und optional das Aufräumen des Verbindungstests benötigt; niemals als `VITE_`-Variable setzen. Siehe [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
5. **Lokal konfigurieren:** Im Projektordner `.env.example` nach `.env.local` kopieren und die beiden öffentlichen Werte eintragen. Ein bestehendes `.env.local` ergänzen, statt es zu überschreiben.

   ```dotenv
   VITE_SYNC_URL=https://DEINE-PROJEKT-ID.supabase.co
   VITE_SYNC_KEY=sb_publishable_DEIN-OEFFENTLICHER-SCHLUESSEL
   ```

6. **Verbindung prüfen:** `npm run check:zentral`. Das Skript prüft mit künstlichen Sitzungen dieselbe Übertragung wie die App: Einfügen, erneutes Speichern, Befragung und Sperre fremder Zugriffe. Mit `SYNC_SERVICE_KEY` in `.env.local` räumt es seine Testzeilen danach auf; andernfalls nennt es die IDs zum Löschen im Table Editor. Schlüssel und Teilnehmerdaten werden nicht ausgegeben. Dieser API-Test ersetzt den anschliessenden Browser-Test nicht.
7. **GitHub konfigurieren:** Im [Repository unter Actions → Variables](https://github.com/kerisan-jeg/geschmacksprofil-50plus/settings/variables/actions) zwei Repository-Variablen setzen: `VITE_SYNC_URL` und `VITE_SYNC_KEY`, mit denselben öffentlichen Werten wie lokal. Dafür braucht es einen GitHub-Zugang mit Schreibrecht für Actions-Variablen. Der geheime Export-Schlüssel wird dort nicht gebraucht.
8. **Veröffentlichen:** Die vorbereiteten Codeänderungen auf `main` übernehmen. Dadurch startet `.github/workflows/deploy.yml`. Falls der richtige Code bereits veröffentlicht ist und nur Variablen ergänzt wurden: Actions → „Deploy auf GitHub Pages“ → Run workflow → `main`. Das Setzen der Variablen allein ändert eine bereits gebaute App nicht.
9. **Im Browser prüfen:** Die veröffentlichte App neu laden und eine künstliche Teilnahme inklusive Befragung durchspielen. In Supabase unter Table Editor → `sessions` muss genau diese Teilnahmenummer erscheinen, `finished = true` sein und `data.survey` die Befragung enthalten. In der App zeigt `?admin=1` für die Sitzung „Zentral übertragen“. Eine zweite Teilnahme auf einem anderen Gerät muss als zweite Zeile in derselben Tabelle ankommen. Die Admin-Ansicht zeigt weiterhin nur das jeweilige Gerät.

## Zugriffsregeln

Die App schickt `POST /rest/v1/sessions` mit `Prefer: resolution=merge-duplicates,return=minimal`; beim nächsten Speichern wird die vorhandene Zeile aktualisiert. Das Gerät muss sein zufälliges Sitzungstoken im Header `x-session-token` mitsenden.

- Einfügen ist nur erlaubt, wenn das Token in der Zeile zum nichtleeren Header passt.
- Lesen und Aktualisieren sind auf Sitzungen mit diesem Token begrenzt. Der öffentliche Projektschlüssel allein gibt keine Sitzungen frei.
- Die begrenzte Leseregel ist auch für das Aktualisieren nötig. Das frühere SQL ohne SELECT-Regel reicht dafür nicht aus; siehe [Supabase RLS: UPDATE policies](https://supabase.com/docs/guides/database/postgres/row-level-security#update-policies).
- Löschen und Tabellenoperationen sind für die App nicht erlaubt. Der Gesamtexport aller Geräte braucht den geheimen Schlüssel des Teams.
- Publishable- und Secret-Schlüssel werden nur im Header `apikey` gesendet; ältere JWT-Schlüssel zusätzlich als `Authorization: Bearer …`.

## Export für die Auswertung

```bash
SYNC_URL=https://abcd1234.supabase.co SYNC_SERVICE_KEY=… npm run export:zentral
```

Unter PowerShell beide Werte in `.env.local` setzen (`VITE_SYNC_URL`, `SYNC_SERVICE_KEY`), dann `npm run export:zentral` ausführen. Der geheime Schlüssel kann ein aktueller Secret Key oder ein älterer `service_role`-JWT sein. Das Skript `scripts/export-sessions.mjs` holt alle Zeilen und schreibt `auswertung/sitzungen-<datum>.json` (alles) und `auswertung/ereignisse-<datum>.csv` (eine Zeile pro Ereignis, mit den Spalten `surveyEase`, `surveyClarity`, `surveyFit`, `surveyLength`, `surveyRemarks`). Danach wie bisher `npm run auswertung -- auswertung/sitzungen-<datum>.json` für die Lernkurve. Die Admin-Ansicht auf einem Gerät exportiert weiterhin nur die Sitzungen dieses Geräts. Die Verbindungstest-Zeilen mit `app_version = setup-check` vor der Auswertung entfernen.

Alternativ zeigt Supabase die Tabelle im Table Editor (CSV-Export dort enthält `data` als JSON-Text).

## Datenschutz und Betrieb

- Gespeichert: Teilnahmenummer, Altersgruppe, Ernährungsform, Ausschlüsse (Allergien: Gesundheitsdaten), alle Antworten mit Zeitpunkten, Profil, Bildschirmwechsel, Befragung. Nicht gespeichert: Vorname, Handynummer, Geräte- oder Netzwerkadressen durch die App (Supabase protokolliert Zugriffe serverseitig nach seinen Bedingungen).
- Löschung auf Wunsch: Zeile mit der Teilnahmenummer im Table Editor löschen. Nach der Studie: Tabelle exportieren, Projekt löschen oder pausieren.
- Der öffentliche Schlüssel im Build erlaubt nur mit passendem Sitzungstoken Einfügen sowie Lesen und Überschreiben der eigenen Zeile. Er ist keine Anmeldung und verhindert keine künstlichen Müllzeilen. Die Testleitung notiert je Person die Teilnahmenummer von der Abschlussbestätigung (das Eingabefeld Teilnehmer-Nr. gibt es seit dem 29.10.2026 nicht mehr, `participant_code` bleibt leer).
- Ohne gesetzte Variablen (z. B. lokal) verhält sich die App wie bisher: alles bleibt auf dem Gerät, die Texte sagen das („Deine Antworten bleiben auf diesem Gerät“).

## Offen für das Team

1. Vor dem Pilot die veröffentlichte App auf den vorgesehenen Testgeräten öffnen und den Ablauf einschliesslich Abschlussbestätigung prüfen (Schritt 9).
2. Einwilligungstext und Studieninformation mit Tibor abstimmen (Frage F4: Gesundheitsdaten, Speicherort EU, Aufbewahrung).
3. Pilottest mit 5 bis 10 Personen ab 50, dabei prüfen, dass jede Sitzung in der Tabelle ankommt (`finished` wahr, Befragung ausgefüllt).

## Prüfstand 31.10.2026

- `npm test`: 341 Tests bestanden. `npm run build`: erfolgreich.
- Migration und `supabase/tests/sessions.sql` lokal mit PostgreSQL über PGlite geprüft: eigene Sitzung einfügen und aktualisieren, fremde Zugriffe sperren, Testdaten zurückrollen. Erneutes Ausführen der Migration erhält vorhandene Sitzungen. Der Test erkennt die frühere fehlende SELECT-Regel.
- `npm run check:zentral` gegen das Team-Projekt: erfolgreich. Neue Sitzungen, Aktualisierung und Abschlussbefragung kommen an; Lesen und Überschreiben fremder Sitzungen, Einfügen ohne passendes Token und Löschen mit App-Rechten werden gesperrt. Die künstlichen Testzeilen tragen `app_version = setup-check`; vor der Auswertung im Table Editor löschen.
- Der Browser-Test der veröffentlichten App ist in Schritt 9 beschrieben; API-Test und lokale SQL-Prüfung ergänzen ihn.
