# 06 Testkonzept und Ergebnisse

Stand 26.10.2026. Alle hier genannten Ergebnisse stammen aus tatsächlich ausgeführten Läufen auf dem Analysegerät (Windows 11, Node 22.20). Was nicht ausgeführt wurde, steht in Abschnitt 5.

Nachtrag 29.10.2026, Regelversion `demo-0.9`: Runde 4 hat wie die Vorrunden standardmässig 13 Karten. Die Testfälle unten wurden entsprechend aktualisiert. Prüfung nach der Korrektur: `npm test` mit **321 bestandenen Tests, 0 Fehlern** und `npm run build` erfolgreich. Zusätzliche Regressionen prüfen die Auswahl anhand aller drei Vorrunden, den Vorrang konkreter Zutatenbewertungen, Fortschritt und Abschluss bei 13, gemischte Antworten, Rückgängig und gespeicherte längere Sitzungen. Browser-Prüfskripte wurden angepasst, aber nicht ausgeführt.

## 1. Vorhandene Tests

`npm test` führt alle `src/**/*.test.js` mit `node --test` aus; JSX und JSON werden über `scripts/test-hooks.mjs` wie im Build geladen, Komponententests laufen in jsdom. Vor dieser Analyse: **314 Tests in 36 Dateien, alle bestanden** (Laufzeit 16.4 s).

| Bereich | Dateien | Was geprüft wird |
|---|---|---|
| Kartenauswahl | `logic/selection.test.js`, `logic/engine.test.js` | Rangfolge nach nurec Kap. 6 und 11, Klärung nach „Kenne ich nicht“, Ausnahme, Kontrast, Favoriten, negative Gruppe, Kontrollkarten im Budget, feste Reihenfolge, Runde = Ebene, Rückgängig, „Vertrage ich nicht“ mit Detailauswahl, Rundenstatus, Fortsetzen, die passendsten Gerichte innerhalb desselben Kartenlimits wie die Vorrunden |
| Ausschlüsse | `logic/filter.test.js` (20), `logic/diet.test.js` (17), `logic/stage0.test.js` (15) | Katalogkonsistenz, alle 14 Allergene, Ernährungsformen, Allergene granular, Karten-Ausschluss mit Nachkommen, Gerichte mit Zutaten, Notizen, Hinweise und Titel, Frage 1 in drei Teilen, Gelatine, Speisevorschriften, Redundanzprüfung, Suche |
| Profil | `logic/profile.test.js` (10), `logic/preferences.test.js` (7), `logic/dashboard.test.js` (11), `logic/cuisines.test.js` (4) | Profiländerungen im Log, Vermutungen und Richtung, Profilstand, Dashboard-Listen, Küchentendenz |
| Kontrollkarten, Auswertung | `logic/holdout.test.js` (4), `analysis/evaluation.test.js` (9) | geschichtete Ziehung aus der sessionId, Lernkurve, Vergleichswerte, Bootstrap, Pilot-Kennzahlen |
| Ablauf, Zustand | `app/model.test.js` (18), `logic/rounds.test.js` (6), `App.test.js` (5) | Bildschirmwechsel, Anmeldung mit Vornamen, Zusammenfassung, vier Runden, leere Runden, gespeicherte Stände, Rundenübersicht |
| Oberfläche | `components/*.test.js` (27), `screens/*.test.js` (19), `labels.test.js` (6), `design.test.js` (6), `tints.test.js` (3) | Knöpfe je Antwort, Detailauswahl, Antwortzeit, Begriffe je Runde, Rundenübersicht, Allergiekacheln, Suche, Bilder und Platzhalter, Profil-Dashboard, Anmeldung, keine harten Texte, Design-Tokens, Kontraste |
| Protokoll, Konfiguration, Daten | `logging/logging.test.js` (15), `logging/privacy.test.js` (3), `config.test.js` (9), `data/*.test.js` (14), `logic/foodSearch.test.js` (13), `logic/swipe.test.js` (7) | CSV-Spalten, Legacy-Kennzeichnung, Vorname nur als `participantName` (abschaltbar), keine Handynummer, URL-Parameter, Bilder und Nachweise, Suche, Wischschwellen |

Zahlen in Klammern: `test()`-Aufrufe je Datei. Dazu kommen zwei Playwright-Skripte (`scripts/check-mobile.py`, `scripts/check-profile.py`) für Mobile-Kriterien und Kartenbedienung im echten Browser; sie brauchen `npm run preview` und Chromium und wurden in dieser Analyse **nicht** ausgeführt. Das Team berichtet in [allergieauswahl-dashboard.md](allergieauswahl-dashboard.md) von 70 bzw. 44 Prüfungen ohne Befund (24.10.2026).

