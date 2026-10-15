# Geschmacksprofil 50+ · Prototyp

Mobiler Swipe-Prototyp zur Geschmacksprofilerkennung bei Personen ab 50 (WI-Projekt, Auftraggeber nurec).
Version 0.8: vollständig nach dem nurec-Konzept v0.2 (Abgleich Kapitel für Kapitel unten unter „Abgleich mit nurec v0.2“). Stufe 0 bis 4 mit konkreten Lebensmitteln (Anhang A3) und Gerichten, Auswahlregeln nach Kap. 6 und 11, Ergebnis-Dashboard mit Profilstand (Anhang B), freiwilliges Alltagsprofil (Kap. 2.3), Kontrollkarten und Auswertung der Lernkurve mit Pilot-Kennzahlen (Messkonzept in [`docs/messkonzept.md`](docs/messkonzept.md)). Dazu wie bisher Designsystem, Swipe-Oberfläche, Registrierung mit SMS-Code (echt über Firebase oder simuliert) und einheitliche Suche über alle Lebensmittel.

Hinweis zur Eigenleistung: Auswahl, Modell, Dashboard, Stufe 3 und 4, Alltagsprofil und Auswertung hat Claude Code (KI) im Auftrag des Teams umgesetzt (15.10.2026), auf Grundlage einer Rückmeldung zum Vorgehen und des nurec-Konzepts. Die Regeln folgen nurec v0.2 [D]; Rangfolge, Annahmen und Kriterium sind Vorschläge [V], die das Team bestätigt oder ändert. Wie die KI-Unterstützung in der Arbeit deklariert wird, mit Tibor klären.

Quellenlabels in diesem Dokument: [A] Aufgabenstellung, [K] Aussagen von Tibor (Kickoff, Zwischencheck),
[D] bereitgestellte Dokumente (nurec-Konzept), [V] eigene Entscheidung des Teams.

## Ablauf

Die App hat zwei Bereiche: **Profil erstellen** und **Mein Profil**. Die untere Leiste dafür erscheint erst ab dem Abschluss der ersten Runde und in „Mein Profil“ (Rückmeldung Team, 14.10.): Während Registrierung, Fragen, Zusammenfassung und beim Wischen gibt es nur einen Weg nach vorn. „Mein Profil“ ist immer über den runden Knopf oben rechts erreichbar (Initiale des Vornamens).

1. **Willkommen:** kurze Einführung.
2. **Registrierung** (`AUTH_ENABLED`, Standard an): Vorname → Handynummer → SMS-Code. Der Code kommt als echte SMS (Firebase), sobald das Projekt eingerichtet ist, sonst simuliert; siehe unten.
3. **Über dich:** Alter und Einwilligung sind Pflicht, unter „Für die Testleitung“ die Teilnehmer-Nr. Ohne Registrierung startet die App hier, der Vorname ist dann freiwillig.
4. **Fragebogen (Stufe 0):** drei Fragen, eine pro Bildschirm, Details nur bei „Ja“. Frage 2 bietet „Ja“ und „Keine bekannt“, Frage 3 fragt nach „etwas Weiterem“.
5. **Zusammenfassung** (nurec v0.2, Kap. 2.2 [D]): „Stimmt das so?“ zeigt alle festen Regeln, je Frage ein Abschnitt (Ernährungsweise, Allergien und Unverträglichkeiten, „Möchte ich nicht essen“). „Ändern“ öffnet direkt die passende Frage und führt danach zurück; „Stimmt so“ bestätigt. Ein offenes „Ich bin mir nicht sicher“ steht dort als offen, nicht als Freigabe. Bewusst kurz, ohne Vorschau der Karten.
6. **Runde 1:** nach „Stimmt so“ direkt die erste Karte (kein Tutorial, Teamentscheid vom 13.10.). Vorher zieht die App still die Kontrollkarten (siehe unten). Höchstens `ROUND_CARD_LIMIT` Karten (Standard 10), zuerst die Gruppen. Karte und Knöpfe haben den ganzen Bildschirm.
7. **Abschluss:** kurze Übersicht (Anzahl je Antwort, Anzahl fester Regeln), Ausblick auf die nächsten Karten, „Weiter mit Runde 2“ und „Mein Profil ansehen“.
8. **Runde 2 bis maximal 4:** Die Karten wählt die App je nach den bisherigen Antworten (siehe „Kartenauswahl“): übrige Gruppen, die Ausnahme bei „Mag ich nicht“, zwei Untergruppen als Kontrast bei „Mag ich“, konkrete Lebensmittel nur bei einem Unterschied und als Favoriten. Gemäss Vorgabe des Dozenten endet die Profilerstellung spätestens nach Runde 4 (`MAX_ROUNDS` in `src/config.js`). Sie endet früher, wenn keine Karte mehr neue Information verspricht. Die letzten Karten sind die Kontrollkarten. Ausschlüsse wirken in jeder Runde.
9. **Freiwillig: Gerichte (Stufe 4)** nach Stufe 2 oder am Ende der Profilerstellung: eine eigene kurze Runde mit konkreten Gerichten (z. B. Pizza Margherita, Rösti mit Spiegelei). Sie zählt nicht zu den vier Runden und überträgt nichts auf Zutaten (nurec Kap. 5 und 7).
10. **Freiwillig: Alltag** (nurec Kap. 2.3): Kochzeit, Küchengeräte, Budget, Einkaufsorte und Marken, Convenience, Packungsgrösse. Jede Frage überspringbar.
11. **Mein Profil:** Dashboard nach nurec Anhang B (siehe unten).

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

