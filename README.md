# Geschmacksprofil 50+ · Prototyp

Mobiler Swipe-Prototyp zur Geschmacksprofilerkennung bei Personen ab 50 (WI-Projekt, Auftraggeber nurec).
Version 0.6: Designsystem, Swipe-Oberfläche, Registrierung mit SMS-Code (echt über Firebase oder simuliert), bearbeitbares Profil und einheitliche Suche über alle Lebensmittel. Die adaptive Kartenauswahl ist bewusst noch nicht gebaut:
Sie ist die nächste Eigenleistung des Teams (siehe „Logik austauschen“).

Quellenlabels in diesem Dokument: [A] Aufgabenstellung, [K] Aussagen von Tibor (Kickoff, Zwischencheck),
[D] bereitgestellte Dokumente (nurec-Konzept), [V] eigene Entscheidung des Teams.

## Ablauf

Die App hat zwei Bereiche: **Profil erstellen** und **Mein Profil**. Die untere Leiste dafür erscheint erst ab dem Abschluss der ersten Runde und in „Mein Profil“ (Rückmeldung Team, 14.10.): Während Registrierung, Fragen, Zusammenfassung und beim Wischen gibt es nur einen Weg nach vorn. „Mein Profil“ ist immer über den runden Knopf oben rechts erreichbar (Initiale des Vornamens).

1. **Willkommen:** kurze Einführung.
2. **Registrierung** (`AUTH_ENABLED`, Standard an): Vorname → Handynummer → SMS-Code. Der Code kommt als echte SMS (Firebase), sobald das Projekt eingerichtet ist, sonst simuliert; siehe unten.
3. **Über dich:** Alter und Einwilligung sind Pflicht, unter „Für die Testleitung“ die Teilnehmer-Nr. Ohne Registrierung startet die App hier, der Vorname ist dann freiwillig.
4. **Fragebogen (Stufe 0):** drei Fragen, eine pro Bildschirm, Details nur bei „Ja“. Frage 2 bietet „Ja“ und „Keine bekannt“, Frage 3 fragt nach „etwas Weiterem“.
5. **Zusammenfassung** (nurec v0.2, Kap. 2.2 [D]): „Stimmt das so?“ zeigt alle festen Regeln, je Frage ein Abschnitt (Ernährungsweise, Allergien und Unverträglichkeiten, „Möchte ich nicht essen“). „Ändern“ öffnet direkt die passende Frage und führt danach zurück; „Stimmt so“ bestätigt. Ein offenes „Ich bin mir nicht sicher“ steht dort als offen, nicht als Freigabe. Bewusst kurz, ohne Vorschau der Karten.
6. **Runde 1:** nach „Stimmt so“ direkt die erste Karte (kein Tutorial, Teamentscheid vom 13.10.). Höchstens `ROUND_CARD_LIMIT` Karten (Standard 10). Karte und Knöpfe haben den ganzen Bildschirm.
7. **Abschluss:** kurze Übersicht (Anzahl je Antwort, Anzahl fester Regeln), Ausblick auf die nächsten Karten, „Weiter mit Runde 2“ und „Mein Profil ansehen“.
8. **Runde 2 bis maximal 4:** in fester Reihenfolge: zuerst die Gruppen, die in Runde 1 keinen Platz hatten, dann die Untergruppen (z. B. Geflügel, Rind, Schwein) abwechselnd aus allen Gruppen. Gemäss Vorgabe des Dozenten endet die Profilerstellung spätestens nach Runde 4 (`MAX_ROUNDS` in `src/config.js`), auch wenn noch Karten offen sind. Sind vorher keine Karten mehr verfügbar, endet sie früher. Ausschlüsse wirken in jeder Runde. Die Auswahl je nach Antwort bleibt Eigenleistung des Teams (siehe „Logik austauschen“).
9. **Mein Profil:** Geschmack und Ausschlüsse ansehen und bearbeiten.