## 2. Ausgeführte Läufe (26.10.2026)

| Lauf | Ergebnis |
|---|---|
| `npm test` vor den Änderungen | 314 bestanden, 0 fehlgeschlagen, 16.4 s |
| `npm test` nach den Änderungen | **340 bestanden**, 0 fehlgeschlagen, 16.6 s |
| `npm run build` | erfolgreich (Vite 8, 1996 Module, 1.3 s) |
| `node scripts/ablauf-beispiele.mjs` | drei Szenarien gedruckt, identisch zu Test T23 |
| Mermaid-Prüfung von `docs/05_Flowcharts.md` | 6 Diagramme gültig |

Während der Entwicklung des Testplans gab es zwei Fehlschläge, beide in den neuen Tests selbst, nicht im Prototyp: ein unvollständiger Antwortgeber liess die Simulation endlos laufen (T11), und T21 erwartete gleiche Gerichte-Reihenfolgen, die sich wegen der Zutatenaffinität unterscheiden. Beide Tests wurden korrigiert; die Erkenntnis aus T21 steht in [02](02_Kartenauswahl_und_Swipe_Logik.md), Abschnitt 7.

## 3. Neuer Testplan (`src/logic/studienszenarien.test.js`)

Alle Tests sind deterministisch: Kontrollkarten aus der `sessionId`, Zeitstempel aus einer festen Uhr, Standardkonfiguration (Limit 13, adaptiv, 6 Kontrollkarten). Einzelne Tests: `node --import ./scripts/test-setup.mjs --test --test-name-pattern="T19" src/logic/studienszenarien.test.js`.

