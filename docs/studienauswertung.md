# Studienauswertung ab Version 0.13

Stand 02.11.2026. Erweiterte Befragung, getrennte Abschlussmerkmale und automatischer Studienbericht. Die Profil- und Kartenauswahlregeln bleiben `demo-0.9`.

## Ein Befehl für das Team

Im Projektordner in einem PowerShell-Terminal:

```powershell
npm run studie
```

Der Befehl lädt die Sitzungen aus Supabase, sichert einen neuen JSON-/Ereignisexport und erstellt den aktuellen Bericht im Ordner `auswertung`. Die bereits hinterlegten Werte in `.env.local` werden verwendet. Das Verzeichnis ist von Git ausgeschlossen. Rohdaten und ältere datierte Dateien bleiben erhalten; die aktuellen Berichtsdateien werden bei jedem Lauf neu erzeugt.

Sind noch keine Sitzungen vorhanden oder wurden alle ausgeschlossen, entsteht ausdrücklich ein leerer aktueller Bericht. Frühere Ergebniszeilen werden darin nicht weitergeführt.

Für bereits heruntergeladene Daten bleibt der bisherige Befehl verfügbar:

```powershell
npm run auswertung -- auswertung/sitzungen-DATUM.json
```

Interne Einrichtungstests (`participantCode = SETUP_CHECK` oder `appVersion = setup-check`) werden automatisch ausgeschlossen. Eure eigenen Probedurchläufe erkennt die Software nicht anhand eines Namens. Ihr könnt sie mit ihrer Teilnahmenummer ausschliessen:

```powershell
npm run studie -- --exclude-session EURE-TEILNAHMENUMMER
```

Mehrere Nummern mit Komma trennen. `--exclude` bleibt für selbst vergebene Team-Kennungen verfügbar. `--include-setup-check` ist für die bewusste Prüfung künstlicher Daten vorgesehen.

## Diese Dateien sind die Hauptauswertung

| Datei | Zweck |
|---|---|
| `zusammenfassung.txt` | Lesbarer Bericht zu Datenbasis, Abschluss, Bedienung, Aufwand, Befragung und Profilprüfung |
| `teilnahmen.csv` | Eine Zeile pro Sitzung: Abschlussmerkmale, Anzahl Karten, Eingabemethoden, Runden und Zeitangaben |
| `befragung.csv` | Eine Zeile pro Sitzung mit Fragebogenfassung, Werten und Antworttexten; fehlende Befragungen bleiben sichtbar |
| `befragung-zusammenfassung.csv` | Häufigkeiten je Frage und Fassung, gültige Bewertungsbasis, fehlende Werte und „nicht ausprobiert“ |

Die neuen CSV-Dateien verwenden Semikolon und UTF-8 mit BOM für Excel. Antworttexte und Kommentare werden als Text exportiert. Rohwerte bleiben zusätzlich im JSON erhalten. Die einmalig erstellten Dateien `befragung-pro-teilnahme-2026-11-01.csv` und `erste-einordnung-2026-11-01.md` sind historische Momentaufnahmen; sie sind nicht die aktuellen Standarddateien.

Die technische Zusatzanalyse bleibt verfügbar: `kontrollkarten-zusammenfassung.txt`, `lernkurve.csv`, `kontrollkarten.csv`, `sitzungen.csv` und `varianten.csv`. Sie prüft Vorhersagen für Untergruppen in Runde 2. Sie ist kein Gesamtgenauigkeitswert des fertigen Profils.

## Sechs Auswahlfragen und ein freiwilliger Text

Neue Befragungen tragen `survey.version = study-v2`:

| Feld | Inhalt | Antworten |
|---|---|---|
| `ease` | Allgemeine Bedienbarkeit | 1 sehr schwierig bis 5 sehr einfach |
| `swipeClarity` | Verständlichkeit des Bewertens durch Wischen | 1 gar nicht bis 5 sehr verständlich oder `not_tried` |
| `effort` | Empfundene Anstrengung | 1 gar nicht bis 5 sehr anstrengend |
| `repetition` | Unnötig ähnliche oder wiederholte Fragen/Karten | 1 nie bis 5 sehr oft |
| `fit` | Passung des angezeigten Profils | 1 gar nicht bis 5 sehr gut |
| `length` | Empfundene Länge | 1 zu kurz, 2 gerade richtig, 3 zu lang |
| `remarks` | Freiwilliger Verbesserungshinweis | Text |

`not_tried` bedeutet „Nicht ausprobiert / kann ich nicht beurteilen“. Es ist eine eigene Kategorie und zählt nicht als mittlere, schlechte oder fehlende Bewertung. Die übrigen Fragen müssen beantwortet sein; der Text bleibt freiwillig.

Die frühere Vier-Fragen-Fassung wird als `legacy-v1` erkannt. Ihr Feld `clarity` beschreibt die Verständlichkeit der Antwortmöglichkeiten, nicht ausdrücklich das Wischen. Alte und neue Fassungen werden getrennt ausgewertet. Anstrengung, Wiederholung und Wischverständlichkeit werden bei alten Daten als **nicht erhoben** behandelt. Diese Daten bleiben lesbar, zählen aber nicht als Antworten auf die neuen Fragen.

Jede Frage wird einmal je abgeschickter Sitzung ausgewertet. Fehlende und ungültige Antworten werden separat angegeben. Es wird kein gemeinsamer Gesamtscore aus unterschiedlichen Fragen berechnet. Die Freitextkommentare stehen in `befragung.csv` und müssen vom Team nach Themen eingeordnet werden.

## Drei verschiedene Abschlussangaben