Das **Mini-Tutorial** (drei kurze Schritte: Wischrichtungen, „Kenne ich nicht“ und „Vertrage ich nicht“, Rückgängig) ist im Code, aber standardmässig aus. Für einen Pilot-Vergleich `TUTORIAL_ENABLED = true` in `src/config.js` setzen; über die URL lässt es sich nicht einschalten.

Wer die App auf demselben Gerät wieder öffnet, sieht „Willkommen zurück, [Vorname]“ und macht dort weiter, wo er oder sie war. Auch ein versehentliches Neuladen verliert nichts mehr. Auf einem gemeinsamen Testgerät deshalb nach jeder Person „Neue Testperson starten“ drücken (Ansicht für die Testleitung, siehe unten).

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

**Fortschritt:** Ein Segment pro Karte, „Karte 3 von 10“ mit tabellarischen Ziffern, je Runde. Anzahl und Prozentwert kommen aus `progress()` und damit aus dem Rundenlimit, nie fest im Code. Die Abschnitte der Profilerstellung (Fragen, Runde 1 bzw. 2 …, Profil) zeigen erledigte Teile mit Häkchen. Rückgängig wirkt nur in der laufenden Runde.

## Registrierung (SMS-Code)

- **Ablauf:** Vorname (nur Vorname) → Handynummer (Ländervorwahl wählbar, Standard +41, Gliederung beim Tippen „079 123 45 67“, Prüfung mit verständlicher Meldung, `inputmode="tel"`) → SMS-Code (6 Ziffern, ein Feld mit `autocomplete="one-time-code"` und `inputmode="numeric"`, Einfügen möglich, „Code erneut senden“ erst nach 30 s Countdown, bei richtigem Code automatisch weiter).
- **Echte SMS über Firebase** (Entscheid vom 15.10.): `src/auth/FirebaseAuthService.js` schickt den Code mit Firebase Authentication als SMS an die Nummer, ohne eigenen Server. Ein unsichtbares reCAPTCHA von Google schützt vor Missbrauch; darauf weist ein Satz unter dem Feld hin. Nach der Bestätigung löscht die App das Konto bei Firebase sofort wieder und meldet ab; die App braucht kein Konto bei Google. Unter dem Feld steht ehrlich, dass die Nummer für die SMS an Google geht. Das SDK (nur `@firebase/app` und `@firebase/auth`) wird erst geladen, wenn wirklich ein Code verschickt wird.
- **Einrichtung Firebase** (einmalig): Projekt in der Firebase-Konsole anlegen, Tarif „Blaze“ (Kreditkarte; jede SMS kostet), unter Authentication die Anmeldung per Telefon aktivieren, `kerisan-jeg.github.io` als Authorized Domain eintragen und unter „SMS region policy“ die Schweiz erlauben. Dann die vier Werte der Web-App als Repository-Variablen hinterlegen (GitHub → Settings → Secrets and variables → Actions → Variables): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Lokal dieselben Werte in `.env.local` (nicht im Repo). Diese Werte sind bei Firebase nicht geheim; geschützt wird über Authorized Domains und reCAPTCHA. Für Tests ohne SMS lassen sich in der Konsole Testnummern mit festem Code eintragen.
- **Simulation:** Ohne diese Werte (lokal, in den Tests) oder mit `?sms=sim` gibt es keine SMS: `src/auth/MockAuthService.js`. Sie erzeugt einen zufälligen Code und zeigt ihn als SMS-Mitteilung oben, über dem Bildschirm statt darauf: Titel und Eingabefeld bleiben sichtbar. Die Mitteilung bleibt, bis jemand sie schliesst oder der Code stimmt, damit sich beim Eintippen nichts verschiebt. Für einen echten Dienst wird nur `createAuthService()` ausgetauscht. Unter dem Codefeld steht für Testpersonen ehrlich, dass die SMS simuliert ist.
- **Datenschutz:** Vorname und Telefonnummer bleiben auf dem Gerät (`localStorage`, Schlüssel `geschmacksprofil:account`). Nach der Bestätigung wird die Nummer nur gekürzt gespeichert („+41 79 *** ** 67“); `saveAccount()` lehnt eine volle Nummer ab. Weder Vorname noch Nummer gelangen in Sitzungen, JSON- oder CSV-Exporte; Exporte enthalten nur `sessionId` und optional die Teilnehmer-Nr. Ein Test prüft das (`src/logging/privacy.test.js`).
- **Abmelden** im Profil löscht Konto und Stand auf dem Gerät; die Sitzung für die Auswertung bleibt (ohne Namen). „Neue Testperson starten“ in der Admin-Ansicht meldet die vorherige Person ebenfalls ab.
- **Protokoll:** `AUTH_STARTED` (Vorname eingeben) und `AUTH_COMPLETED` (Code bestätigt) stehen im Event-Log. So lässt sich die Dauer der Registrierung getrennt von der Swipe-Dauer auswerten.
- **Protokoll:** In jeder Sitzung steht, ob die SMS echt oder simuliert war (`config.sms`, CSV-Spalte `sms`); `AUTH_COMPLETED` trägt `method: "sms"` bzw. `"sms-simulated"`.
- **Ohne Registrierung:** `AUTH_ENABLED = false` in `src/config.js`. Der URL-Parameter `?auth=0|1` folgt mit der URL-Konfiguration (Commit 4).