| ID | Testziel | Ausgangssituation | Eingaben und Swipes | Erwartetes Ergebnis | Tatsächliches Ergebnis | Status |
|---|---|---|---|---|---|---|
| T01 | Normale Nutzung ohne Einschränkungen | keine Angaben | alles „Mag ich“ | vier Runden, je Runde nur Stufe = Runde und höchstens 13 Karten, keine doppelt, 7 normale plus 6 Kontrollkarten in Runde 2, die passendsten 13 aus 64 Gerichten | wie erwartet | bestanden |
| T02 | Eine Allergie | Haselnuss in Frage 2 | alles „Mag ich“ | keine Karte mit Tag `hazelnut` in vier Runden, „Nüsse und Samen“ bleibt mit „Ohne Haselnüsse“, Birchermüesli fehlt, 13 Vorschläge aus 63 erlaubten Gerichten | wie erwartet | bestanden |
| T03 | Mehrere Ausschlüsse | Laktose, alles mit Gluten, Eier | alles „Mag ich“ | kein betroffenes Tag in vier Runden, 10 Gruppen, 13 Gerichte (Chili con Carne, Gemüsecurry, Ratatouille und zehn neue ohne Milch, Gluten und Ei) | wie erwartet | bestanden |
| T04 | Vegetarisch und vegan | Frage 1 | alles „Mag ich“ | vegetarisch: 11 Gruppen, 13 aus 32 erlaubten Gerichten, kein Fleisch oder Fisch; vegan: 9 Gruppen, 12 Gerichte | wie erwartet | bestanden |
| T05 | Religiöse Speisevorschrift | halal in Teil C, einmal ohne, einmal mit bestätigten Vorschlägen | alles „Mag ich“ | ohne Bestätigung keine Wirkung und 13 Gruppen; mit Schwein, Gelatine, Alkohol: keine Schweinekarte, keine Gerichte mit Schwein oder Wein; keine Religionsangabe im Ergebnis | wie erwartet | bestanden |
| T06 | Überwiegend positiv | keine | alles „Mag ich“ | Runde 2 nur Kontrastkarten, Runde 3 nur `stage3_detail` mit höchstens 2 je Untergruppe, Stufe 1 volle 35 Punkte | wie erwartet | bestanden |
| T07 | Überwiegend negativ | keine | alles „Mag ich nicht“ | Runde 2 nur Ausnahmen (höchstens eine je Gruppe) und negative Reste, Runde 3 nur `stage3_after_negative` mit höchstens 2 je Untergruppe, 13 Gerichte mit der besten Zutatenaffinität, keine Gruppe ausgeschlossen | wie erwartet | bestanden |
| T08 | Viele unbekannte Lebensmittel | keine | alles „Kenne ich nicht“ | Runde 2 nur Klärungskarten (höchstens 2 je Gruppe), Profilstand 0 %, keine Geschmackskategorie gefüllt, keine Gerichte im Dashboard | wie erwartet | bestanden |
| T09 | Verschiedene Antworten in Folgerunden | keine | Obst „Mag ich“; Beeren „Mag ich sehr“, Zitrusfrüchte „Mag ich nicht“ bzw. beide „Mag ich“ | verschieden: übrige Untergruppen (`stage2_difference`) und Erdbeeren, Orangen (`stage3_difference`); gleich: nichts mehr aus Obst in Runde 2, nur Lebensmittel der beiden Untergruppen in Runde 3 | wie erwartet | bestanden |
| T10 | Stark eingeschränkte Gerichte | vegan plus Gluten; vegan plus Sellerie, Weizen, Soja, Fruchtgemüse, Reis | alles „Mag ich“ | sechs Gerichte; null Gerichte: Sitzung endet nach Runde 3, Runde 4 „abgeschlossen, keine passenden Karten“ | wie erwartet | bestanden |
| T11 | Wiederholte Durchläufe | keine | festes Antwortmuster, zweimal; zweite sessionId | identische Ereignisse und Profile; andere sessionId: andere Kontrollkarten, gleiche Runde 1 | wie erwartet | bestanden |
| T12 | Konsistente Profilberechnung | Szenario A | 52 Antworten | jede Antwort genau einmal im Profil, Dashboard-Summe = Antworten ohne „Vertrage ich nicht“, Profilstand monoton und höchstens 100, keine Vermutung für beantwortete Karten | wie erwartet | bestanden |
| T13 | Keine Karten übrig | alle 13 Gruppen in Frage 3 | keine | keine Karte in Runde 1 bis 4, keine weitere Runde, keine Kontrollkarten | wie erwartet | bestanden |
| T14 | „Vertrage ich nicht“ wirkt in späteren Runden | keine | Fisch und Meeresfrüchte „Vertrage ich nicht“; Nüsse nur Haselnüsse | nichts mehr aus Fisch, Eglifilets und Pad Thai fehlen; teilweise: Haselnüsse weg, Baumnüsse und Kerne als `stage2_after_intolerant` | wie erwartet | bestanden |
| T15 | Ist-Zustand Befund B1 | Eier bzw. Milchprodukte beim Wischen gegenüber Allergen im Onboarding | | Onboarding Ei verbirgt Zopf, Bandnudeln, Lasagne, Schnitzel, Gemüsewähe; Wischen auf Eier lässt sie sichtbar, Rösti mit Spiegelei fällt weg; Milchprodukte beim Wischen 46 Gerichte, Laktose 32 | wie erwartet (dokumentiert die Lücke) | bestanden, **Entscheid offen** |
| T16 | Negative Gruppe kein Ausschluss | keine | Gegartes Gemüse „Mag ich nicht“ | Runde 2: Wurzelgemüse als Ausnahme, übrige am Schluss; Zucchetti nie ausgeschlossen; keine Ausschluss-Einträge; Runde 3 `stage3_after_negative` | wie erwartet | bestanden |
| T17 | Rückgängig | keine | erste Karte „Vertrage ich nicht“, dann Rückgängig | gleiche Karte kommt wieder, sichtbar, keine Antwort gezählt, kein Ausschluss | wie erwartet | bestanden |
| T18 | Kontrollkarten | keine | Gruppe der ersten Kontrollkarte „Vertrage ich nicht“ | sechs verschiedene Gruppen gezogen; fünf Kontrollkarten gezeigt, der freie Platz an eine normale Karte (8 + 5); am Ende keine offen | wie erwartet | bestanden |
| T19 | Anzahl und Auswahl der Gerichte | keine; Laktose; Milcheiweiss; Gluten; vegetarisch | Reis „Mag ich sehr“, Fleisch „Mag ich nicht“ | 13 Vorschläge aus 64 Gerichten; erlaubter Pool bei Laktose und Milcheiweiss 32, Gluten 29, vegetarisch 32; Auswahl und Reihenfolge nach Zutaten-Zuneigung, ohne Antworten Katalogreihenfolge, Pilot-Limit auch in Runde 4 wirksam | wie erwartet | bestanden |
| T20 | Budget Runde 2 | keine | alles „Mag ich“ | mindestens 8 Kontrastkarten nach Runde 2 offen, Stufe 2 nicht abgeschlossen, Stufe-2-Punkte unter 30 | wie erwartet | bestanden, **Befund B3** |
| T21 | „Sehr gern“ gegenüber „Eher gern“ auf einer Gruppe | Szenario A mit Obst LIKE bzw. PREFER | | Runden 1 bis 3 identisch, Runde 4 anders sortiert, Vermutung stärker | wie erwartet | bestanden, **Befund B6** |
| T22 | Ist-Zustand Befund B2 | keine | Fisch „Kenne ich nicht“, dann Fisch und Krebstiere „Kenne ich nicht“ | Runde 2 keine dritte Klärung; Runde 3 bietet vier Lebensmittel als `stage3_after_unfamiliar` | wie erwartet (dokumentiert) | bestanden, **Entscheid offen** |
| T23 | Ablaufbeispiele A, B, C | siehe [02](02_Kartenauswahl_und_Swipe_Logik.md) | | exakte Kartenfolge je Runde (Runde 4: je 13 Gerichte), Profilstand 81, 85, 89 %, 97, 69, 102 Vermutungen, Küchentendenzen passend zu den kürzeren Runden, Hinweise auf Karten | wie erwartet | bestanden |