## Mein Profil (Dashboard, nurec Anhang B)

- **Profilstand „Profil aufgebaut“** (Anhang B2): Prozentwert als Erfassungsgrad mit Balken, darunter ehrlich „Zeigt, wie viel von deinem Geschmack erfasst ist, nicht wie genau Vorschläge sind“. Punkte nach dem Entwurf 35/30/35: Stufe 1 = Anteil der zulässigen Gruppen mit Geschmacksantwort, Stufe 2 = Anteil der Zweige mit beantworteter Ausnahme bzw. Kontrastpaar, Stufe 3 = konkrete Lebensmittel (voll ab 12, Annahme [V]). Gerichte und Alltag zählen nicht; „Kenne ich nicht“ gibt keine Punkte; Ausgeschlossenes ist nicht relevant. Dazu die höchste abgeschlossene Stufe und der **nächste sinnvolle Schritt** mit Knopf (nächste Runde mit Beispielen, Gerichte, Alltag). Berechnet in `src/logic/dashboard.js` (`profileProgress`); erscheint auch nach jeder Runde im Abschluss.
- **Dein Geschmack:** zuerst **Deine Favoriten** (Anhang B3.1: nur konkrete Lebensmittel mit eigener Bewertung, „Sehr gern“ vor „Gern“), dann **Gruppen, die du magst** („gilt für die Gruppe, nicht automatisch für jedes Lebensmittel darin“), dann **Isst du eher ungern** mit Ausnahmen darunter („Ausnahme: Sojaprodukte, Naturtofu“).
- **Das vermutet die App** (B3.2, getrennt und gestrichelt): mögliche Favoriten und Vermutungen mit Begründung, stärkste zuerst, „Alle anzeigen“ bei langen Listen. Tippen öffnet die Bewertung: Die eigene Antwort ersetzt die Vermutung (`RATING_CHANGED` mit `fromPrediction: true` und `predictedScore`). Kontrollkarten erscheinen erst nach ihrer Antwort.
- **Noch offen:** „Kennst du nicht“ getrennt von „Noch nicht gefragt“ (beides ist keine Bewertung).
- **Feinheiten:** roh gegenüber gegart (z. B. Rohe Rüebli: Mag ich nicht · Gekochte Rüebli: Mag ich), nur wenn beides beantwortet ist und sich unterscheidet.
- **Gerichte** (Stufe 4) getrennt von den Lebensmitteln, mit „Gerichte bewerten“, sobald verfügbar.
- **Ausschlüsse** (Nie vorschlagen), getrennt vom Geschmack: Allergien, Ernährungsweise, „Vertrage ich nicht“, „Möchte ich nicht essen“, Notizen. Bei jedem Eintrag die Herkunft (im Onboarding, beim Wischen, im Profil) und Zusätze nach Kap. 2.2: „ärztlich vorgegeben“, „kleine Mengen gehen“, „prüfen“ (eingetippt, nicht eindeutig zugeordnet).
- **Alltag** (Kap. 2.3): Zusammenfassung in Worten, „Ergänzen“ bzw. „Ändern“.
- **Bearbeiten:** Bewertung über ein Segmented Control mit den drei Bewertungen und „Aus dem Profil entfernen“; Allergien mit derselben Komponente wie im Onboarding; Ernährungsweise; „Vertrage ich nicht“ und „Möchte ich nicht essen“ über die Suche. Allergien und Unverträglichkeiten werden nur nach einer Bestätigung entfernt.
- **Event-Log:** Jede Änderung ist ein Ereignis (`RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED`, `PRACTICAL_SAVED`). Der Zustand wird per Replay abgeleitet; die ursprüngliche Antwort beim Wischen bleibt unverändert im Log.

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

Grundlage ist nurec v0.2, Kap. 2 [D]. Die Bereiche 0.1 bis 0.6 sind als drei Fragen umgesetzt [V].

| Frage | Bereiche | Umsetzung |
| --- | --- | --- |
| Feste Ernährungsweise | 0.4 | Tabelle `diets` in `stage0.json`: kein Schweinefleisch (religiöse Regel, auch keine Gelatine), kein Fisch, pescetarisch, vegetarisch, vegan schliessen Tags aus `animalOrigin` aus (vegetarisch und vegan auch Gelatine, vegan auch Honig) |
| Allergien und Unverträglichkeiten | 0.1 bis 0.3 | 14 Hauptallergene (LIV Anhang 6, LMIV Anhang II) in `allergens.json`; 8 als Kacheln, der Rest über „Weitere anzeigen“ und Suche; dazu freiwillig „ärztlich oder fachlich festgestellt (z. B. Zöliakie)“ (0.2) und bei Laktose „Ganz meiden“ oder „Kleine Mengen gehen“ (0.3) |
| Nie vorschlagen | 0.5, 0.6 | Schnellauswahl (inkl. Alkohol), Suche über alle Lebensmittel, Eintragen ohne Treffer; Marken und Händler über eine Liste genau zugeordnet, Herkunft als Text |

