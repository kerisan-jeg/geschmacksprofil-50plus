# Geschmacksprofil 50+ · Prototyp

Mobiler Swipe-Prototyp zur Geschmacksprofilerkennung bei Personen ab 50 (WI-Projekt, Auftraggeber nurec).
Version 0.5: Designsystem und überarbeitete Swipe-Oberfläche. Die adaptive Kartenauswahl ist bewusst noch nicht gebaut:
Sie ist die nächste Eigenleistung des Teams (siehe „Logik austauschen“).

Quellenlabels in diesem Dokument: [A] Aufgabenstellung, [K] Aussagen von Tibor (Kickoff, Zwischencheck),
[D] bereitgestellte Dokumente (nurec-Konzept), [V] eigene Entscheidung des Teams.

## Ablauf

Die App hat zwei Bereiche in der unteren Navigation: **Profil erstellen** und **Mein Profil**.

1. **Start:** kurze Einführung.
2. **Anmelden:** Vorname, Alter und Einwilligung sind Pflicht, kein Passwort. Der Vorname wird nicht gespeichert. Unter „Für die Testleitung“ die Teilnehmer-Nr.
3. **Fragebogen (Stufe 0):** drei Fragen, eine pro Bildschirm, Details nur bei „Ja“. Frage 2 bietet „Ja“ und „Keine bekannt“, Frage 3 fragt nach „etwas Weiterem“. Der letzte Knopf heisst „Erste Karte zeigen“.
4. **Runde:** direkt nach Frage 3 (Teamentscheid vom 13.10.: keine Zusammenfassung, kein Tutorial). Stufe-1-Karten in fester Reihenfolge, höchstens `ROUND_CARD_LIMIT` (Standard 10). Die untere Navigation ist hier ausgeblendet, damit Karte und Knöpfe den ganzen Bildschirm haben.
5. **Abschluss:** kurze Übersicht (Anzahl je Antwort, Anzahl fester Regeln) und Weiterleitung zu „Mein Profil“.
6. **Mein Profil:** Geschmack gruppiert nach der Antwort pro Karte, getrennt davon die Ausschlüsse mit Herkunft (im Onboarding, beim Wischen).

Das **Mini-Tutorial** (drei kurze Schritte: Wischrichtungen, „Kenne ich nicht“ und „Vertrage ich nicht“, Rückgängig) ist im Code, aber standardmässig aus. Für einen Pilot-Vergleich `TUTORIAL_ENABLED = true` in `src/config.js` setzen; über die URL lässt es sich nicht einschalten.

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

**Wischen** (reine Logik in `src/logic/swipe.js`, Werte in `SWIPE` in `src/config.js`): Beim Ziehen erscheint auf der Karte die Beschriftung der angedeuteten Antwort mit Symbol; ihre Deckkraft wächst mit der Zugdistanz. Eine Antwort zählt erst ab der Schwelle (110 px seitlich, 90 px nach oben) oder bei schnellem Schnippen; darunter springt die Karte zurück. Die nächste Karte liegt leicht dahinter und rückt beim Ziehen nach vorn. Jede Richtung hat einen gleichwertigen Knopf an der Stelle, wohin die Karte fliegt (Wischen nach oben ist für viele schwierig).

**Fortschritt:** Ein Segment pro Karte, „Karte 3 von 10“ mit tabellarischen Ziffern. Anzahl und Prozentwert kommen aus `progress()` und damit aus dem Rundenlimit, nie fest im Code. Die Abschnitte der Profilerstellung (Fragen, Runde 1, Profil) zeigen erledigte Teile mit Häkchen.

## Designsystem

Ziel: ruhig, warm, viel Weissraum, wie eine veröffentlichte Gesundheits- oder Food-App. Die Swipe-Karte ist das einzige laute Element.