## Mein Profil

- **Kopf:** Vorname, gekürzte Nummer, Anzahl beantworteter Karten und die Abschnitte der Profilerstellung.
- **Geschmack:** gruppiert in „Das magst du besonders“, „Das magst du“, „Das magst du eher nicht“ und „Kennst du nicht“, jeder Eintrag mit Bild und Bewertungs-Chip (Farbe, Symbol, Text). Berechnet von der reinen Funktion `computeProfile(state)` in `src/logic/engine.js`: nur nach der letzten direkten Antwort pro Karte, ohne Score, ohne Prozentwerte, ohne abgeleitete Einträge („TODO: Score-Modell … – Eigenleistung Team“).
- **Ausschlüsse,** getrennt vom Geschmack: Allergien, Ernährungsweise, „Vertrage ich nicht“, „Möchte ich nicht essen“, Notizen. Bei jedem Eintrag steht die Herkunft (im Onboarding, beim Wischen, im Profil).
- **Bearbeiten:** Bewertung über ein Segmented Control mit den drei Bewertungen und „Aus dem Profil entfernen“; Allergien mit derselben Komponente wie im Onboarding (inkl. Detailauswahl bei Nüssen und Gluten); Ernährungsweise; „Vertrage ich nicht“ und „Möchte ich nicht essen“ über die Suche. Allergien und Unverträglichkeiten werden nur nach einer Bestätigung entfernt.
- **Event-Log:** Jede Änderung ist ein Ereignis (`RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED`) mit `source = "profile"` (`src/logic/events.js`). Der Zustand wird weiterhin per Replay abgeleitet; die ursprüngliche Antwort beim Wischen bleibt unverändert im Log. Ein entfernter Ausschluss fehlt danach einfach in den Einträgen, ob eine Karte wieder erlaubt ist, entscheidet `isAllowed()` (keine Sonderlogik).

## Einheitliche Suche (FoodSearch)

