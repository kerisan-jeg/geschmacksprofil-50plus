# 09 Studienbereitschaft

Stand 26.10.2026. Grundlage: Dokumente 01 bis 08, Testläufe vom 26.10.2026, [messkonzept.md](messkonzept.md). Entscheide, die das Team treffen muss, sind als **offen** markiert.

## 1. Checkliste

| Punkt | Stand | Beleg oder nächster Schritt |
|---|---|---|
| Kartenlogik vollständig verstanden | erfüllt | [02](02_Kartenauswahl_und_Swipe_Logik.md), Skript `scripts/ablauf-beispiele.mjs` |
| Auswahlalgorithmen dokumentiert | erfüllt | [02](02_Kartenauswahl_und_Swipe_Logik.md), [05](05_Flowcharts.md) Diagramme B und D |
| Ausschlusslogik überprüft | erfüllt mit Vorbehalt | [03](03_Filter_und_Ausschlusslogik.md); Befund B1 **offen** |
| Profilberechnung nachvollziehbar | erfüllt | [04](04_Profilberechnung.md), Diagramm E |
| Anzahl und Auswahl der Gerichte geprüft | erfüllt | [08](08_Anwendungslogik_Bewertung.md), Abschnitt 5; keine Änderung empfohlen |
| Technische Tests erfolgreich | erfüllt | 340 Tests, Build, [06](06_Testkonzept_und_Ergebnisse.md) |
| Kritische Fehler behoben | **offen** | B1 entscheiden (Korrektur oder Textanpassung), B3 entscheiden |
| Benutzeroberfläche verständlich | erfüllt mit Vorbehalt | [07](07_Frontend_Bewertung.md); Verständlichkeit der Begriffe nur im Pilot prüfbar |
| Darstellung des Geschmacksprofils plausibel | erfüllt mit Vorbehalt | B7, B8 (Prozentwert, lange Vermutungslisten) im Bericht einordnen |
| Vollständiger Testdurchlauf funktioniert | erfüllt (automatisiert) | T01, T23; **offen**: ein manueller Durchlauf auf dem Studiengerät mit der eingefrorenen Version |
| Einheitliche Testbedingungen | **offen** | Abschnitt 4 |
| Version eingefroren und dokumentiert | **offen** | Abschnitt 5 (heute kein Git-Tag) |
| Einwilligung und Gesundheitsdaten (Frage F4) | **offen** | Abschnitt 3 |

## 2. Priorisierte Massnahmen vor der Studie

**P1, vor dem Einfrieren entscheiden:**

1. **B1 „Vertrage ich nicht“ beim Wischen:** Variante a (Tags der Karte mit ausschliessen, kleine Codeänderung mit Test, neue `RULE_VERSION`) oder Variante b (Text und Anweisung). Ohne Entscheid kann eine Testperson mit Ei-Unverträglichkeit, die Frage 2 übersprungen hat, in Runde 3 Zopf sehen.
2. **B3 Budget Runde 2:** `holdout` und `limit` festlegen und begründen (Standard 6 und 13 lassen ist eine zulässige Entscheidung, muss aber im Bericht als Grenze stehen).
3. **Konfiguration festlegen:** Auswahlverfahren nur `adaptive` (oder geplanter Vergleich mit `fixed`, dann Zuteilung dokumentieren), `r1scale` 3 oder 2, Anmeldung mit Vornamen an oder aus (seit dem 28.10.2026 ohne SMS), `GROUP_IMAGES` (mit dem Dozenten klären), Tutorial aus.
4. **Profilbearbeitung während der Studie:** erlauben, verbieten oder erst nach dem Kurzinterview. Jede Änderung ist protokolliert, verändert aber das Profil, das die Person beurteilt.

**P2, vor dem ersten Studientermin:**

5. Studien-URL ohne weitere Parameter festlegen; die Testleitung prüft in `?admin=1` die Zeile „Nächste Testperson startet mit …“ und dass keine ignorierten Parameter gemeldet werden.
6. Auf jedem Gerät „Alle Daten löschen“, dann je Person „Neue Testperson starten“ und Teilnehmer-Nr. vergeben (Pilot `P01…`, Hauptstudie `T01…`).
7. Manueller Durchlauf mit der eingefrorenen Version auf dem Studiengerät (Registrierung, drei Fragen, vier Runden, Profil, Export), Ergebnis im Studienprotokoll festhalten.
8. Export-Ablauf üben: `npm run export:zentral` (alle Geräte, braucht den service_role key in `.env.local`) oder je Gerät `?admin=1 → Export JSON (alles)`, Datei sicher ablegen, `npm run auswertung` einmal mit einem Testexport laufen lassen.
9. Zentrale Speicherung einrichten (Supabase-Projekt in der EU, Tabelle `sessions`, Repository-Variablen `VITE_SYNC_URL` und `VITE_SYNC_KEY`; Anleitung in [zentrale-speicherung.md](zentrale-speicherung.md)) und im Pilot mit 5 bis 10 Personen prüfen, dass jede Sitzung in der Tabelle ankommt und `finished` nach der Befragung wahr ist. Ohne die Variablen bleibt alles auf dem Gerät.

