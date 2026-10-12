# Geschmacksprofil 50+ · Prototyp

Mobiler Swipe-Prototyp zur Geschmacksprofilerkennung bei Personen ab 50 (WI-Projekt, Auftraggeber nurec).
Version 0.4 nach dem Zwischencheck vom 12.10.2026. Die adaptive Kartenauswahl ist bewusst noch nicht gebaut:
Sie ist die nächste Eigenleistung des Teams (siehe „Logik austauschen“).

Quellenlabels in diesem Dokument: [A] Aufgabenstellung, [K] Aussagen von Tibor (Kickoff, Zwischencheck),
[D] bereitgestellte Dokumente (nurec-Konzept), [V] eigene Entscheidung des Teams.

## Ablauf

1. **Start:** kurze Einführung.
2. **Anmelden:** Vorname und Alter freiwillig, Einwilligung Pflicht, kein Passwort. Unter „Für die Testleitung“ die Teilnehmer-Nr.
3. **Fragebogen (Stufe 0):** drei Fragen, eine pro Bildschirm, Details nur bei „Ja“.
4. **Zusammenfassung:** feste Regeln zum Bestätigen oder Ändern, Notizen und die Karten der ersten Runde.
5. **Mini-Tutorial:** animierte Gesten, alle fünf Antworten, Rückgängig. Abschaltbar mit `?tutorial=0`.
6. **Runde:** Stufe-1-Karten in fester Reihenfolge, höchstens `ROUND_CARD_LIMIT` (Standard 10).
7. **Zwischenstand:** Antworten nach Gruppen und alle festen Regeln.

## Antworten auf einer Karte

| Geste | Sichtbar | Intern | Bedeutung |
| --- | --- | --- | --- |
| Links | Mag ich nicht | `DISLIKE` | Geschmack, kein Ausschluss |
| Rechts | Mag ich | `LIKE` | Geschmack |
| Oben | Mag ich sehr | `PREFER` | Geschmack (im Kickoff „Superlike“) |
| Knopf | Kenne ich nicht | `UNFAMILIAR` | keine Bewertung |
| Textlink | Vertrage ich nicht | `INTOLERANT` | harter Ausschluss, kein Geschmack |
| Knopf | Rückgängig | `UNDO` | nimmt die letzte Antwort zurück |

Begründung [V]: symmetrisch, kurz und nah an Dislike/Like/Superlike [K]. „Eher ungern“ war beim Zwischencheck unklar [K].
Alle Beschriftungen stehen in `src/labels.js`; ein Test verhindert, dass sie hart im JSX auftauchen.
Die Bedeutung jeder Antwort (Geschmackssignal ja/nein, harter Ausschluss, zählt fürs Limit) ist in `src/logic/answers.js` dokumentiert.

**„Vertrage ich nicht“** [V] ist bewusst nur ein dezenter Textlink unter den Knöpfen: keine fünfte Wischrichtung, kein gleichwertiger Knopf, Tippfläche trotzdem ≥ 44 × 44 px. Er trennt Verträglichkeit auch beim Wischen vom Geschmack und gibt dem Onboarding-Flag „Ich bin mir nicht sicher, ob es weitere gibt“ eine Funktion [K]. Auf Familienkarten (z. B. Nüsse und Samen) öffnet er dieselbe Detailauswahl wie im Onboarding, damit nicht wegen Haselnüssen alle Nüsse wegfallen. Danach erscheint „Wir schlagen dir … nicht mehr vor.“ mit Rückgängig.

**Rückgängig** [V] erscheint, sobald eine Karte beantwortet ist. Technisch ist das Event-Log die einzige Quelle der Wahrheit: Der Zustand wird immer aus den Ereignissen abgeleitet (`replay`), UNDO ist ein eigenes Ereignis. So laufen Oberfläche, Profil und Protokoll nie auseinander.

## Stufe 0: harte Ausschlüsse

Grundlage ist nurec v0.2, Kap. 2 [D]. Die Bereiche 0.1 bis 0.5 sind als drei Fragen umgesetzt [V]; 0.6 (Marken und Händler) fehlt bewusst.

| Frage | Bereiche | Umsetzung |
| --- | --- | --- |
| Feste Ernährungsweise | 0.4 | Tabelle `diets` in `stage0.json`: vegan, vegetarisch, pescetarisch schliessen Tags aus `animalOrigin` aus |
| Allergien und Unverträglichkeiten | 0.1 bis 0.3 | 14 Hauptallergene (LIV Anhang 6, LMIV Anhang II) in `allergens.json`; 8 als Kacheln, der Rest über „Weitere anzeigen“ und Suche; Auswahl als Chips |
| Nie vorschlagen | 0.5 | Schnellauswahl, Suche über Karten und Familien, Notizen ohne Treffer |