- **Eine Komponente** (`src/components/FoodSearch.jsx`, Logik in `src/logic/foodSearch.js`) für Allergien und Unverträglichkeiten (Frage 2), „Nie vorschlagen“ (Frage 3) und „Mein Profil“.
- Sucht über Allergene, Karten (Familien und Untergruppen), alle Zutaten und Getränke und Merkmale. Tolerant gegenüber Gross-/Kleinschreibung, Umlauten (ä = ae) und der Mehrzahl („Oliven“ findet Olive, „Tomaten“ Tomate).
- **Alle Lebensmittel als Auswahlfeld** (Rückmeldung Team, 15.10.): Die Liste stammt aus der Schweizer Nährwertdatenbank des BLV (`src/data/foods.json`, rund 560 Zutaten und Getränke, Schweizer Begriffe und Synonyme, z. B. Peterli, Krautstiel, Gschwellti). Varianten sind zusammengefasst („Ananas“ statt sechs Einträgen), jedes Lebensmittel hat seine Gruppe („Olive · Gemüse“). Gerichte (Lasagne, Älplermagronen) fehlen bewusst: Sie gehören nach nurec v0.2 in Stufe 4 und werden dort als eigene Karten bewertet. Einige häufige Kräuter und Gewürze und „Alkohol“ hat das Team ergänzt (`"team": true`). Neu erzeugen mit `python scripts/import-foods.py <Excel-Datei>`.
- **Tippfehler:** Findet die Suche nichts, schlägt sie ähnliche Einträge vor („Meintest du: Olive“).
- **Synonyme** (`synonyms` bei Karten und Allergenen, Lexikon `foods` im Katalog) inkl. Schweizer Begriffe: Rahm/Sahne, Poulet/Hähnchen, Rüebli/Karotte, Peperoni/Paprika, Nüsslisalat/Feldsalat, Zucchetti, Randen/Rote Bete, Härdöpfel u. a. Unsichere Begriffe stehen als TODO in `synonymTodos`, nicht geraten.
- Vorschläge ab dem ersten Zeichen, höchstens 6, passender Teil hervorgehoben, Gruppe als Zusatz („Haselnuss · Nüsse“), Zeilen ≥ 48 px. Genau passende Wörter stehen zuerst.
- **Notiz nur als Ausnahme** (A7): Erst wenn wirklich nichts passt (z. B. eine Marke oder ein Familienrezept), lässt sich der Text klein „trotzdem als Notiz eintragen“. Sie schliesst keine Gruppe aus; das Wort erscheint aber nirgends mehr als Beispiel (Rückmeldung Team, 12.10.). Der Hinweis daneben sagt das ehrlich.

## Designsystem

Ziel: ruhig, warm, viel Weissraum, wie eine veröffentlichte Gesundheits- oder Food-App. Die Swipe-Karte ist das einzige laute Element.

- **Tokens an einer Stelle:** `src/theme/tokens.css` enthält Farben, Schrift, Abstände (8-pt-Raster, 4 und 12 als Halbschritte), Radien, Schatten, Animationsdauern, Grössen und Ebenen. Komponenten-CSS in `src/styles/` verwendet nur `var(--…)`; `src/design.test.js` prüft, dass dort keine Farb-, Pixel-, rem- oder Zeitwerte hart stehen. JavaScript liest Dauern über `src/theme/motion.js` aus denselben Tokens.
- **Farben:** warmes Off-White als Hintergrund (`#f8f5ef`, auch als `theme-color`), tiefes Grün als Primärfarbe, warmer Terrakotta-Akzent (nur dekorativ, für Text eine dunklere Variante). Alle Textfarben ≥ 4.5:1.
- **Bewertungen nie nur über Farbe:** Mag ich nicht (Ziegelrot, Daumen runter), Mag ich (Grün, Daumen hoch), Mag ich sehr (Bernstein, Herz), immer mit Symbol und Text.
- **Schrift:** eine Familie, Atkinson Hyperlegible Next (für gute Lesbarkeit bei Sehschwäche entwickelt). Grundschrift 19 px, kleinster Text 18 px, Fortschrittszahlen mit tabellarischen Ziffern.
- **Symbole:** nur Lucide, eine Strichstärke für alle (`--icon-stroke`), keine Emojis.
- **Bilder:** echte Food-Fotos, lokal in `public/images`, Nachweise in `src/data/image-credits.json` (siehe `public/images/README.md`). Jede Gruppe zeigt ihre drei Beispiele als Bildraster (z. B. „Fleisch und Geflügel“: Poulet, Rind, Schwein; Rückmeldung Team, 14.10.: nur Poulet passte nicht zur ganzen Gruppe), jede Untergruppe ein eigenes Foto. **Bilder zeigen nie Ausgeschlossenes:** Jedes Foto nennt die Karten und Lebensmittel, die darauf zu sehen sind (`shows`, `foods`). Ist davon etwas ausgeschlossen (Allergie, Ernährungsweise, „Vertrage ich nicht“, eingetippte „Tomate“), fällt das Foto weg, und das Raster zeigt nur die übrigen Beispiele oder die Illustration (`allowedPhotos` in `src/lib/images.js`). Fehlt ein Foto oder lädt es nicht, erscheint der gestaltete Platzhalter (eigene Illustration auf der Kartenfarbe; Untergruppen übernehmen Farbe und Illustration ihrer Gruppe). Mit `IMAGE_STYLE = 'illustration'` in `src/config.js` zeigen alle Karten die eigenen Illustrationen; so lassen sich beide Varianten im Pilot vergleichen (Annahme 5). Der Bildstil steht in jeder Sitzung und im CSV-Export (`imageStyle`).
- **Zustände:** Laden (Bild pulsiert ruhig, bis das Foto da ist), Leer (z. B. „Mein Profil“ vor der ersten Antwort, keine Karten nach den Angaben, keine Sitzungen), Fehler (Fehlergrenze mit „Neu laden“ für jeden Bildschirm, Hinweis bei gesperrtem Speicher, Platzhalter bei fehlendem Bild).
- **App-Gefühl:** sichere Zonen (`env(safe-area-inset-*)`), fester Aktionsbereich unten, untere Navigation ab Runde 1, sanfte Seitenübergänge. `prefers-reduced-motion` setzt alle Dauern auf 0.
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
| `?sms=sim` | SMS-Code simulieren statt echt verschicken (z. B. für Testpersonen ohne eigenes Handy) | echt, wenn Firebase eingerichtet ist |