- Milch ist getrennt in **Laktose (Unverträglichkeit)** und **Milcheiweiss (Allergie)**.
- **„Kleine Mengen gehen“** wird gespeichert (`scope: "limited"`), ist aber nie eine Freigabe (nurec 0.3: „eine variable Mengengrenze nicht ohne belastbare Angabe als sichere Freigabe verwenden“). Das steht auch in der App.
- **Erdnüsse** stehen seit der Rückmeldung vom 12.10. unter **Nüsse** (ersetzt A5). Sie behalten die eigene ID `peanut`; „Alle Nüsse (inkl. Erdnüsse)“ wählt sie mit aus.
- **Nüsse** und **Gluten** öffnen eine Unterauswahl mit „Alle Nüsse (inkl. Erdnüsse)“ bzw. „Alles mit Gluten (z. B. Zöliakie)“.
- **„Ich bin mir nicht sicher, ob es weitere gibt“** (nach „Ja“) setzt nur ein Flag. Bewusste Abweichung von nurec Kap. 2 (dort „vorhanden / keine bekannt / unsicher“ je Kategorie): Teamentscheid vom 13.10., am 15.10. bestätigt. Das Flag erscheint in der Zusammenfassung als offen, nie als Freigabe.
- **Eintragen ohne Treffer:** Was man eintippt, wird eingetragen (`type: "food"`, Status „prüfen“). Keine Gruppe fällt weg, aber das Wort erscheint nirgends mehr als Beispiel, und konkrete Lebensmittel und Gerichte mit diesem Namen oder dieser Zutat fallen weg (z. B. „Tomate“ → „Rohe Tomaten“, Pizza Margherita).
- **Marken und Händler** (0.6): Vorschläge aus `src/data/brands.json` (Händler und Marken, Eigenmarken mit Händler, z. B. „M-Budget · Marke von Migros“). Gespeichert wird genau der gewählte Name, nie Schwester-Marken. Was nicht in der Liste steht, bleibt als Text mit Status „prüfen“. Ohne Produktdaten wirkt beides noch nicht auf die Karten; das steht so auch in der App.
- **Nichts doppelt:** Was frühere Angaben schon ausschliessen, wird nicht nochmals angeboten.
- **Gespeichert je Regel** (Kap. 2.2): Typ, ID, Herkunft (`source`, `origin`), Quelle der Vorgabe (`medical`), Geltungsbereich (`scope`), Prüfstatus (`status: "check"` bei Notizen) und der Zeitpunkt über das Ereignis im Log.
- Keine medizinischen Aussagen und keine Diagnosen.

## Filter über Tags

Jede Karte trägt `allergens` (granulare IDs wie `hazelnut`, `lactose`, `wheat`) und `animalOrigin` (`meat`, `pork`, `fish`, `seafood`, `dairy`, `egg`, `honey`, `gelatin`). Eine reine Funktion `isAllowed(card, exclusions)` entscheidet; `isVisible` ergänzt die Familienregel: Eine Gruppe erscheint nur, wenn mindestens ein Kind erlaubt ist. Bleibt eine Gruppe, zeigt sie nur erlaubte Beispiele und einen Hinweis wie „Ohne Haselnüsse“.

Seit Version 0.8 gilt zusätzlich (nurec Kap. 2.2: harte Ausschlüsse wirken auf Karten, Zutaten, Produkte und spätere Vorschläge):

- **Zusammengesetzte Produkte und Gerichte** fallen weg, wenn eine verknüpfte Karte ausgeschlossen ist (`ingredients`, z. B. Hummus → Sesam, Spaghetti Bolognese → Schwein).
- **Konkrete Lebensmittel und Gerichte** fallen weg, wenn ein eingetipptes Lebensmittel ihr Name oder eine ihrer Zutaten ist (`ingredientNames`).
- Allergene bei Gerichten und Produkten sind **vorsichtig** vergeben: Was je nach Rezept enthalten sein kann (z. B. Sellerie in der Bouillon), ist getaggt und als `todo` markiert (nurec: „Fehlende Zutaten- oder Allergeninformationen sind keine Bestätigung der Sicherheit“).

## Konfiguration per URL

| Parameter | Wirkung | Standard |
| --- | --- | --- |
| `?limit=6` | Karten pro Runde (`ROUND_CARD_LIMIT`), gültig 4 bis 30; ungültige Werte fallen auf den Standard zurück | 10 |
| `?admin=1` | Ansicht für die Testleitung | – |
| `?sms=sim` | SMS-Code simulieren statt echt verschicken (z. B. für Testpersonen ohne eigenes Handy) | echt, wenn Firebase eingerichtet ist |
| `?selection=fixed` | feste Reihenfolge wie in Version 0.6 statt adaptiver Auswahl (Vergleich im Pilot) | adaptiv |
| `?holdout=4` | Anzahl Kontrollkarten, gültig 0 bis 10 (0 = keine) | 6 |

Kombinierbar, z. B. `?limit=6&admin=1`. Die effektiven Werte werden in jeder Sitzung gespeichert. Begründung [V]: Kernfrage 2 [A] lässt sich so ohne neuen Build vergleichen. `?tutorial` wirkt seit dem 13.10. nicht mehr. Die Standardwerte stehen als `ROUND_CARD_LIMIT`, `MAX_ROUNDS`, `SELECTION_MODE`, `HOLDOUT_CARDS`, `PREFERENCE_MODEL`, `TUTORIAL_ENABLED` (aus), `IMAGE_STYLE` (Fotos) und `AUTH_ENABLED` (an) in `src/config.js`. Sitzungen von vor Version 0.7 behalten beim Weitermachen die feste Reihenfolge.

## Protokoll und Export

Alles bleibt im Browser (`localStorage`), es gibt kein eigenes Backend. Einzige Netzwerkanfrage ist der SMS-Versand über Firebase (nur Handynummer und Code, keine Antworten). Eine Sitzung wird erst gespeichert, wenn unter „Über dich“ die Einwilligung gegeben ist.