- Milch ist getrennt in **Laktose (Unverträglichkeit)** und **Milcheiweiss (Allergie)**.
- **Erdnüsse** sind eine eigene Kategorie, nicht Teil von Nüsse.
- **Nüsse** und **Gluten** öffnen eine Unterauswahl mit „Alle Nüsse“ bzw. „Alles mit Gluten (z. B. Zöliakie)“.
- **„Unsicher“** oder „Ich bin mir nicht sicher, ob es weitere gibt“ setzt nur ein Flag. Es schliesst nichts aus und führt zum Hinweis auf „Vertrage ich nicht“.
- **Notizen** in Frage 3 filtern nichts. Daneben steht ehrlich: „Diesen Eintrag können wir noch nicht automatisch berücksichtigen.“
- Keine medizinischen Aussagen und keine Diagnosen.

## Filter über Tags

Jede Karte trägt `allergens` (granulare IDs wie `hazelnut`, `lactose`, `wheat`) und `animalOrigin` (`meat`, `fish`, `seafood`, `dairy`, `egg`, `honey`). Eine reine Funktion `isAllowed(card, exclusions)` entscheidet; `isVisible` ergänzt die Familienregel: Eine Familie erscheint nur, wenn mindestens ein Kind erlaubt ist. Bleibt eine Familie, zeigt sie nur erlaubte Beispiele und einen Hinweis wie „Ohne Haselnüsse“.

Damit einzelne Allergene einzelne Karten treffen, enthält der Katalog Stufe-3-Karten für Nüsse, Kerne und Käse. Sie sind als `"source": "Team-Ergänzung [V]"` markiert.

## Konfiguration per URL

| Parameter | Wirkung | Standard |
| --- | --- | --- |
| `?limit=6` | Karten pro Runde (`ROUND_CARD_LIMIT`), gültig 4 bis 30; ungültige Werte fallen auf den Standard zurück | 10 |
| `?tutorial=0` | Mini-Tutorial aus (`1` = an) | an |
| `?admin=1` | Ansicht für die Testleitung | – |

Kombinierbar, z. B. `?limit=6&tutorial=0`. Die effektiven Werte werden in jeder Sitzung gespeichert. Begründung [V]: Kernfrage 2 [A] und die Frage, ob es das Tutorial braucht [K], lassen sich so ohne neuen Build vergleichen.

## Protokoll und Export

Alles bleibt im Browser (`localStorage`), es gibt kein Backend und keine Netzwerkanfrage. Gespeichert wird erst nach der Anmeldung.

- **Pro Sitzung:** `sessionId`, `participantCode`, `startedAt`, `endedAt`, `appVersion`, `config`, Onboarding (Altersgruppe, Ernährungsweise, Ausschlüsse mit `source`, Unsicherheits-Flag, Notizen) und das am Ende angezeigte Profil.
- **Pro Ereignis:** `sessionId`, `cardId`, `stage`, `parentId`, `positionInRound`, `response` (`DISLIKE` | `LIKE` | `PREFER` | `UNFAMILIAR` | `INTOLERANT` | `UNDO`), `timestamp`, `responseTimeMs` (Karte vollständig sichtbar bis Antwort), `inputMethod` (`swipe` | `button` | `link`; `keyboard` nur bei Demos am Laptop), `selectionReason`, bei INTOLERANT zusätzlich `excludedCardIds`.

**Ansicht für die Testleitung:** `?admin=1` anhängen. Sie ist nirgends verlinkt und zeigt alle Sitzungen auf dem Gerät mit:

- Export JSON (alles) und Export CSV (eine Zeile pro Ereignis, `sessionId` in jeder Zeile, UTF-8, Komma als Trennzeichen),
- „Neue Testperson starten“ (lädt die App neu, behält Sitzungen und die Parameter `limit`/`tutorial`),
- „Alle Daten löschen“ mit Bestätigung.

Datenschutz: Der Vorname wird nie gespeichert. Die Ausschlüsse sind Gesundheitsdaten; solange Frage F4 (Einwilligung) offen ist, lassen sie sich mit `PRIVACY.logExclusionValues = false` in `src/config.js` auf Typ und Herkunft reduzieren.

## Starten

```bash
npm install
npm run dev
```

Auf dem Handy im selben WLAN: `npm run dev -- --host` und die angezeigte Network-Adresse öffnen.

| Befehl | Zweck |
| --- | --- |
| `npm test` | alle Tests (`src/**/*.test.js`) |
| `npm run build` | Produktions-Build in `dist/` |
| `npm run preview` | Build lokal ansehen |

Jeder Push auf `main` testet, baut und veröffentlicht den Prototyp auf GitHub Pages (`.github/workflows/deploy.yml`).

## Aufbau