Kombinierbar, z. B. `?limit=6&admin=1`. Die effektiven Werte werden in jeder Sitzung gespeichert. Begründung [V]: Kernfrage 2 [A] lässt sich so ohne neuen Build vergleichen. `?tutorial` wirkt seit dem 13.10. nicht mehr. Die Standardwerte stehen als `ROUND_CARD_LIMIT`, `TUTORIAL_ENABLED` (aus), `IMAGE_STYLE` (Fotos) und `AUTH_ENABLED` (an) in `src/config.js`.

## Protokoll und Export

Alles bleibt im Browser (`localStorage`), es gibt kein eigenes Backend. Einzige Netzwerkanfrage ist der SMS-Versand über Firebase (nur Handynummer und Code, keine Antworten). Eine Sitzung wird erst gespeichert, wenn unter „Über dich“ die Einwilligung gegeben ist.

- **Pro Sitzung:** `sessionId`, `participantCode`, `startedAt`, `endedAt`, `appVersion`, `config`, Onboarding (Altersgruppe, Ernährungsweise, Ausschlüsse mit `source`, Unsicherheits-Flag, Notizen) und das am Ende angezeigte Profil. Dazu Zeitpunkte im `trace` (nur im JSON-Export), z. B. Bildschirmwechsel, `stage0_edit` („Ändern“ in der Zusammenfassung), `stage0_confirm` („Stimmt so“), Start und Ende der Runde.
- **Pro Ereignis:** `sessionId`, `cardId`, `stage`, `parentId`, `round` (Runde 1, 2, …; in der CSV als eigene Spalte), `positionInRound`, `response` (`DISLIKE` | `LIKE` | `PREFER` | `UNFAMILIAR` | `INTOLERANT` | `UNDO`), `timestamp`, `responseTimeMs` (Karte vollständig sichtbar bis Antwort), `inputMethod` (`swipe` | `button` | `link`; `keyboard` nur bei Demos am Laptop), `selectionReason`, bei INTOLERANT zusätzlich `excludedCardIds`.
- **Weitere Ereignisse im selben Log** (`type`): `RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED` (Profil, `source = "profile"`) und `AUTH_STARTED`, `AUTH_COMPLETED` (Registrierung). Die CSV hat dafür die Spalten `type`, `source`, `rating`, `previousRating`, `section`, `exclusions`, `newDiet`, `previousDiet` und `auth`.