- **Pro Sitzung:** `sessionId`, `participantCode`, `startedAt`, `endedAt`, `appVersion`, `config`, Onboarding (Altersgruppe, Ernährungsweise, Ausschlüsse mit `source`, Unsicherheits-Flag, Notizen) und das am Ende angezeigte Profil. Dazu Zeitpunkte im `trace` (nur im JSON-Export), z. B. Bildschirmwechsel, `stage0_edit` („Ändern“ in der Zusammenfassung), `stage0_confirm` („Stimmt so“), Start und Ende der Runde.
- **Pro Ereignis:** `sessionId`, `cardId`, `stage`, `kind` (Entitätstyp nach Kap. 8), `parentId`, `round` (Runde 1, 2, …, Gerichte „G1“; in der CSV als eigene Spalte), `phase` (`main` = normale Auswahl, `holdout` = Kontrollkarte, `dish` = Gericht), `alternatives` (bis zu 5 Kandidaten, die stattdessen hätten kommen können, Anhang B3.2), `positionInRound`, `response` (`DISLIKE` | `LIKE` | `PREFER` | `UNFAMILIAR` | `INTOLERANT` | `UNDO`), `timestamp`, `responseTimeMs` (Karte vollständig sichtbar bis Antwort), `inputMethod` (`swipe` | `button` | `link`; `keyboard` nur bei Demos am Laptop), `selectionReason` (warum die Karte kam, z. B. `stage2_favorite`, `stage2_exception`, `holdout_check`; Liste in `src/logic/selection.js`), `ruleVersion`, bei INTOLERANT zusätzlich `excludedCardIds`.
- **Weitere Ereignisse im selben Log** (`type`): `RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED` (Profil, `source = "profile"`), `AUTH_STARTED`, `AUTH_COMPLETED` (Registrierung), `HOLDOUT_DRAWN` (Kontrollkarten mit `cardIds`), `QUESTION_ABORTED` („Runde beenden“ mit offener Karte, Kap. 6) und `PRACTICAL_SAVED` (Alltagsprofil). Die CSV hat dafür die Spalten `type`, `source`, `rating`, `previousRating`, `fromPrediction`, `predictedScore`, `practical` (JSON), `section`, `exclusions`, `cardIds`, `newDiet`, `previousDiet`, dazu je Sitzung `auth`, `sms`, `selection` und `holdout`.
- **Profil am Ende** (`profile` in der Sitzung): direkte Bewertungen, Ausschlüsse (mit `medical`, `scope`, `status`), getrennt davon `predicted` (Vermutungen mit `score` und `basisId`), `progress` (Profilstand) und `practical` (Alltagsprofil).

**Ansicht für die Testleitung:** `?admin=1` anhängen. Sie ist nirgends verlinkt und zeigt alle Sitzungen auf dem Gerät mit:

- Export JSON (alles) und Export CSV (eine Zeile pro Ereignis, `sessionId` in jeder Zeile, UTF-8, Komma als Trennzeichen),
- je Sitzung „Kontrollkarten: x von 6 beantwortet“ (nur vollständige Sitzungen eignen sich für die Lernkurve),
- „Neue Testperson starten“ (meldet die vorherige Person auf dem Gerät ab und lädt die App neu, behält Sitzungen und die Parameter wie `limit` oder `selection`). **Nach jeder Testperson drücken:** Sonst sieht die nächste Person „Willkommen zurück“ und das Profil der vorherigen (Gesundheitsdaten, siehe Frage F4).
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
| `npm run auswertung -- <export.json>` | Lernkurve und Kennzahlen aus JSON-Exporten (siehe [`docs/messkonzept.md`](docs/messkonzept.md), Abschnitt 10) |

Jeder Push auf `main` testet, baut und veröffentlicht den Prototyp auf GitHub Pages (`.github/workflows/deploy.yml`).

## Aufbau

```
src/
  config.js              Standardwerte (ROUND_CARD_LIMIT, MAX_ROUNDS, SELECTION_MODE, HOLDOUT_CARDS, PREFERENCE_MODEL, TUTORIAL_ENABLED,
                         IMAGE_STYLE, AUTH_ENABLED), URL-Parameter, Wischschwellen, Datenschutz
  labels.js              alle sichtbaren Texte
  theme/tokens.css       Design-Tokens (einzige Stelle für Gestaltungswerte)
  theme/motion.js        Animationsdauern aus den Tokens für JavaScript
  styles/                Komponenten-CSS (nur Tokens): base, controls, app, card, screens, account
  app/model.js           Ablauf und Zustand der App (rein, getestet)
  data/catalog.json      Kartenkatalog Stufe 1 bis 4: id, stage, kind, parentId, children, allergens, animalOrigin, block,
                         exceptionCandidate, contrastPair, ingredients, ingredientNames, preparation, variantOf, todo
  data/practical.json    Fragen des Alltagsprofils (Kap. 2.3)
  data/brands.json       häufige Händler und Marken für die genaue Zuordnung (0.6)
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
  logic/engine.js        replay (Event-Log inkl. Profiländerungen), Runden, Budget bis Runde 4, Kontrollkarten am Ende,
                         Fortschritt, computeProfile, derivedEntries (Vermutungen)
  logic/selection.js     adaptive Kartenauswahl (Regeln nach nurec v0.2) und feste Reihenfolge zum Vergleich
  logic/preferences.js   Präferenzmodell: direkte Bewertungen und Vermutungen
  logic/holdout.js       Kontrollkarten ziehen (geschichtet, Zufall aus der sessionId)
  logic/dashboard.js     Profilstand „Profil aufgebaut“ und Inhalt des Dashboards (Anhang B)
  logic/practical.js     Alltagsprofil, Marken und Händler zuordnen
  analysis/evaluation.js Auswertung: Lernkurve, Vergleichswerte, Bootstrap-Intervalle, Modellvarianten
  logic/profile.js       Ausschlüsse für „Mein Profil“ gruppieren
  logic/stage0.js        Ausschlüsse aus dem Onboarding ableiten
  logic/allergens.js     Auswahl und Suche in der Allergenliste
  logic/search.js        tolerante Suche (Gross-/Kleinschreibung, ä/ae)
  logging/logger.js      Sitzungen in localStorage
  logging/export.js      CSV- und JSON-Export
  components/            Swipe-Karte, Antwortknöpfe, untere Navigation, Sheets, Suche, Chips, Zustände
  screens/               Willkommen, Registrierung (3), Willkommen zurück, Über dich, Fragebogen,
                         Zusammenfassung, Tutorial (aus), Runde (auch Gerichte), Abschluss, Alltag, Mein Profil, Admin
  test/dom.js            kleine DOM-Umgebung (jsdom) für Komponententests
  test/simulate.js       simulierte Testpersonen für Tests (keine echten Daten)
docs/
  messkonzept.md         Kontrollkarten, Kennzahlen, Vergleichswerte, Kriterium, Pilot
scripts/
  test-setup.mjs         lädt JSX, JSON und CSS in node --test wie Vite
  evaluate.mjs           npm run auswertung: liest JSON-Exporte, schreibt Lernkurve und Tabellen nach auswertung/
  check-mobile.py        Prüfung der Mobile-Kriterien (A11) mit Playwright
```