```
src/
  config.js              Standardwerte, URL-Parameter, Wischschwellen, Datenschutz
  labels.js              alle sichtbaren Antwortbegriffe und Texte, die im Pilot geprüft werden
  data/catalog.json      Kartenkatalog: id, stage, parentId, children, allergens, animalOrigin, todo
  data/allergens.json    14 Hauptallergene mit Unterauswahl
  data/stage0.json       Fragebogen Stufe 0 und Tabelle der Ernährungsweisen
  logic/answers.js       Antworttypen und ihre Bedeutung
  logic/filter.js        isAllowed, isVisible, Hinweise auf Familienkarten
  logic/engine.js        replay (Event-Log), selectNextCards (Platzhalter), Profil
  logic/stage0.js        Ausschlüsse aus dem Onboarding ableiten
  logic/allergens.js     Auswahl und Suche in der Allergenliste
  logic/search.js        tolerante Suche (Gross-/Kleinschreibung, ä/ae)
  logging/logger.js      Sitzungen in localStorage
  logging/export.js      CSV- und JSON-Export
  components/            Swipe-Karte, Knöpfe, Detailauswahl, Suche, Chips, Kacheln
  screens/               Start, Anmelden, Fragebogen, Zusammenfassung, Tutorial, Runde, Zwischenstand, Admin
```

## Logik austauschen (nächster Schritt)

Die Oberfläche ruft nur `nextCard(state, config)` auf, das intern `selectNextCards(state, config)` nutzt. Diese Funktion liefert heute nur die Stufe-1-Karten in fester Reihenfolge und trägt den Kommentar „TODO: Adaptive Logik folgt – Eigenleistung Team“. Bewusst noch nicht gebaut:

- Auswahllogik Stufe 1 → 2 → 3,
- Nachtesten von Ausnahmen nach „Mag ich nicht“,
- Unterkarte nach „Kenne ich nicht“,
- gezielte Favoritensuche nach „Mag ich sehr“.

Alle Funktionen sind rein. Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen; sie steht in jedem Ereignis.

## Mobile-Kriterien

Geprüft bei 360 × 640 und 430 × 932 auf allen 13 Bildschirmen (inkl. Detailauswahl und Bestätigung): kein horizontaler Scroll, Touch-Ziele ≥ 44 × 44 CSS-px, Textkontrast ≥ 4.5:1 (axe-core), Fliesstext ≥ 18 px, bei 130 % Schrift wird nichts abgeschnitten, `prefers-reduced-motion` wird respektiert. Auf kleinen Bildschirmen wird in der Runde nur das Kartenbild verkleinert, damit alle Knöpfe und „Vertrage ich nicht“ ohne Scrollen sichtbar bleiben.

Die Prüfung ist wiederholbar: `npm run build && npm run preview`, dann in einem zweiten Terminal `python3 scripts/check-mobile.py` und `python3 scripts/check-mobile.py 1.3` (130 % Schrift). Voraussetzung: `pip install playwright` und `python -m playwright install chromium`.

## Tastatur für Demos am Laptop

| Taste | Antwort |
| --- | --- |
| Pfeil links | Mag ich nicht |
| Pfeil rechts | Mag ich |
| Pfeil oben | Mag ich sehr |
| K | Kenne ich nicht |

## Noch offen

**Unklare Allergen-Zuordnungen im Katalog** (als `todo` markiert, nicht selbst entschieden):

| Karte | Offene Frage |
| --- | --- |
| Hartkäse, Weichkäse | Laktose: vorläufig konservativ getaggt; gereifter Käse ist oft praktisch laktosefrei. Mit nurec klären. Folge heute: Bei Laktose fällt die ganze Familie Milchprodukte weg. |
| Joghurt und Quark | Laktosefreie Varianten als eigene Karten? |
| Klassische Pasta | Das Beispiel „Eierpasta“ sperrt die Karte für vegan und Eierallergie. Karte aufteilen? |
| Helle Brote, Knäckebrote | Milch, Ei, Sesam und weitere Getreide je nach Produkt; nicht getaggt. |
| Pasta aus Hülsenfrüchten | Spuren von Gluten, Lupinen je nach Produkt; nicht getaggt. |
| Wurzelgemüse | Sellerie möglich, heutige Beispiele nicht; nicht getaggt. |
| Muscheln | Zuordnung zu Weichtiere bestätigen. |

Ausserdem:

- Glutenfreie Varianten: Früher hiess es „Nur glutenfrei“, mit Tags entfällt die Familie Brot bei „Alles mit Gluten“ ganz.
- „Alkohol“ als Schnellauswahl in Frage 3 fehlt, weil der Katalog keinen passenden Tag hat.
- Werden die neuen Begriffe im Pilot verstanden?
- Standardwert für das Kartenlimit (heute 10 von 13 Familienkarten).
- Wird „Vertrage ich nicht“ übersehen oder mit „Mag ich nicht“ verwechselt? Im Pilot über `inputMethod = link` und Rückgängig-Ereignisse auswertbar.
- Tutorial an oder aus als Pilot-Vergleich (`?tutorial=0`).
- Kacheln: Die Auswahl der 8 häufigen Allergene ist eine Annahme, keine Häufigkeitsangabe.
- Frage F4: Einwilligung und Speicherung von Gesundheitsdaten im Test.
- Ansprache mit Du oder Sie, Wischschwellen, Fotos statt Illustrationen.

## Quelle

Kartenkatalog Stufe 1 und 2, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
Allergene: Verordnung des EDI betreffend die Information über Lebensmittel (LIV), Anhang 6; Verordnung (EU) Nr. 1169/2011 (LMIV), Anhang II.