**Ansicht für die Testleitung:** `?admin=1` anhängen. Sie ist nirgends verlinkt und zeigt alle Sitzungen auf dem Gerät mit:

- Export JSON (alles) und Export CSV (eine Zeile pro Ereignis, `sessionId` in jeder Zeile, UTF-8, Komma als Trennzeichen),
- „Neue Testperson starten“ (meldet die vorherige Person auf dem Gerät ab und lädt die App neu, behält Sitzungen und den Parameter `limit`). **Nach jeder Testperson drücken:** Sonst sieht die nächste Person „Willkommen zurück“ und das Profil der vorherigen (Gesundheitsdaten, siehe Frage F4).
- „Alle Daten löschen“ mit Bestätigung.

Datenschutz: Vorname und Telefonnummer stehen in keiner Sitzung und in keinem Export (nur lokal im Konto auf dem Gerät, die Nummer gekürzt). Die Ausschlüsse sind Gesundheitsdaten; solange Frage F4 (Einwilligung) offen ist, lassen sie sich mit `PRIVACY.logExclusionValues = false` in `src/config.js` auf Typ und Herkunft reduzieren (auch in Profiländerungen).

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
  config.js              Standardwerte (ROUND_CARD_LIMIT, TUTORIAL_ENABLED, IMAGE_STYLE, AUTH_ENABLED), URL-Parameter, Wischschwellen, Datenschutz
  labels.js              alle sichtbaren Texte
  theme/tokens.css       Design-Tokens (einzige Stelle für Gestaltungswerte)
  theme/motion.js        Animationsdauern aus den Tokens für JavaScript
  styles/                Komponenten-CSS (nur Tokens): base, controls, app, card, screens, account
  app/model.js           Ablauf und Zustand der App (rein, getestet)
  data/catalog.json      Kartenkatalog: id, stage, parentId, children, allergens, animalOrigin, todo
  data/allergens.json    14 Hauptallergene mit Unterauswahl
  data/stage0.json       Fragebogen Stufe 0 und Tabelle der Ernährungsweisen
  data/image-credits.json  Fotos, Bildraster der Gruppen und Bildnachweise (APA 7)
  lib/images.js          Fotos je Karte, Bildraster, nie Ausgeschlossenes im Bild, Bildstil der Sitzung
  auth/                  AuthService (Schnittstelle), FirebaseAuthService (echte SMS), MockAuthService (Simulation), Handynummern
  storage/local.js       Konto und Stand der App auf dem Gerät (nie in Exporten)
  logic/answers.js       Antworttypen und ihre Bedeutung
  logic/events.js        Ereignistypen im Event-Log (Antworten, Profiländerungen, Registrierung)
  data/foods.json        alle Zutaten und Getränke (Schweizer Nährwertdatenbank, BLV), erzeugt von scripts/import-foods.py
  logic/foodSearch.js    einheitliche Suche mit Synonymen, Mehrzahl, Tippfehlern, Kategorie und Hervorhebung
  logic/swipe.js         Wischgesten: Schwelle, Rückfederung, Deckkraft der Beschriftung
  logic/filter.js        isAllowed, isVisible, Hinweise auf Familienkarten
  logic/engine.js        replay (Event-Log inkl. Profiländerungen), Runden, selectNextCards (Platzhalter), Fortschritt, computeProfile
  logic/profile.js       Ausschlüsse für „Mein Profil“ gruppieren
  logic/stage0.js        Ausschlüsse aus dem Onboarding ableiten
  logic/allergens.js     Auswahl und Suche in der Allergenliste
  logic/search.js        tolerante Suche (Gross-/Kleinschreibung, ä/ae)
  logging/logger.js      Sitzungen in localStorage
  logging/export.js      CSV- und JSON-Export
  components/            Swipe-Karte, Antwortknöpfe, untere Navigation, Sheets, Suche, Chips, Zustände
  screens/               Willkommen, Registrierung (3), Willkommen zurück, Über dich, Fragebogen,
                         Zusammenfassung, Tutorial (aus), Runde, Abschluss, Mein Profil, Admin
  test/dom.js            kleine DOM-Umgebung (jsdom) für Komponententests