## Kartenauswahl

Die Oberfläche ruft nur `nextCard(state, config)` auf, das intern `selectNextCards(state, config)` nutzt. Welche Karte kommt, entscheidet `rankedCards` in `src/logic/selection.js` (rein, getestet in `src/logic/selection.test.js` mit den Beispielen aus nurec Kap. 11). Die Regeln stammen aus nurec v0.2, Kap. 5, 6 und 11 [D]; die Rangfolge und die Anschlusskarten ohne Beispiel im Konzept sind eigene Entscheide [V] (`exceptionCandidate`, `contrastPair` und `followUpSource` je Gruppe im Katalog).

| Rang | Karten | `selectionReason` |
| --- | --- | --- |
| 1 | „Kenne ich nicht“ bei einer Gruppe oder Untergruppe: sofort ein verbreitetes Kind, bei erneutem „Kenne ich nicht“ ein zweites, andersartiges; danach bleibt der Zweig unbekannt. Nur in derselben Runde (Kap. 6: „Ist das Limit vor der zweiten Klärungskarte erreicht, bleibt der Zweig unbekannt“) | `stage2_after_unfamiliar`, `stage3_after_unfamiliar` |
| 2 | Gruppen (Stufe 1), die noch nicht gefragt wurden | `stage1_family` |
| 3 | Gruppe „Mag ich nicht“: die plausible Ausnahme (Hülsenfrüchte → Sojaprodukte, Fisch und Meeresfrüchte → Krebstiere) | `stage2_exception` |
| 4 | Gruppe „Mag ich“ oder „Mag ich sehr“: zwei Untergruppen als Kontrast (Obst → Beeren und Zitrusfrüchte, Milchprodukte → Joghurt und Quark sowie Käse) | `stage2_contrast` |
| 5 | Ausnahme gefällt: bis zu zwei konkrete Lebensmittel daraus (Naturtofu, Tempeh); Kontrast verschieden: je ein konkretes Lebensmittel (Erdbeeren, Orangen) | `stage3_exception_detail`, `stage3_difference` |
| 6 | Untergruppe „Mag ich sehr“: bis zu drei konkrete Favoriten | `stage3_favorite` |
| 7 | Kontrast verschieden: die übrigen Untergruppen; „Vertrage ich nicht“ nur für einen Teil: höchstens zwei der übrigen | `stage2_difference`, `stage2_after_intolerant` |

- Fällt der Kontrast gleich aus, ist der Zweig geklärt: Die übrigen Untergruppen werden vermutet, nicht gefragt. Bei „Mag ich nicht“ ohne Ausnahme ebenso („bei DISLIKE vorerst stoppen“). Eier und Kartoffeln brauchen keine Untergruppe.
- Innerhalb eines Rangs wechseln sich die Gruppen ab. Eine Kontrollkarte wird durch das nächste passende Kind ersetzt.
- Massgebend ist die aktuelle direkte Bewertung, auch wenn sie im Profil geändert wurde. Harte Ausschlüsse wirken immer.
- **Budget:** höchstens `MAX_ROUNDS` × Kartenlimit Karten (4 × 10 = 40). Die normale Auswahl bekommt nur so viele Plätze, dass am Ende alle Kontrollkarten Platz haben (bei 6 Kontrollkarten höchstens 34).
- **Gerichte** (Stufe 4) haben eigene, freiwillige Runden (`G1`, `G2` …) mit allen sichtbaren Gerichten in Katalogreihenfolge; sie zählen nicht zu `MAX_ROUNDS` und haben keine Kontrollkarten.
- **Feste Reihenfolge** (`?selection=fixed`): wie in Version 0.6, als Vergleich. Auch sie hält die Kontrollkarten zurück.
- Bei jeder Änderung der Regeln `RULE_VERSION` in `src/logic/engine.js` erhöhen (heute `demo-0.4`); sie steht in jedem Ereignis.

## Präferenzmodell und Kontrollkarten