**P3, nach der Studie:** B2, B5, B7, B8, Katalog, Migrationscode, Alternativen aus [08](08_Anwendungslogik_Bewertung.md).

## 3. Daten

### Was heute protokolliert wird (`src/logging/logger.js`, `export.js`)

| Ebene | Felder |
|---|---|
| Sitzung | `sessionId` (12 Hexzeichen, zufällig), `participantCode`, `startedAt`, `endedAt`, `appVersion`, `ruleVersion`, `participantName` (Vorname aus der Anmeldung, seit dem 28.10.2026, abschaltbar mit `PRIVACY.logParticipantName`), `config` (Limit, Auswahl, Kontrollkarten, Skala, Bilder, Auth, ignorierte Parameter), `onboarding` (Altersgruppe, Ernährungsform, Ausschlüsse mit Typ, Wert, Herkunft, `status`; Notizen), `profile` (Abschnitt 8 in [04](04_Profilberechnung.md)), `trace` (Bildschirmwechsel mit Zeit, `about`, `stage0_edit`, `stage0_confirm` mit zulässigen Gruppen, `round_start`, `round_end`, `tab`, `sign_out`, `restart`) |
| Antwort | `cardId`, `stage`, `kind`, `parentId`, `round`, `positionInRound`, `phase`, `response`, `timestamp`, `responseTimeMs`, `inputMethod`, `selectionReason`, `ruleVersion`, `alternatives`, `labelShown`, `scaleVariant`, `imageShown`, `imageSource`, `cuisines`, `excludedCardIds` |
| Weitere Ereignisse | `HOLDOUT_DRAWN` (Kontrollkarten, Methode, Anzahl zulässiger), `QUESTION_ABORTED`, `RATING_CHANGED` (mit `fromPrediction`, `predictedScore`), `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED`, `NAVIGATION`, `AUTH_STARTED`, `AUTH_COMPLETED` (`PRACTICAL_SAVED` nur noch in Sitzungen vor dem 28.10.2026) |

Nicht protokolliert: Vorname, Telefonnummer (nur gekürzt im Konto auf dem Gerät, nie im Export, Test `privacy.test.js`), Speisevorschriften (`PRIVACY.logDietaryRules = false`), Gerätetyp und Browser, Zeit je Frage in Stufe 0 (nur Bildschirmwechsel im `trace`).

### Was die Forschungsfrage braucht (Kernfrage 2)

Vorhanden: Antworten mit Position, Grund und Zeit; Kontrollkarten mit Ziehung und Antworten; Konfiguration je Sitzung; Vermutungen am Ende; Abbrüche; Rückgängig; Eingabemethode. Damit sind Lernkurve, Vergleichswerte, Pilot-Kennzahlen und das Kriterium aus dem Messkonzept berechenbar.

Seit dem 30.10.2026 in der App: die subjektive Einschätzung (kurze Befragung nach dem Profil: Bedienung, Verständlichkeit, Passung, Länge, offene Anmerkung; in der Sitzung als `survey`, in der CSV als `survey…`-Spalten). Fehlend oder nur ausserhalb der App: Beobachtungsbogen, Gerätetyp, Test-Retest. Empfehlung: Interview und Beobachtung mit der Teilnehmer-Nr. verknüpfen, nie mit Namen.

### Datensparsamkeit und Pseudonymisierung

- Pseudonym ist die Teilnehmer-Nr. der Testleitung; `sessionId` ist zufällig und steht als Teilnahmenummer auf der Abschlussbestätigung. Der Vorname bleibt seit dem 30.10.2026 auf dem Gerät (`PRIVACY.logParticipantName = false`; vom 28. bis 29.10. war er in Sitzung und Export).
- Zentrale Speicherung (seit dem 30.10.2026): Die ganze Sitzung geht nach der Einwilligung laufend an eine Supabase-Datenbank (EU-Region wählen). Der öffentliche Schlüssel im Build erlaubt nur Einfügen und das Überschreiben der eigenen Zeile (Token je Sitzung), kein Lesen; das Team liest mit dem service_role key über `npm run export:zentral`. Löschung auf Wunsch über die Teilnahmenummer. Details in [zentrale-speicherung.md](zentrale-speicherung.md).
- Ausschlüsse (Allergien) und bestätigte Vorschläge bei halal oder koscher sind Gesundheits- bzw. potenziell weltanschauliche Daten. Mit `PRIVACY.logExclusionValues = false` bleiben nur Typ und Herkunft; dann ist der Vorfilter nicht mehr auswertbar, aber die Lernkurve bleibt. **Offen:** Einwilligungstext (Frage F4) muss Gesundheitsdaten, die Übermittlung an die zentrale Datenbank des Teams (Speicherort, Aufbewahrung) und die Auswertung nennen; der Text in der App vom 30.10.2026 ist ein Vorschlag und mit Tibor abzustimmen. Einen SMS-Versand an Google gibt es nicht mehr, der Vorname wird nicht übertragen.
- Die Altersgruppe ist die einzige demografische Angabe; mit kleiner Stichprobe und Teilnehmer-Nr. ist Re-Identifikation durch die Testleitung möglich, durch Dritte nicht ohne die Liste.
- Exporte nie ins Repository (`auswertung/` steht in `.gitignore`), Geräte nach der Studie mit „Alle Daten löschen“ bereinigen.

