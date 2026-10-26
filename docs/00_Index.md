# Technische Analyse des Swipe-Prototyps (Stand 26.10.2026)

Dokumentation der tatsächlichen Funktionsweise des Prototyps vor der Nutzerstudie, abgeleitet aus dem Code.
Erstellt mit Claude Code im Auftrag des Teams (26.10.2026); alle Aussagen sind am Code geprüft, Tests wurden ausgeführt.

| Dokument | Inhalt |
|---|---|
| [01_Systemuebersicht.md](01_Systemuebersicht.md) | Aufbau, Ablauf, Datenmodell, Begriffe, Konfiguration |
| [02_Kartenauswahl_und_Swipe_Logik.md](02_Kartenauswahl_und_Swipe_Logik.md) | Welche Karten wann kommen, Wirkung jeder Antwort, Zusammenspiel der Runden, drei ausgeführte Ablaufbeispiele |
| [03_Filter_und_Ausschlusslogik.md](03_Filter_und_Ausschlusslogik.md) | Allergien, Ernährungsformen, Speisevorschriften, Notizen, „Vertrage ich nicht“; Lücken |
| [04_Profilberechnung.md](04_Profilberechnung.md) | Direkte Bewertungen, Vermutungen, Profilstand, Dashboard, Gerichte und Küchen |
| [05_Flowcharts.md](05_Flowcharts.md) | Diagramme A bis E (Mermaid, geprüft) |
| [06_Testkonzept_und_Ergebnisse.md](06_Testkonzept_und_Ergebnisse.md) | Vorhandene Tests, neuer Testplan T01 bis T23 mit Ergebnissen, nicht getestete Bereiche |
| [07_Frontend_Bewertung.md](07_Frontend_Bewertung.md) | Oberfläche und Bedienung für Personen ab 50 |
| [08_Anwendungslogik_Bewertung.md](08_Anwendungslogik_Bewertung.md) | Befunde B1 bis B10, Grenzen, Alternativen |
| [09_Studienbereitschaft.md](09_Studienbereitschaft.md) | Checkliste, Prioritäten vor der Studie, Daten, Versionierung, Pilot gegenüber Hauptstudie |
| [10_Zusammenfassung_Team.md](10_Zusammenfassung_Team.md) | Kurzfassung für das Gespräch mit dem Dozenten |

## Analysierter Stand

| | Wert |
|---|---|
| Git-Commit | `60bc8c5` (main, 24.10.2026, „CSS-Konflikt beheben und Antwortknöpfe wieder sichtbar machen“) |
| `APP_VERSION` (src/config.js) | 0.9.0-demo |
| `RULE_VERSION` (src/logic/engine.js) | demo-0.6 |
| `ROUND_FLOW` | staged-v1 |
| Kartenkatalog `src/data/catalog.json` | 167 Karten: 13 Gruppen, 36 Untergruppen, 96 konkrete Lebensmittel, 22 Gerichte; SHA-256 `d69605d9…f88161` |
| Standardkonfiguration | 13 Karten je Runde (Maximum 15), 4 Runden, adaptive Auswahl, 6 Kontrollkarten, Skala Runde 1 mit drei Begriffen, Fotos, Registrierung an |
| Tests | 314 vorhandene plus 26 neue, alle bestanden (`npm test`) |

Die vollständigen Prüfsummen und ein Vorschlag zum Einfrieren der Studienversion stehen in [09_Studienbereitschaft.md](09_Studienbereitschaft.md).

## Lesehinweise

- **Beobachtung** bezeichnet Verhalten, das direkt aus dem Code folgt oder in einem ausgeführten Test geprüft wurde. Die Fundstelle steht jeweils als `Datei → Funktion`.
- **Einschätzung** bezeichnet eine Bewertung oder Empfehlung des Analyseteams. Sie ist als solche markiert.
- **Offen** bezeichnet eine Entscheidung, die das Team oder nurec treffen muss.
- Quellenlabels wie im README: [A] Aufgabenstellung, [K] Dozent, [D] nurec-Konzept v0.2, [V] eigener Entscheid des Teams.
- Die älteren Dokumente ([messkonzept.md](messkonzept.md), [dozentenfeedback-2026-10-19.md](dozentenfeedback-2026-10-19.md), [allergieauswahl-dashboard.md](allergieauswahl-dashboard.md), [bilder-a15.md](bilder-a15.md), [bilder-a16.md](bilder-a16.md)) bleiben unverändert gültig. Wo sie mit dieser Analyse abweichen, ist das in [08_Anwendungslogik_Bewertung.md](08_Anwendungslogik_Bewertung.md) vermerkt.

## Neue Dateien dieser Analyse

| Datei | Zweck |
|---|---|
| `src/logic/studienszenarien.test.js` | Testplan T01 bis T23, läuft mit `npm test` |
| `src/test/szenarien.js` | Beispielszenarien und Abspielfunktion für Tests und Skript |
| `scripts/ablauf-beispiele.mjs` | Druckt die Ablaufbeispiele: `node scripts/ablauf-beispiele.mjs [A|B|C] [--holdout=0] [--limit=15]` |

Produktivlogik, Daten und bestehende Tests wurden nicht verändert.