Zuordnung zu den geforderten Szenarien: normale Nutzung T01, T06; eine Allergie T02; mehrere Ausschlüsse T03; vegetarisch und vegan T04; religiös T05; überwiegend positiv T06; überwiegend negativ T07; viele unbekannt T08; unterschiedliche Entscheidungen in Folgerunden T09, T21; stark eingeschränkte Gerichte T10, T19; wiederholte Durchläufe T11; Profilberechnung konsistent T12; Grenzfall ohne Karten T13; dazu T14 bis T18 und T20, T22 für die Abhängigkeiten.

## 4. Was die Tests nicht abdecken

Nicht getestet und auch nicht aus dem Code ableitbar, weil es echte Nutzung braucht:

- Verständlichkeit der Begriffe, Bilder und Fragen für Personen ab 50 (Pilot, Kurzinterview nach [messkonzept.md](messkonzept.md)).
- Wischen auf echten Geräten (Schwellen 110 px, 90 px, Schnippen), Fehlbedienungen, Dauer je Karte. Nur die Logik der Schwellen ist getestet (`swipe.test.js`).
- Bildladezeiten im Feld; der Platzhalter nach 3 s ist nur in jsdom getestet.
- Screenreader, sehr grosse Schrift auf echten Geräten (Playwright-Skripte vorhanden, nicht ausgeführt).

Nicht getestet, obwohl es sich automatisieren liesse (Vorschläge):

- Profilstand nach nachträglich im Profil hinzugefügten Ausschlüssen (kann sinken).
- Vollständige Sitzung mit `?selection=fixed` in allen vier Runden (nur Teilaspekte in `selection.test.js`).
- Profiländerungen zwischen zwei Runden und ihre Wirkung auf die nächste Runde (Einzelaspekt in `selection.test.js`).
- Kartenlimit unter 7 mit sechs Kontrollkarten (dann verdrängen Kontrollkarten alle normalen Untergruppen, `drawHoldout` begrenzt nur auf das Limit).
- Export und Wiedereinlesen einer Sitzung über `npm run auswertung` mit den drei Szenarien (die Auswertung ist mit simulierten Sitzungen getestet, nicht mit diesen).

## 5. Reproduzierbarkeit

- Zufall: nur die Kontrollkarten, Startwert `sessionId` (`holdout.js → seededRandom()`); Tests und Szenarien verwenden feste IDs.
- Zeit: `src/test/simulate.js` nutzt eine feste Uhr; Antwortzeiten in den Szenarien sind Konstanten.
- Jeder Test läuft gegen den eingecheckten Katalog; ändert sich `catalog.json`, können T19, T23 und die Zählungen abweichen und müssen bewusst angepasst werden. Das ist beabsichtigt: Sie dokumentieren den Stand `demo-0.6` mit Katalog-Prüfsumme `d69605d9…` ([00_Index.md](00_Index.md)).
- T15 und T22 beschreiben den Ist-Zustand. Entscheidet das Team anders (siehe [08](08_Anwendungslogik_Bewertung.md)), sind diese beiden Tests zusammen mit dem Code zu ändern, damit sie die neue Regel festhalten.