- **Tokens an einer Stelle:** `src/theme/tokens.css` enthält Farben, Schrift, Abstände (8-pt-Raster, 4 und 12 als Halbschritte), Radien, Schatten, Animationsdauern, Grössen und Ebenen. Komponenten-CSS in `src/styles/` verwendet nur `var(--…)`; `src/design.test.js` prüft, dass dort keine Farb-, Pixel-, rem- oder Zeitwerte hart stehen. JavaScript liest Dauern über `src/theme/motion.js` aus denselben Tokens.
- **Farben:** warmes Off-White als Hintergrund (`#f8f5ef`, auch als `theme-color`), tiefes Grün als Primärfarbe, warmer Terrakotta-Akzent (nur dekorativ, für Text eine dunklere Variante). Alle Textfarben ≥ 4.5:1.
- **Bewertungen nie nur über Farbe:** Mag ich nicht (Ziegelrot, Daumen runter), Mag ich (Grün, Daumen hoch), Mag ich sehr (Bernstein, Herz), immer mit Symbol und Text.
- **Schrift:** eine Familie, Atkinson Hyperlegible Next (für gute Lesbarkeit bei Sehschwäche entwickelt). Grundschrift 19 px, kleinster Text 18 px, Fortschrittszahlen mit tabellarischen Ziffern.
- **Symbole:** nur Lucide, eine Strichstärke für alle (`--icon-stroke`), keine Emojis.
- **Bilder:** echte Food-Fotos im gleichen Stil, lokal in `public/images`, Nachweise in `src/data/image-credits.json` (siehe `public/images/README.md`). Fehlt ein Foto oder lädt es nicht, erscheint der gestaltete Platzhalter (eigene Illustration auf der Kartenfarbe). Mit `IMAGE_STYLE = 'illustration'` in `src/config.js` zeigen alle Karten die eigenen Illustrationen; so lassen sich beide Varianten im Pilot vergleichen (Annahme 5). Der Bildstil steht in jeder Sitzung und im CSV-Export (`imageStyle`).
- **Zustände:** Laden (Bild pulsiert ruhig, bis das Foto da ist), Leer (z. B. „Mein Profil“ vor der ersten Antwort, keine Karten nach den Angaben, keine Sitzungen), Fehler (Fehlergrenze mit „Neu laden“ für jeden Bildschirm, Hinweis bei gesperrtem Speicher, Platzhalter bei fehlendem Bild).
- **App-Gefühl:** sichere Zonen (`env(safe-area-inset-*)`), fester Aktionsbereich unten, untere Navigation, sanfte Seitenübergänge. `prefers-reduced-motion` setzt alle Dauern auf 0.
- **PWA:** `public/manifest.webmanifest` mit `display: standalone`, App-Icons (rund und maskable) und `theme-color`: Vom Homescreen startet die App im Vollbild.
- **Texte:** alles in `src/labels.js`, Du-Form, Schweizer Rechtschreibung. `src/labels.test.js` prüft am Syntaxbaum, dass in keiner Komponente Text hart steht.

## Stufe 0: harte Ausschlüsse

Grundlage ist nurec v0.2, Kap. 2 [D]. Die Bereiche 0.1 bis 0.5 sind als drei Fragen umgesetzt [V]; 0.6 (Marken und Händler) fehlt bewusst.

| Frage | Bereiche | Umsetzung |
| --- | --- | --- |
| Feste Ernährungsweise | 0.4 | Tabelle `diets` in `stage0.json`: kein Fisch, pescetarisch, vegetarisch, vegan schliessen Tags aus `animalOrigin` aus |
| Allergien und Unverträglichkeiten | 0.1 bis 0.3 | 14 Hauptallergene (LIV Anhang 6, LMIV Anhang II) in `allergens.json`; 8 als Kacheln, der Rest über „Weitere anzeigen“ und Suche; Auswahl als Chips |
| Nie vorschlagen | 0.5, 0.6 | Schnellauswahl, Suche über alle Lebensmittel, Eintragen ohne Treffer; eigener Block für Marken und Herkunft |