## 4. Einheitliche Testbedingungen

| Bedingung | Festlegung (Vorschlag) |
|---|---|
| Version | ein Git-Tag, eine veröffentlichte Adresse (GitHub Pages), keine Deployments während der Studie |
| Adresse | ohne URL-Parameter; Ausnahme nur bei geplantem Vergleich, dann je Gruppe ein fester Link |
| Konfiguration | Limit 13 in allen vier Runden (auch Gerichte), adaptiv, 6 Kontrollkarten, `r1scale` 3, Fotos, `GROUP_IMAGES` nach Entscheid, Tutorial aus, Anmeldung mit Vornamen an |
| Gerät | gleiche Geräteklasse und Browser für alle, Schrift 100 %, WLAN für Bilder |
| Ablauf | Einführung in einem Satz, Wischrichtungen nicht erklären, laut denken, bis zum Abschluss der letzten Runde, Kurzinterview, Export am Ende des Tages ([messkonzept.md](messkonzept.md), Abschnitt 8) |
| Testleitung | vor jeder Person „Neue Testperson starten“, Teilnehmer-Nr. eintragen, nach der Studie „Alle Daten löschen“ |

## 5. Versionierung und Einfrieren

Heute gibt es keine Git-Tags; `APP_VERSION` ist `0.9.0-demo`, `RULE_VERSION` `demo-0.6`. Vorschlag:

1. Alle P1-Entscheide umsetzen und testen (`npm test`, `npm run build`).
2. `APP_VERSION` auf `1.0.0-studie` setzen; `RULE_VERSION` nur ändern, wenn sich eine Regel ändert (z. B. B1 Variante a → `studie-1.0`). Beide stehen in jeder Sitzung und jedem Ereignis.
3. Commit mit der Nachricht „Studienversion einfrieren“, Git-Tag `studie-1.0.0` (Pilot: `pilot-1.0.0`, gegebenenfalls `studie-1.0.1`, falls der Pilot Korrekturen erzwingt). Tags nie verschieben.
4. Im Studienprotokoll festhalten: Tag und Commit-Hash, `APP_VERSION`, `RULE_VERSION`, `ROUND_FLOW`, Konfiguration, veröffentlichte Adresse mit Datum des Deployments, Prüfsummen der Daten (Stand 26.10.2026: `catalog.json` `d69605d9…f88161`, `stage0.json` `b831a9d6…8721ec`, `allergens.json` `9203782a…37fb3a`, `cuisines.json` `40abb13a…05d22d`; nach Änderungen mit `sha256sum src/data/*.json` neu bestimmen), Liste der vor dem Einfrieren behobenen Befunde, Liste der bewusst bestehenden Einschränkungen (B2 bis B8).
5. Während der Studie: kein Push auf `main` (oder `main` schützen und auf einem Zweig weiterarbeiten), weil jeder Push automatisch auf GitHub Pages veröffentlicht (`.github/workflows/deploy.yml`).
6. Nach der Studie: Auswertung ausschliesslich mit dem getaggten Stand (`git checkout studie-1.0.0`, `npm run auswertung`).

## 6. Pilot und Hauptstudie

| | Pilot | Hauptstudie |
|---|---|---|
| Zweck | Bedienbarkeit, Dauer, Begriffe, Plausibilität der Logik, Annahmen prüfen | Kernfrage 2 beantworten |
| Personen | 5 bis 10, Teilnehmer-Nr. `P01…` | geplant 30, `T01…` |
| Version | `pilot-1.0.0` | `studie-1.0.x`, nach dem Pilot eingefroren |
| Änderungen danach | erlaubt (Limit, Kontrollkarten, Begriffe, Modellwerte), jede mit neuer Version | keine funktionalen Änderungen; nur Dokumentation |
| Daten | nie in die Hauptauswertung (`--exclude P01,…`) | Hauptauswertung |
| Kriterium „aussagekräftig“ | nach dem Pilot festlegen | vor Beginn festgeschrieben |

## 7. Bereit oder nicht?

Einschätzung: **Technisch bereit, fachlich bereit nach zwei Entscheiden.** Die Logik ist verstanden, dokumentiert, getestet und deterministisch; die Oberfläche ist für eine begleitete Studie geeignet. Vor dem Einfrieren müssen das Team B1 (Ausschluss beim Wischen) und B3 (Budget Runde 2) entscheiden, die Konfiguration festlegen und die Einwilligung klären. Danach ein Pilot mit 5 bis 10 Personen, dann die Hauptstudie mit eingefrorener Version.
