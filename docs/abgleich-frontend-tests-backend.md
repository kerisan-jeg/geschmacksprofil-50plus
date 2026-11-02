# Abgleich von Frontend, Tests und Supabase

**Historischer Abgleich der Version 0.12 vor der Erweiterung.** Die drei hier aufgeführten Studienanpassungen sind ab Version 0.13 umgesetzt; aktueller Ablauf und Definitionen stehen in [studienauswertung.md](studienauswertung.md).

Stand: 02.11.2026. Geprüfter lokaler Commit: `01d92f7`. GitHub meldet denselben Commit als erfolgreich veröffentlicht: [Deployment 41290543068](https://github.com/kerisan-jeg/geschmacksprofil-50plus/actions/runs/41290543068). App-Version: `0.12.0-demo`, Regelversion: `demo-0.9`.

## Ergebnis

**Für den derzeit implementierten Ablauf stimmen Oberfläche, Tests und zentrale Speicherung technisch überein.** Die vorgeschlagenen Änderungen für die Nutzerstudie sind noch nicht eingebaut. Die technische Übereinstimmung und die Eignung der Studienauswertung sind deshalb getrennte Fragen.

Die Profilberechnung läuft im Browser. Supabase speichert das erzeugte Sitzungsprotokoll einschliesslich Profil und Befragung und kontrolliert die Zugriffsrechte.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Vollständige Testsuite `npm test` | 342 Tests bestanden, 0 fehlgeschlagen |
| Produktions-Build `npm run build` | Erfolgreich; vorhandener Hinweis zur veralteten Vite-Option `advancedChunks` |
| Verbindungstest `npm run check:zentral` | Speichern, Aktualisieren und Befragung erfolgreich; fremde Zugriffe, Einfügen ohne passendes Token und Löschen mit App-Rechten gesperrt |
| Live-App im Edge-Browser mit frischer Sitzung | Vorabfragen, vier Runden mit jeweils 13 Karten, Profil, Befragung und Abschlussbestätigung erfolgreich |
| Echte Pointer-Wischbewegungen | Rechts, links und oben wurden ausgelöst; Antwortwerte, sichtbare Begriffe und Eingabemethode stimmen mit den in Supabase gespeicherten Ereignissen überein |
| Antwortknöpfe | Weitere Karten darüber beantwortet; sämtliche 52 Bewertungen nach Antwortwert, Begriff, Methode und Runde mit der Datenbank verglichen |
| Kontrollkarten | Sechs Kontrollantworten in Runde 2 gespeichert |
| Befragung | Vier Auswahlfragen und Freitext sichtbar; die ausgewählten Zahlen 4/4/4/2 und der Testkommentar unverfälscht in `data.survey` angekommen |
| Sitzungsmetadaten | Teilnahmenummer, Token-Zuordnung, App-Version, Ereigniszählung und `finished` stimmen mit dem gespeicherten Sitzungsobjekt überein |
| Vorname | Im getesteten Standardablauf nicht in die Sitzung übertragen; `participantName = null` |

Die bei diesen Prüfungen neu erzeugten künstlichen Sitzungen wurden anschliessend wieder gelöscht. Vorhandene Teilnehmerdatensätze wurden für die Prüfungen nicht verändert.

## So gehören die vier Befragungsfragen zusammen

| Sichtbare Frage | Formular und Logger | Supabase | Ereignisexport |
|---|---|---|---|
| Bedienbarkeit | `ease` | `data.survey.ease` | `surveyEase` |
| Verständlichkeit der Antwortmöglichkeiten | `clarity` | `data.survey.clarity` | `surveyClarity` |
| Passung des Profils | `fit` | `data.survey.fit` | `surveyFit` |
| Empfundene Länge | `length` | `data.survey.length` | `surveyLength` |
| Freiwillige Anmerkung | `remarks` | `data.survey.remarks` | `surveyRemarks` |

Die ersten drei Auswahlfragen haben fünf Stufen; die Länge hat drei. Auch die Tests prüfen diese aktuelle Struktur ausdrücklich. Manche Tests verwenden verkürzte Runden oder andere Konfigurationen für gezielte Einzelfälle. Der zusätzliche Live-Browsertest hat den Standard mit vier Runden und 13 Karten geprüft.

## Grenzen und noch offene Studienanpassungen

1. **Die neue Befragung ist bisher ein Vorschlag.** Aktuell bestehen überall vier Auswahlfragen plus Freitext. Anstrengung und Wiederholung sowie die gezielte Wischfrage aus [studie-verstehen.md](studie-verstehen.md) sind nicht implementiert. Bei einer Erweiterung müssen Anzeige, Logger, Export, Auswertung und Tests zusammen angepasst werden. Das JSON-Feld in Supabase kann zusätzliche Inhalte aufnehmen; der bestehende Logger übernimmt aber nicht automatisch beliebige neue Fragefelder.
2. **Der Abschlussstatus hat eine begrenzte Bedeutung.** `finished = true` folgt dem Abschicken der Befragung. Die Befragung ist bereits nach einem Rundenabschluss erreichbar. Alle vier Runden durchlaufen zu haben ist ein eigener Sachverhalt. Die Tests bilden dieses Verhalten ab.
3. **Die automatische Studienauswertung ist noch unvollständig.** Der Standardbericht analysiert vor allem Kontrollkarten und Lernkurve. Die einmal pro Person aufbereitete Befragung ist noch nicht Teil des wiederholbaren Standardablaufs. Umfang und Interpretation der Zeit- und Abbruchkennzahlen müssen für die Studie präzisiert werden.
4. **Die Datenbank ist kein vollständiger Fragebogenprüfer.** Die Oberfläche kontrolliert die Pflichtantworten. Supabase speichert JSON und prüft Zugriffsrechte, aber nicht sämtliche inhaltlichen Regeln einer gültigen Studienteilnahme. Für den Studienbericht sind deshalb nachvollziehbare Vollständigkeits- und Ausschlussregeln erforderlich.
5. **Automatisierte Tests ersetzen den Zielgruppentest nicht.** Sie bestätigen das geprüfte Programmverhalten. Verständlichkeit, Intuitivität, empfundener Aufwand und Profilpassung werden mit den mindestens 30 Personen ab 50 untersucht.

## Nachprüfbare Fundstellen

- Anzeige und Pflichtfelder: `src/labels.js` (`SURVEY`), `src/screens/SurveyScreen.jsx`.
- Ablauf und früher Zugang zur Befragung: `src/app/model.js` (`canStartSurvey`), `src/App.jsx`.
- Speichern der Fragebogenwerte: `src/logging/logger.js` (`setSurvey`).
- Übertragung und Abschlussmerkmal: `src/sync/sync.js` (`sessionRow`, `createSync`).
- Datenbankrechte: `supabase/migrations/20261031000000_sessions.sql`; HTTP-Prüfung: `scripts/check-sync.mjs`.
- Export und Berichterstellung: `src/logging/export.js`, `scripts/evaluate.mjs`, `src/analysis/evaluation.js`.
- Tests der Befragung: `src/screens/survey.test.js`, `src/app/survey.test.js`, `src/logging/survey-sync.test.js` und `src/sync/sync.test.js`.

Der Live-Browsertest wurde für diese Prüfung ausgeführt; er ist bisher kein automatisch laufender Bestandteil des GitHub-Workflows.