- Milch ist getrennt in **Laktose (Unverträglichkeit)** und **Milcheiweiss (Allergie)**.
- **Erdnüsse** stehen seit der Rückmeldung vom 12.10. unter **Nüsse** (ersetzt A5). Sie behalten die eigene ID `peanut`, damit eine reine Erdnussallergie einzeln erfasst bleibt; „Alle Nüsse (inkl. Erdnüsse)“ wählt sie mit aus.
- **Nüsse** und **Gluten** öffnen eine Unterauswahl mit „Alle Nüsse (inkl. Erdnüsse)“ bzw. „Alles mit Gluten (z. B. Zöliakie)“.
- **„Ich bin mir nicht sicher, ob es weitere gibt“** (nach „Ja“) setzt nur ein Flag. Es schliesst nichts aus und führt zum Hinweis auf „Vertrage ich nicht“. Die frühere Antwort „Unsicher“ gibt es seit dem 13.10. nicht mehr.
- **Suche** in Frage 2 und 3 findet alle Lebensmittel: Allergene, Karten und die Beispiele auf den Karten (z. B. „Tomate“).
- **Eintragen ohne Treffer:** Was man eintippt, wird immer eingetragen (ersetzt A7). Ohne eigene Karte wird es ein Lebensmittel-Eintrag (`type: "food"`): Keine Gruppe fällt weg, aber das Wort erscheint nirgends mehr als Beispiel, und die Karte zeigt „Ohne Tomate“. Das steht so auch neben dem Eintrag.
- **Marken und Herkunft** (Bereich 0.6) werden gespeichert (`avoidBrands`, `avoidOrigins`), wirken im Prototyp aber noch nicht, weil der Katalog keine Marken und keine Herkunft kennt. Das steht so auch in der App.
- **Nichts doppelt:** Was frühere Angaben schon ausschliessen, wird nicht nochmals angeboten (Kacheln, Schnellauswahl, Suchtreffer). Bei vegan fehlen z. B. die Kacheln Fisch, Eier und Milch; bei pescetarisch die Schnellauswahl Schweinefleisch. Eine Angabe ohne passende Karte (z. B. Sellerie) bleibt immer wählbar.
- Keine medizinischen Aussagen und keine Diagnosen.

## Filter über Tags

Jede Karte trägt `allergens` (granulare IDs wie `hazelnut`, `lactose`, `wheat`) und `animalOrigin` (`meat`, `fish`, `seafood`, `dairy`, `egg`, `honey`). Eine reine Funktion `isAllowed(card, exclusions)` entscheidet; `isVisible` ergänzt die Familienregel: Eine Familie erscheint nur, wenn mindestens ein Kind erlaubt ist. Bleibt eine Familie, zeigt sie nur erlaubte Beispiele und einen Hinweis wie „Ohne Haselnüsse“.

Damit einzelne Allergene einzelne Karten treffen, enthält der Katalog Stufe-3-Karten für Nüsse, Kerne und Käse. Sie sind als `"source": "Team-Ergänzung [V]"` markiert.

## Konfiguration per URL

| Parameter | Wirkung | Standard |
| --- | --- | --- |
| `?limit=6` | Karten pro Runde (`ROUND_CARD_LIMIT`), gültig 4 bis 30; ungültige Werte fallen auf den Standard zurück | 10 |
| `?admin=1` | Ansicht für die Testleitung | – |

Kombinierbar, z. B. `?limit=6&admin=1`. Die effektiven Werte werden in jeder Sitzung gespeichert. Begründung [V]: Kernfrage 2 [A] lässt sich so ohne neuen Build vergleichen. `?tutorial` wirkt seit dem 13.10. nicht mehr. Die Standardwerte stehen als `ROUND_CARD_LIMIT`, `TUTORIAL_ENABLED` (aus) und `IMAGE_STYLE` (Fotos) in `src/config.js`.

## Protokoll und Export

Alles bleibt im Browser (`localStorage`), es gibt kein Backend und keine Netzwerkanfrage. Gespeichert wird erst nach der Anmeldung.