- **Direkt:** Mag ich nicht −1, Mag ich +1, Mag ich sehr +2. „Kenne ich nicht“ und „Vertrage ich nicht“ sind kein Geschmack.
- **Vermutet:** Eine Karte ohne eigene Bewertung erbt die Bewertung ihrer nächsten bewerteten Gruppe, pro Stufe mit dem Faktor 0.5 abgeschwächt (nurec Kap. 7: „nur ein vorsichtiger Hinweis“). „Mag ich sehr“ wird nie vermutet. Zusammengesetzte Produkte und Gerichte sind eigene Einheiten: keine Vermutung, und ihre Antwort geht nie auf Zutaten über. Variante für die Auswertung: bewertete Geschwister zählen mit (`siblingWeight`, Standard 0 = aus).
- Alle Zahlen sind Annahmen [V] (`PREFERENCE_MODEL` in `src/config.js`). Ohne Geschwister hängt die Richtung einer Vermutung nur am Vorzeichen; Faktor und Gewichte ändern die Trefferquote nicht (Test in `src/logic/preferences.test.js`).
- **Kontrollkarten:** Nach „Stimmt so“ zieht die App pro Person 6 Untergruppen zufällig (eine pro Gruppe, Zufall aus der `sessionId`, Ereignis `HOLDOUT_DRAWN`). Sie kommen nie in der Auswahl vor, sondern am Ende der letzten Runde, und sehen aus wie alle anderen Karten. An ihnen prüft die Auswertung, ob die Vermutungen stimmen.
- **Auswertung:** `npm run auswertung -- <export.json>` rechnet aus dem Protokoll nach, was die App nach k Antworten vermutet hätte (Lernkurve), mit den Vergleichswerten „immer Mag ich“ und „andere Personen“ und 95-%-Intervallen. Alles Weitere, auch Kriterium und Pilottest: [`docs/messkonzept.md`](docs/messkonzept.md).

## Mobile-Kriterien

Geprüft bei 360 × 640 und 430 × 932 auf allen 34 Bildschirmen (inkl. Registrierung mit SMS-Mitteilung, Zusatzangaben in Frage 2, Detailauswahl, Zusammenfassung mit „Ändern“, Bestätigung, Abschluss mit Profilstand, Runde 2, Gerichte-Runde, Alltagsprofil, Dashboard, Bewertung, Vermutungen der App mit Bewertung, Allergien, Suche und Bestätigung in „Mein Profil“ sowie „Willkommen zurück“), mit 100 % und 130 % Schrift: kein horizontaler Scroll, Touch-Ziele ≥ 44 × 44 CSS-px, Textkontrast ≥ 4.5:1 (axe-core), jeder Text ≥ 18 px, bei 130 % Schrift wird nichts abgeschnitten, `prefers-reduced-motion` wird respektiert. In der Runde füllt der Kartenstapel den Platz zwischen Fortschritt und Knöpfen; auf kleinen Bildschirmen wird nur das Kartenbild kleiner, damit alle Knöpfe und „Vertrage ich nicht“ ohne Scrollen sichtbar bleiben. Auf hohen Handys ist der Stapel begrenzt, damit das Foto nicht zu stark beschnitten wird.

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
| Naturjoghurt, Joghurt und Quark | Laktosefreie Varianten als eigene Karten? |
| Toastbrot, Vollkorntoast, Roggenvollkornbrot, Mehrkornknäcke | Milch, Weizen, Hafer, Sesam je nach Produkt; vorläufig konservativ getaggt. |
| Linsenpasta, Kichererbsenpasta | Spuren von Gluten je nach Produkt; nicht getaggt. |
| Falafel | Weizenmehl und Sesam je nach Rezept; vorläufig konservativ getaggt. |
| Fruchtjoghurt | Gelatine je nach Produkt (vegetarisch); nicht getaggt. |
| Gerichte (Stufe 4) | Allergene je nach Rezept (Sellerie in Bouillon, Senf in Gewürzen, Parmesan, Ei in Teigwaren); vorläufig konservativ getaggt, Zutaten als `todo` beschrieben. |
| Muscheln | Zuordnung zu Weichtiere bestätigen. |

Seit Version 0.8 geklärt: Klassische Pasta (Eiernudeln sind jetzt die eigene Karte „Bandnudeln“), Wurzelgemüse (Sellerie als eigene Karte „Knollensellerie“ mit Tag).

Ausserdem:

- Erdnüsse: Es gibt keine Erdnuss-Karte. Eine Erdnussallergie blendet beim Wischen deshalb noch nichts aus. Umgekehrt schliesst „Alle Nüsse (inkl. Erdnüsse)“ auch Erdnüsse aus, wer nur Baumnüsse meint.
- Marken und Herkunft: Wirkung erst mit Produktdaten (z. B. von nurec).
- Echte SMS über Firebase: Die Handynummer geht für die einmalige Registrierung an Google (USA). Teamentscheid 15.10.: in Ordnung; im Einwilligungstext der Studie erwähnen (Frage F4). Kosten pro SMS über den Blaze-Tarif. Für Testpersonen ohne eigenes Handy `?sms=sim`.
- Stufe 3 und 4 (82 konkrete Lebensmittel in den Blöcken 3.1 bis 3.7 und 18 Gerichte) sind Team-Ergänzungen [V] nach den Beispielen im Konzept: Auswahl, Titel und Tags mit nurec prüfen. Die Gerichte der Nährwertdatenbank sind weiterhin nicht in der Suche.
- Gerichte als freiwillige Runde ausserhalb der vier Runden: mit dem Dozenten klären, ob das so in Ordnung ist.
- Fotos für konkrete Lebensmittel: 26 nutzen ein vorhandenes Foto, das genau sie zeigt (z. B. Lachs, Erdbeeren); die übrigen und alle Gerichte zeigen die Illustration ihrer Gruppe bzw. einen Teller. Eigene Fotos nachliefern.
- Profilstand: Gewichte 35/30/35 sind ein Entwurf von nurec, `stage3Target` (12) ist eine Annahme; im Pilot prüfen.
- Alltagsprofil und Marken wirken erst mit Produkt- und Rezeptdaten; die fehlenden Küchengeräte werden als feste Grenze gespeichert (z. B. kein Ofen).
- Soll die Registrierung in der Nutzerstudie aktiv sein? Sie kostet Zeit vor dem Swipen (auswertbar über `AUTH_STARTED`/`AUTH_COMPLETED`). Abschaltbar mit `AUTH_ENABLED = false`.
- Dürfen Testpersonen ihr Profil während der Studie bearbeiten? Jede Änderung ist im Log nachvollziehbar, verändert aber das angezeigte Profil.
- Synonyme: unsichere Begriffe in `synonymTodos` (z. B. „Baumnuss“ für Walnuss vs. Kartentitel „Baumnüsse“, Peperoni in Deutschland).
- Glutenfreie Varianten: Früher hiess es „Nur glutenfrei“, mit Tags entfällt die Familie Brot bei „Alles mit Gluten“ ganz.
- Werden die neuen Begriffe im Pilot verstanden?
- Standardwert für das Kartenlimit (heute 10 Karten je Runde; Runde 1 zeigt 10 von 13 Gruppen, Runde 2 beginnt mit den übrigen 3).
- Wird „Vertrage ich nicht“ übersehen oder mit „Mag ich nicht“ verwechselt? Im Pilot über `inputMethod = link` und Rückgängig-Ereignisse auswertbar.
- Tutorial: seit dem 13.10. aus. Ein Pilot-Vergleich ist mit `TUTORIAL_ENABLED = true` möglich (nicht über die URL).
- Zusammenfassung vor dem ersten Swipe: am 13.10. entfernt, am 14.10. in kurzer Form wieder eingebaut, weil nurec v0.2, Kap. 2.2 [D] sie verlangt („Die Person bestätigt oder korrigiert jede Regel.“). Mit dem Team bestätigen. Wie lange sie dauert, zeigt das Protokoll (Bildschirmwechsel, `stage0_edit`, `stage0_confirm`).
- Gespeicherter Stand auf dem Testgerät („Willkommen zurück“): Ins Testprotokoll gehört, dass die Testleitung nach jeder Person „Neue Testperson starten“ drückt. Gehört zu Frage F4.
- „Aus dem Profil entfernen“: Die Karte zählt für die Runde weiter als beantwortet. Für die Auswertung vertretbar, im Bericht erwähnen.
- Marken und Händler: Die Liste in `src/data/brands.json` ist eine Auswahl, keine vollständige Liste; mit nurec abgleichen.
- Kacheln: Die Auswahl der 8 häufigen Allergene ist eine Annahme, keine Häufigkeitsangabe.
- Frage F4: Einwilligung und Speicherung von Gesundheitsdaten im Test.
- Ansprache mit Du oder Sie, Wischschwellen.
- Bildlizenzen: alle 46 Fotos unter der Unsplash License (keine Unsplash+-Bilder, Stand 14.10.2026); Nachweise mit APA 7 in `src/data/image-credits.json`. Vor der Abgabe Namen und Titel prüfen (z. B. „David Foodphototasty“ ist ein Künstlername) und klären, ob nurec für eine spätere Nutzung eigene Fotos braucht.
- Fotos oder Illustrationen (`IMAGE_STYLE`): mit Tibor abstimmen oder im Pilot vergleichen. Ob die Fotos die Bewertung beeinflussen (Annahme 5), im Pilot beobachten; die Fotos stammen von vielen Fotografen und sind nicht alle im gleichen Licht.
- Fotos fehlen für **Vollkornpasta** und **Pasta aus Hülsenfrüchten**: In den gespeicherten Unsplash-Suchen gab es kein passendes freies Foto (die Live-Suche ist durch eine Bot-Sperre blockiert). Die Karten zeigen die Pasta-Illustration; das Bildraster „Pasta“ zeigt drei Weizenpasten. Nachliefern, z. B. mit einem eigenen Foto oder einem Unsplash- bzw. Pexels-Zugang.
- Adaptive Auswahl und Präferenzmodell (Version 0.7): Rangfolge der Regeln, Annahmen (−1/+1/+2, Faktor 0.5, ohne Geschwister) und Kriterium „aussagekräftig“ im Team bestätigen, im Pilot prüfen und vor der Hauptstudie festschreiben (Messkonzept, Abschnitte 5 und 6).
- Eigenleistung: Auswahl, Modell und Auswertung wurden mit Claude Code umgesetzt. Mit Tibor klären, wie das deklariert wird.
- Kontrollkarten am Ende der letzten Runde: Wer vorher aufhört, liefert keine. In der Studie deshalb bis zum Abschluss der letzten Runde führen (die Ansicht für die Testleitung zeigt den Stand).
- Gerichte (Stufe 4): Die Kontrollkarten und die Lernkurve decken nur Lebensmittel ab, nicht Gerichte (Gerichte werden nie vermutet).
- Rückmeldung Team (12.10.) statt A7: Eingetippte Notizen blenden das Wort als Beispiel aus, schliessen aber keine Gruppe aus. Bestätigen, dass das so bleiben soll.

## Abgleich mit nurec v0.2