scripts/
  test-setup.mjs         lädt JSX, JSON und CSS in node --test wie Vite
  check-mobile.py        Prüfung der Mobile-Kriterien (A11) mit Playwright
```

## Logik austauschen (nächster Schritt)

Die Oberfläche ruft nur `nextCard(state, config)` auf, das intern `selectNextCards(state, config)` nutzt. Diese Funktion liefert heute eine feste Reihenfolge ohne Bezug auf die Antworten (`fixedOrder` in `src/logic/engine.js`): zuerst alle Gruppen, dann die Untergruppen abwechselnd aus allen Gruppen, je Runde höchstens das Rundenlimit. Stufe 3 kommt nicht vor. Sie trägt den Kommentar „TODO: Adaptive Logik folgt – Eigenleistung Team“. Bewusst noch nicht gebaut:

- Auswahl je nach Antwort (Stufe 1 → 2 → 3, z. B. nur Untergruppen von Gruppen mit „Mag ich“),
- Nachtesten von Ausnahmen nach „Mag ich nicht“,
- Unterkarte nach „Kenne ich nicht“,
- gezielte Favoritensuche nach „Mag ich sehr“.

Alle Funktionen sind rein. Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen; sie steht in jedem Ereignis.

## Mobile-Kriterien

Geprüft bei 360 × 640 und 430 × 932 auf allen 26 Bildschirmen (inkl. Registrierung mit SMS-Mitteilung, Detailauswahl, Zusammenfassung mit „Ändern“, Bestätigung, Abschluss, Runde 2, Bewertung, Allergien, Suche und Bestätigung in „Mein Profil“ sowie „Willkommen zurück“), mit 100 % und 130 % Schrift: kein horizontaler Scroll, Touch-Ziele ≥ 44 × 44 CSS-px, Textkontrast ≥ 4.5:1 (axe-core), jeder Text ≥ 18 px, bei 130 % Schrift wird nichts abgeschnitten, `prefers-reduced-motion` wird respektiert. In der Runde füllt der Kartenstapel den Platz zwischen Fortschritt und Knöpfen; auf kleinen Bildschirmen wird nur das Kartenbild kleiner, damit alle Knöpfe und „Vertrage ich nicht“ ohne Scrollen sichtbar bleiben. Auf hohen Handys ist der Stapel begrenzt, damit das Foto nicht zu stark beschnitten wird.

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
- Echte SMS über Firebase: Die Handynummer geht für die einmalige Registrierung an Google (USA). Teamentscheid 15.10.: in Ordnung; im Einwilligungstext der Studie erwähnen (Frage F4). Kosten pro SMS über den Blaze-Tarif. Für Testpersonen ohne eigenes Handy `?sms=sim`.
- Stufe 4 (Gerichte, z. B. „Pizza Margherita“) folgt später; die Gerichte der Nährwertdatenbank sind deshalb noch nicht in der Suche.
- Soll die Registrierung in der Nutzerstudie aktiv sein? Sie kostet Zeit vor dem Swipen (auswertbar über `AUTH_STARTED`/`AUTH_COMPLETED`). Abschaltbar mit `AUTH_ENABLED = false`.
- Dürfen Testpersonen ihr Profil während der Studie bearbeiten? Jede Änderung ist im Log nachvollziehbar, verändert aber das angezeigte Profil.
- Synonyme: unsichere Begriffe in `synonymTodos` (z. B. „Baumnuss“ für Walnuss vs. Kartentitel „Baumnüsse“, Peperoni in Deutschland).
- Glutenfreie Varianten: Früher hiess es „Nur glutenfrei“, mit Tags entfällt die Familie Brot bei „Alles mit Gluten“ ganz.
- „Alkohol“ als Schnellauswahl in Frage 3 fehlt, weil der Katalog keinen passenden Tag hat.
- Werden die neuen Begriffe im Pilot verstanden?
- Standardwert für das Kartenlimit (heute 10 Karten je Runde; Runde 1 zeigt 10 von 13 Gruppen).
- Wird „Vertrage ich nicht“ übersehen oder mit „Mag ich nicht“ verwechselt? Im Pilot über `inputMethod = link` und Rückgängig-Ereignisse auswertbar.
- Tutorial: seit dem 13.10. aus. Ein Pilot-Vergleich ist mit `TUTORIAL_ENABLED = true` möglich (nicht über die URL).
- Zusammenfassung vor dem ersten Swipe: am 13.10. entfernt, am 14.10. in kurzer Form wieder eingebaut, weil nurec v0.2, Kap. 2.2 [D] sie verlangt („Die Person bestätigt oder korrigiert jede Regel.“). Mit dem Team bestätigen. Wie lange sie dauert, zeigt das Protokoll (Bildschirmwechsel, `stage0_edit`, `stage0_confirm`).
- Gespeicherter Stand auf dem Testgerät („Willkommen zurück“): Ins Testprotokoll gehört, dass die Testleitung nach jeder Person „Neue Testperson starten“ drückt. Gehört zu Frage F4.
- „Aus dem Profil entfernen“: Die Karte zählt für die Runde weiter als beantwortet. Für die Auswertung vertretbar, im Bericht erwähnen.
- Marken und Händler (z. B. Migros, M-Budget): Eine Autovervollständigung fehlt noch; heute freie Eingabe ohne Wirkung auf die Karten.
- Kacheln: Die Auswahl der 8 häufigen Allergene ist eine Annahme, keine Häufigkeitsangabe.
- Frage F4: Einwilligung und Speicherung von Gesundheitsdaten im Test.
- Ansprache mit Du oder Sie, Wischschwellen.
- Bildlizenzen: alle 46 Fotos unter der Unsplash License (keine Unsplash+-Bilder, Stand 14.10.2026); Nachweise mit APA 7 in `src/data/image-credits.json`. Vor der Abgabe Namen und Titel prüfen (z. B. „David Foodphototasty“ ist ein Künstlername) und klären, ob nurec für eine spätere Nutzung eigene Fotos braucht.
- Fotos oder Illustrationen (`IMAGE_STYLE`): mit Tibor abstimmen oder im Pilot vergleichen. Ob die Fotos die Bewertung beeinflussen (Annahme 5), im Pilot beobachten; die Fotos stammen von vielen Fotografen und sind nicht alle im gleichen Licht.
- Fotos fehlen für **Vollkornpasta** und **Pasta aus Hülsenfrüchten**: In den gespeicherten Unsplash-Suchen gab es kein passendes freies Foto (die Live-Suche ist durch eine Bot-Sperre blockiert). Die Karten zeigen die Pasta-Illustration; das Bildraster „Pasta“ zeigt drei Weizenpasten. Nachliefern, z. B. mit einem eigenen Foto oder einem Unsplash- bzw. Pexels-Zugang.
- Runden 2 bis 4 in fester Reihenfolge sind ein Platzhalter: Sie fragen auch Untergruppen ab, deren Gruppe jemand nicht mag. Die Auswahl je nach Antwort ist Eigenleistung des Teams.
- Rückmeldung Team (12.10.) statt A7: Eingetippte Notizen blenden das Wort als Beispiel aus, schliessen aber keine Gruppe aus. Bestätigen, dass das so bleiben soll.

## Quelle

Kartenkatalog Stufe 1 und 2, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
Allergene: Verordnung des EDI betreffend die Information über Lebensmittel (LIV), Anhang 6; Verordnung (EU) Nr. 1169/2011 (LMIV), Anhang II.
Lebensmittelliste der Suche: Schweizer Nährwertdatenbank, Generische Lebensmittel V 7.1 (01.07.2026), Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), https://naehrwertdaten.ch (frei verwendbar mit Quellenvermerk; der Vermerk steht auch in „Mein Profil“ unter „Bildnachweise und Quellen“).