- **Pro Sitzung:** `sessionId`, `participantCode`, `startedAt`, `endedAt`, `appVersion`, `config`, Onboarding (Altersgruppe, Ernährungsweise, Ausschlüsse mit `source`, Unsicherheits-Flag, Notizen) und das am Ende angezeigte Profil.
- **Pro Ereignis:** `sessionId`, `cardId`, `stage`, `parentId`, `positionInRound`, `response` (`DISLIKE` | `LIKE` | `PREFER` | `UNFAMILIAR` | `INTOLERANT` | `UNDO`), `timestamp`, `responseTimeMs` (Karte vollständig sichtbar bis Antwort), `inputMethod` (`swipe` | `button` | `link`; `keyboard` nur bei Demos am Laptop), `selectionReason`, bei INTOLERANT zusätzlich `excludedCardIds`.

**Ansicht für die Testleitung:** `?admin=1` anhängen. Sie ist nirgends verlinkt und zeigt alle Sitzungen auf dem Gerät mit:

- Export JSON (alles) und Export CSV (eine Zeile pro Ereignis, `sessionId` in jeder Zeile, UTF-8, Komma als Trennzeichen),
- „Neue Testperson starten“ (lädt die App neu, behält Sitzungen und den Parameter `limit`),
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
| `npm test` | alle Tests (`src/**/*.test.js`), inkl. Komponententests mit jsdom |
| `npm run build` | Produktions-Build in `dist/` |
| `npm run preview` | Build lokal ansehen |

Jeder Push auf `main` testet, baut und veröffentlicht den Prototyp auf GitHub Pages (`.github/workflows/deploy.yml`).

## Aufbau

```
src/
  config.js              Standardwerte (ROUND_CARD_LIMIT, TUTORIAL_ENABLED), URL-Parameter, Wischschwellen, Datenschutz
  labels.js              alle sichtbaren Texte
  theme/tokens.css       Design-Tokens (einzige Stelle für Gestaltungswerte)
  theme/motion.js        Animationsdauern aus den Tokens für JavaScript
  styles/                Komponenten-CSS (nur Tokens): base, controls, app, card, screens
  app/model.js           Ablauf und Zustand der App (rein, getestet)
  data/catalog.json      Kartenkatalog: id, stage, parentId, children, allergens, animalOrigin, todo
  data/allergens.json    14 Hauptallergene mit Unterauswahl
  data/stage0.json       Fragebogen Stufe 0 und Tabelle der Ernährungsweisen
  data/image-credits.json  Fotos und Bildnachweise (APA 7)
  logic/answers.js       Antworttypen und ihre Bedeutung
  logic/swipe.js         Wischgesten: Schwelle, Rückfederung, Deckkraft der Beschriftung
  logic/filter.js        isAllowed, isVisible, Hinweise auf Familienkarten
  logic/engine.js        replay (Event-Log), selectNextCards (Platzhalter), Fortschritt, Profil
  logic/profile.js       Ausschlüsse für „Mein Profil“ gruppieren
  logic/stage0.js        Ausschlüsse aus dem Onboarding ableiten
  logic/allergens.js     Auswahl und Suche in der Allergenliste
  logic/search.js        tolerante Suche (Gross-/Kleinschreibung, ä/ae)
  logging/logger.js      Sitzungen in localStorage
  logging/export.js      CSV- und JSON-Export
  components/            Swipe-Karte, Antwortknöpfe, untere Navigation, Sheets, Suche, Chips, Zustände
  screens/               Start, Anmelden, Fragebogen, Tutorial (aus), Runde, Abschluss, Mein Profil, Admin
  test/dom.js            kleine DOM-Umgebung (jsdom) für Komponententests
scripts/
  test-setup.mjs         lädt JSX, JSON und CSS in node --test wie Vite
  check-mobile.py        Prüfung der Mobile-Kriterien (A11) mit Playwright
```

## Logik austauschen (nächster Schritt)

Die Oberfläche ruft nur `nextCard(state, config)` auf, das intern `selectNextCards(state, config)` nutzt. Diese Funktion liefert heute nur die Stufe-1-Karten in fester Reihenfolge und trägt den Kommentar „TODO: Adaptive Logik folgt – Eigenleistung Team“. Bewusst noch nicht gebaut:

- Auswahllogik Stufe 1 → 2 → 3,
- Nachtesten von Ausnahmen nach „Mag ich nicht“,
- Unterkarte nach „Kenne ich nicht“,
- gezielte Favoritensuche nach „Mag ich sehr“.

Alle Funktionen sind rein. Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen; sie steht in jedem Ereignis.

## Mobile-Kriterien

Geprüft bei 360 × 640 und 430 × 932 auf allen 13 Bildschirmen (inkl. Detailauswahl, Bestätigung, Abschluss und Profil), mit 100 % und 130 % Schrift: kein horizontaler Scroll, Touch-Ziele ≥ 44 × 44 CSS-px, Textkontrast ≥ 4.5:1 (axe-core), jeder Text ≥ 18 px, bei 130 % Schrift wird nichts abgeschnitten, `prefers-reduced-motion` wird respektiert. In der Runde füllt der Kartenstapel den Platz zwischen Fortschritt und Knöpfen; auf kleinen Bildschirmen wird nur das Kartenbild kleiner, damit alle Knöpfe und „Vertrage ich nicht“ ohne Scrollen sichtbar bleiben. Auf hohen Handys ist der Stapel begrenzt, damit das Foto nicht zu stark beschnitten wird.

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

- Erdnüsse: Es gibt keine Erdnuss-Karte. Eine Erdnussallergie blendet beim Wischen deshalb noch nichts aus. Umgekehrt schliesst „Alle Nüsse (inkl. Erdnüsse)“ auch Erdnüsse aus, wer nur Baumnüsse meint.
- Marken und Herkunft: Wirkung erst mit Produktdaten (z. B. von nurec).
- Anmeldung: Wie die Anmeldeoption später aussieht, ist noch offen.
- Glutenfreie Varianten: Früher hiess es „Nur glutenfrei“, mit Tags entfällt die Familie Brot bei „Alles mit Gluten“ ganz.
- „Alkohol“ als Schnellauswahl in Frage 3 fehlt, weil der Katalog keinen passenden Tag hat.
- Werden die neuen Begriffe im Pilot verstanden?
- Standardwert für das Kartenlimit (heute 10 von 13 Familienkarten).
- Wird „Vertrage ich nicht“ übersehen oder mit „Mag ich nicht“ verwechselt? Im Pilot über `inputMethod = link` und Rückgängig-Ereignisse auswertbar.
- Tutorial: seit dem 13.10. aus. Ein Pilot-Vergleich ist mit `TUTORIAL_ENABLED = true` möglich (nicht über die URL).
- Zusammenfassung vor dem ersten Swipe: seit dem 13.10. entfernt. nurec v0.2, Kap. 2.2, sieht eine verständliche Zusammenfassung vor dem ersten Swipe vor; mit nurec abstimmen. Die festen Regeln sind weiterhin in „Mein Profil“ sichtbar.
- Kacheln: Die Auswahl der 8 häufigen Allergene ist eine Annahme, keine Häufigkeitsangabe.
- Frage F4: Einwilligung und Speicherung von Gesundheitsdaten im Test.
- Ansprache mit Du oder Sie, Wischschwellen.
- Fotos oder Illustrationen (`IMAGE_STYLE`): mit Tibor abstimmen oder im Pilot vergleichen. Bildlizenzen: alle 13 Fotos unter der Unsplash License (keine Unsplash+-Bilder, Stand 14.10.2026), Nachweise mit APA 7 in `src/data/image-credits.json`; vor der Abgabe Namen und Titel prüfen. Bildstil: Käse ist schräg fotografiert, Kartoffeln sind roh.

## Quelle

Kartenkatalog Stufe 1 und 2, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
Allergene: Verordnung des EDI betreffend die Information über Lebensmittel (LIV), Anhang 6; Verordnung (EU) Nr. 1169/2011 (LMIV), Anhang II.