| Kapitel | Anforderung | Umsetzung |
| --- | --- | --- |
| 1 | Leitregel: Swipe hebt keine harte Regel auf, DISLIKE ist kein Ausschluss | `isAllowed` vor jeder Auswahl; DISLIKE nur Geschmack |
| 2, 2.1 | Pflichtfragen 0.1 bis 0.6, Folgefragen nur bei „vorhanden“ | drei Fragen, Details nur bei „Ja“; Quelle (ärztlich), Geltungsbereich (Laktose), religiöse Regel (kein Schweinefleisch), Marken und Händler zugeordnet. Abweichung: „unsicher“ als Kästchen statt dritter Antwort (Teamentscheid) |
| 2.1 | Allergen-Auswahlliste, frei benennbare Lebensmittel | 14 Hauptallergene, Suche über rund 560 Lebensmittel der Nährwertdatenbank, Notiz mit Status „prüfen“ |
| 2.2 | Zusammenfassung vor Stufe 1, jede Regel bestätigen oder korrigieren; offen bleibt offen; Speicherung von Typ, ID, Geltungsbereich, Quelle, Prüfstatus, Datum; REJECT vor jedem Score, auch für Produkte | „Stimmt das so?“ mit „Ändern“; Regeln mit `medical`, `scope`, `status`; Filter auch über Zutaten von Produkten und Gerichten |
| 2.3 | Freiwilliges Alltagsprofil nach den Runden, ausgelassen = unbekannt, nicht im Prozentwert | Bildschirm „Alltag“, sechs Bereiche, überspringbar, `PRACTICAL_SAVED` |
| 3 | Ablauf: Familien → Antwort → kurze Runde → Untergruppen freiwillig → konkrete Lebensmittel und optional Gerichte → getrennt speichern | Runden mit Abschluss, Stufe 2 und 3 adaptiv, Gerichte als freiwillige Runde |
| 4 | Drei Wischrichtungen, „Kenne ich nicht“ als Knopf, kein „Ist okay“, kein Überspringen; UNRATED ≠ UNFAMILIAR | umgesetzt; dazu „Vertrage ich nicht“ als Link (Addendum A4); Wortlaut von LIKE im Pilot prüfen |
| 5 | Vier Stufen mit Haltepunkten, nach jeder Runde aufhören können; Stufe 4 nach Stufe 2 | Stufe 0 bis 4; „Runde beenden“ und Abschluss nach jeder Runde; Gerichte erst nach Stufe 2 oder am Ende |
| 6 | Auswahl: Familien abdecken, eine Ausnahme bei DISLIKE, Unterschiede bei LIKE/PREFER, nach UNFAMILIAR sofort ein Kind und höchstens ein zweites; Zusatzkarten zählen zum Limit; protokollieren von ID, Stufe, Grund, Regelversion, Antwort, Abbruch; stoppen ohne neue Information | `selection.js` (siehe „Kartenauswahl“); `selectionReason`, `ruleVersion`, `QUESTION_ABORTED` |
| 7 | Familie gibt nur vorsichtige Hinweise, explizite Antworten zählen stärker; abgeleitete Präferenz mit Quelle; Produkte und Gerichte nicht auf Zutaten übertragen | `preferences.js`, Vermutungen mit Begründung, keine Vermutung für Produkte und Gerichte |
| 8 | Datenmodell: Constraint, PurchasePreference, PreferenceResponse, DerivedPreference, QuestionEvent, PreferenceEntity | Ausschlüsse mit Zusätzen, Marken und Alltagsprofil, ANSWER-Ereignisse, `predicted`, Protokoll mit `alternatives`, `kind` je Karte |
| 9 | Beispiel eines adaptiven Durchlaufs (vegan, Hülsenfrüchte DISLIKE → Sojaprodukte → Naturtofu, Hummus) | als Test nachgespielt (`selection.test.js`) |
| 10 | Im Pilot messen: Dauer und Abbrüche pro Runde, „Kenne ich nicht“, erkannte Nachfrage, redundante Karten, neue und widersprüchliche Hinweise | `npm run auswertung` (Pilot-Kennzahlen) und Messkonzept |
| 11 | Beispiele für Anschlussfragen | alle sechs als Regeln umgesetzt und getestet |
| A1, A2 | Kartenkatalog Stufe 1 und 2 | unverändert übernommen |
| A3 | Stufe 3 in Teilblöcken 3.1 bis 3.7, höchstens 30 je Block | 96 Karten, Test prüft die Obergrenze |
| B1 | Dashboard nach Stufe 1, nach jeder Runde aktualisiert: Vorlieben, eher ungern, nie vorschlagen, Feinheiten, offen, nächste Runde, Alltag, Gerichte | „Mein Profil“ und Abschluss |
| B2 | „Profil aufgebaut“ als Erfassungsgrad 35/30/35, steigt nur nach informativen Antworten | `profileProgress`, klar beschriftet |
| B3 | Bestätigte Top-Favoriten nur aus direkten Antworten zu konkreten Lebensmitteln; mögliche Favoriten getrennt und unbestätigt | „Deine Favoriten“ und „Das vermutet die App“ |

## Quelle

Kartenkatalog Stufe 1 und 2, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
Allergene: Verordnung des EDI betreffend die Information über Lebensmittel (LIV), Anhang 6; Verordnung (EU) Nr. 1169/2011 (LMIV), Anhang II.
Lebensmittelliste der Suche: Schweizer Nährwertdatenbank, Generische Lebensmittel V 7.1 (01.07.2026), Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), https://naehrwertdaten.ch (frei verwendbar mit Quellenvermerk; der Vermerk steht auch in „Mein Profil“ unter „Bildnachweise und Quellen“).