Die Angaben stehen in Supabase innerhalb der vorhandenen JSON-Spalte unter **`data.completion`** und in den CSV-Dateien. Es ist keine neue Datenbankmigration nötig.

| Merkmal | Bedeutung |
|---|---|
| `surveySubmitted` | Die Befragung wurde abgeschickt. |
| `roundsCompleted` / `rounds` | Anzahl und Einzelstatus der vier Runden; Runden ohne passende Karten sind gesondert markiert. |
| `allRoundsCompleted` | Alle vier Rundenplätze sind abgeschlossen, einschliesslich berechtigt leerer Runden. |
| `studyCompleted` | Alle Runden sind abgeschlossen, und die Befragung wurde danach abgeschickt. |

Wenn der zeitliche Nachweis bei alten Daten fehlt, bleibt `studyCompleted` unbekannt. Wenn die Person zuerst die Befragung abschickt und später Runden ergänzt, wird sie nicht nachträglich als vollständiger Ablauf mit anschliessender Befragung gezählt.

Die bisherige Datenbankspalte **`finished` bleibt aus Kompatibilitätsgründen das ältere Befragungskennzeichen**. Für Studienberichte sind die eindeutigen Merkmale in `data.completion` massgeblich. Die App zeigt nach dem Absenden sowohl „Befragung abgeschickt“ als auch die Anzahl abgeschlossener Runden. Ein früheres Ende bleibt möglich und wird als kürzerer Ablauf ausgewiesen.

Der Bericht berechnet die Rundenübersicht für alte und neue Sitzungen anhand derselben Logik wie die Oberfläche erneut. Allein ein hoher Profil-Prozentwert oder ein vorhandenes `endedAt` genügt nicht als Nachweis des vollständigen Studienablaufs.

## Karten, Bedienung und Zeit

- Gültig beantwortete Karten berücksichtigen Rückgängig. Bewertungsaktionen und Rückgängig werden zusätzlich separat gezählt.
- Wischen, Knöpfe, Link und Tastatur werden je Sitzung ausgewiesen. Nicht erfasste Methoden bleiben unbekannt.
- Die Profilzeit reicht vom ersten Startknopf-Ereignis bis zum ersten vollständigen Rundenabschluss. Die Gesamtzeit reicht bis zum Abschicken der Befragung. Spätere Besuche fertiger Runden ändern den ursprünglichen Abschlusszeitpunkt nicht.
- Fehlt das Startknopf-Ereignis in alten Daten, wird ersatzweise die Einwilligung oder erste Kartenantwort verwendet; diese Quelle steht ausdrücklich in der Tabelle.
- Rundenzeiten umfassen den ersten protokollierten Rundenstart bis zum letzten Rundenende. Kontrollkarten, Gerichte, Unterbrechungen und erneute Aufrufe innerhalb dieses Zeitraums sind enthalten. Es sind verstrichene Zeiten und keine reine aktive Bedienzeit.
- Fehlende oder widersprüchliche Zeitpunkte erzeugen leere Werte. Eine Anmeldung ohne Kartenantworten wird nicht als Person mit null Sekunden Bearbeitungszeit gerechnet.

Die Zahl vollständiger Sitzungen mit aktueller Befragung und Altersgruppe ab 50 wird gesondert ausgewiesen. Sie ersetzt nicht die Kontrolle, ob tatsächlich mindestens 30 unterschiedliche geeignete Personen teilgenommen haben. Pilot, eigene Probeläufe und Haupterhebung müssen im Team getrennt dokumentiert werden.

## Beobachtung bleibt notwendig

Benötigte Hilfe, erfolglose Wischversuche, Pausen und Gründe für ein früheres Ende lassen sich aus abgeschickten Antworten nicht zuverlässig ableiten. Der Bericht erfindet dafür keine Nullwerte. Nutzt ergänzend [beobachtungsbogen-vorlage.csv](beobachtungsbogen-vorlage.csv): eine Kopie im ignorierten Ordner `auswertung` anlegen und dort pro Teilnahmenummer ausfüllen. Diese manuellen Notizen werden bisher nicht automatisch in den Bericht eingelesen.

## Technische Umsetzung

Fragen und Optionen sind gemeinsam in `src/study/survey.js` definiert. Formular, Logger und Auswertung verwenden diese Definition. Die Abschlusslogik in `src/study/completion.js` wird in App, Speicherung und Bericht verwendet. `scripts/study.mjs` verbindet Zentralexport und Auswertung. Für die Datenspeicherung werden die vorhandene Tabelle und ihre bestehenden Zugriffsregeln weiterverwendet.

## Durchgeführte Prüfung am 02.11.2026

- 364 automatisierte Tests und der Produktionsbuild erfolgreich.
- Lokalen Produktionsbuild im Browser mit der vorhandenen Supabase-Datenbank geprüft: vier Runden mit je 13 Karten, echte Wischgesten und Antwortknöpfe, sechs Kontrollkarten und die neue Befragung. Sichtbare Antworten, gespeicherte Werte und daraus erzeugter Studienbericht stimmen überein.
- Frühen Abschluss nach Runde 1 mit ausschliesslicher Knopfbedienung und „Nicht ausprobiert“ geprüft. Der Bericht weist ihn als unvollständigen Studienablauf aus.
- Befragung bei 360 × 640 Pixeln mit 130 Prozent Schriftgrösse geprüft: kein horizontales Scrollen und kein verdecktes Textfeld.
- Nur die für diese Prüfungen neu erzeugten künstlichen Sitzungen anschliessend entfernt; vorhandene Daten bleiben erhalten.

Diese Prüfungen betreffen die lokale Version 0.13 und die vorhandene Datenbank. Die Veröffentlichung der neuen Oberfläche auf GitHub Pages ist ein eigener Schritt.
