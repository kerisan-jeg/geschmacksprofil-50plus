# Geschmacksprofil 50+ · Prototyp

Mobiler Swipe-Prototyp zur Geschmacksprofilerkennung bei Personen ab 50 (WI-Projekt, Auftraggeber nurec).
Version 0.8: vollständig nach dem nurec-Konzept v0.2 (Abgleich Kapitel für Kapitel unten unter „Abgleich mit nurec v0.2“). Stufe 0 bis 4 mit konkreten Lebensmitteln (Anhang A3) und Gerichten, Auswahlregeln nach Kap. 6 und 11, Ergebnis-Dashboard mit Profilstand (Anhang B), freiwilliges Alltagsprofil (Kap. 2.3), Kontrollkarten und Auswertung der Lernkurve mit Pilot-Kennzahlen (Messkonzept in [`docs/messkonzept.md`](docs/messkonzept.md)). Dazu wie bisher Designsystem, Swipe-Oberfläche, Registrierung mit SMS-Code (echt über Firebase oder simuliert) und einheitliche Suche über alle Lebensmittel.

**Version 0.9 (Dozentenfeedback vom 19.10.2026):** Frage 1 in drei Teilen (Ernährungsform, Einzelausschlüsse, Speisevorschriften ohne eigene Wirkung), Hinweise wie „Ohne Rindfleisch“ nur, wo der Kartenname es noch umfasst, eigene Begriffe in Runde 1 („Eher ungern / Eher gern / Sehr gern“, `?r1scale=2` ohne „Sehr gern“), Gruppenkarten ohne Beispiele und Fotos mit neutralem Symbol, Rundenanzeige, kein Scrollen in der Runde, negative Gruppe ohne endgültigen Ausschluss, Esskulturen als Metadatum mit vier Zusatzgerichten, Rundenübersicht mit „Runde fortsetzen“ und Navigationsereignissen. Alle Entscheidungen, Annahmen und offenen Punkte: [`docs/dozentenfeedback-2026-10-19.md`](docs/dozentenfeedback-2026-10-19.md). Wo dieses README Version 0.8 beschreibt und die Doku zum Dozentenfeedback etwas anderes sagt, gilt die Doku.

**Version 0.10 (Teamentscheide vom 28.10.2026):** Anmeldung nur mit dem Vornamen (keine Handynummer, kein SMS-Code, kein Firebase; der Vorname steht als `participantName` in Sitzung und Export, damit die Testleitung die Antworten zuordnen kann), Einwilligung als Kästchen mit kleinem Text unter den Altersfeldern, Speisevorschriften in Frage 1 zugeklappt, Frage 2 ohne „nicht sicher“, „ärztlich festgestellt“ und „kleine Mengen gehen“, Frage 3 ohne Marken und Herkunft, Alltagsprofil entfernt, Runde 4 ohne Kartenlimit mit nur passenden Gerichten (nach zehn Gerichten „Runde beenden“), neue Fotos für Egli, Chili con Carne, Mehrkornknäcke und Kerne und Samen. Regelversion `demo-0.7`. Kurzfassung und Begründung: [`docs/10_Zusammenfassung_Team.md`](docs/10_Zusammenfassung_Team.md).

**Version 0.11 (29.10.2026):** Runde 4 ohne Geschmacksfilter (alle erlaubten Gerichte, nach Zutaten-Zuneigung sortiert, „Runde beenden“ von der ersten Karte an), Katalog von 22 auf 64 Gerichte erweitert (42 neue mit Unsplash-Fotos, darunter viele ohne Milch und Gluten; neue Küchen griechisch, spanisch, orientalisch, indisch, japanisch, amerikanisch). Regelversion `demo-0.8`.

**Korrektur vom 29.10.2026, Regelversion `demo-0.9`:** Auch Runde 4 hat wieder dasselbe Kartenlimit wie die Vorrunden: standardmässig 13 Gerichte, höchstens 15. Aus dem gesamten Katalog werden nach Ausschlüssen die Gerichte mit der höchsten Zutatenaffinität aus den Antworten der Runden 1 bis 3 ausgewählt. Konkrete Bewertungen haben Vorrang vor Untergruppen und Gruppen. Die Runde endet beim Limit oder wenn keine erlaubten Gerichte mehr übrig sind; die Nachfrage nach zehn Gerichten entfällt.

Hinweis zur Eigenleistung: Auswahl, Modell, Dashboard, Stufe 3 und 4, Alltagsprofil (am 28.10.2026 wieder entfernt) und Auswertung hat Claude Code (KI) im Auftrag des Teams umgesetzt (15.10.2026; die Änderungen vom 28.10.2026 ebenso), auf Grundlage einer Rückmeldung zum Vorgehen und des nurec-Konzepts. Die Regeln folgen nurec v0.2 [D]; Rangfolge, Annahmen und Kriterium sind Vorschläge [V], die das Team bestätigt oder ändert. Wie die KI-Unterstützung in der Arbeit deklariert wird, mit Tibor klären.

Quellenlabels in diesem Dokument: [A] Aufgabenstellung, [K] Aussagen von Tibor (Kickoff, Zwischencheck),
[D] bereitgestellte Dokumente (nurec-Konzept), [V] eigene Entscheidung des Teams.

## Ablauf

Die App hat zwei Bereiche: **Profil erstellen** und **Mein Profil**. Die untere Leiste dafür erscheint erst ab dem Abschluss der ersten Runde und in „Mein Profil“ (Rückmeldung Team, 14.10.): Während Registrierung, Fragen, Zusammenfassung und beim Wischen gibt es nur einen Weg nach vorn. „Mein Profil“ ist immer über den runden Knopf oben rechts erreichbar (Initiale des Vornamens).

1. **Willkommen:** kurze Einführung.
2. **Anmeldung** (`AUTH_ENABLED`, Standard an): nur der Vorname. Keine Handynummer, kein SMS-Code (seit dem 28.10.2026); siehe unten.
3. **Über dich:** Alter und Einwilligung (Kästchen mit kleinem Text unter den Altersfeldern) sind Pflicht, unter „Für die Testleitung“ die Teilnehmer-Nr. Ohne Anmeldung startet die App hier, der Vorname ist dann freiwillig.
4. **Fragebogen (Stufe 0):** drei Fragen, eine pro Bildschirm, Details nur bei „Ja“. Frage 2 bietet „Ja“ und „Keine bekannt“, Frage 3 fragt nach „etwas Weiterem“. Seit dem 28.10.2026 sind die Speisevorschriften in Frage 1 zugeklappt (erst öffnen, dann Halal oder Koscher wählen); Frage 2 und 3 kommen ohne Zusatzangaben („nicht sicher“, „ärztlich festgestellt“, „kleine Mengen gehen“, Marken, Herkunft).
5. **Zusammenfassung** (nurec v0.2, Kap. 2.2 [D]): „Stimmt das so?“ zeigt alle festen Regeln, je Frage ein Abschnitt (Ernährungsweise, Allergien und Unverträglichkeiten, „Möchte ich nicht essen“). „Ändern“ öffnet direkt die passende Frage und führt danach zurück; „Stimmt so“ bestätigt. Bewusst kurz, ohne Vorschau der Karten.
6. **Runde 1 – Lebensmittelgruppen:** nach „Stimmt so“ direkt die erste Karte. Standardmässig bis zu 13 Karten, damit alle 13 zulässigen Gruppen Platz haben; ausgeschlossene Gruppen entfallen. Vorher zieht die App die Kontrollkarten.
7. **Abschluss:** kurze Übersicht (Anzahl je Antwort, Anzahl fester Regeln), Ausblick auf die nächsten Karten, „Weiter mit Runde 2“ und „Mein Profil ansehen“.
8. **Runde 2 – Untergruppen, Runde 3 – konkrete Lebensmittel:** Die Auswahl vertieft auf jeder Runde eine Ebene. Ausnahmen, Kontraste und Favoriten bestimmen die Priorität. Auch bei gleichen positiven Untergruppenantworten werden in Runde 3 einzelne Lebensmittel geprüft; höchstens zwei pro positiver Untergruppe, bei „Mag ich sehr“ drei. Unbekanntes bekommt höchstens zwei Klärungskarten auf der nächsten Ebene. Die Kontrollkarten schliessen Runde 2 ab. Pro Runde sind standardmässig höchstens 13 und absolut nie mehr als 15 Karten möglich. Es gibt keine Füllkarten; leere Ebenen werden übersprungen.
9. **Runde 4 – Gerichte:** standardmässig die 13 passendsten zulässigen Gerichte (z. B. Pizza Margherita, Rösti mit Spiegelei), ausgewählt und sortiert nach den Zutatenbewertungen aus Runde 1 bis 3. Konkrete Bewertungen haben Vorrang vor Untergruppen und Gruppen. Harte Ausschlüsse wirken vor der Auswahl; bleiben weniger erlaubte Gerichte, wird die Runde kürzer. Sie endet automatisch beim Kartenlimit; „Runde beenden“ ist jederzeit möglich. Antworten bleiben eigenständige Gerichtsbewertungen und verändern keine Zutatenbewertung. Nach Runde 4 geht es zum Profil; es gibt keine zusätzliche Gerichte-Runde und keinen Knopf „Gerichte bewerten“. Die Zuordnung Runde = Ebene folgt der gezeigten Ablaufgrafik des Dozenten und der Teamvorgabe vom 18.10.2026; die kurzen Haltepunkte und getrennte Speicherung folgen nurec Kap. 3, 5 und 7.
10. **Mein Profil:** Dashboard nach nurec Anhang B (siehe unten). Das freiwillige Alltagsprofil (nurec Kap. 2.3) ist seit dem 28.10.2026 entfernt.

Das **Mini-Tutorial** (drei kurze Schritte: Wischrichtungen, „Kenne ich nicht“ und „Vertrage ich nicht“, Rückgängig) ist im Code, aber standardmässig aus. Für einen Pilot-Vergleich `TUTORIAL_ENABLED = true` in `src/config.js` setzen; über die URL lässt es sich nicht einschalten.

Wer die App auf demselben Gerät wieder öffnet, sieht „Willkommen zurück, [Vorname]“ und macht dort weiter, wo er oder sie war. Auch ein versehentliches Neuladen verliert nichts mehr. Auf einem gemeinsamen Testgerät deshalb nach jeder Person „Neue Testperson starten“ drücken (Ansicht für die Testleitung, siehe unten).

## Antworten auf einer Karte

| Geste | Sichtbar | Intern | Bedeutung |
| --- | --- | --- | --- |
| Links | Mag ich nicht (Runde 1: Eher ungern) | `DISLIKE` | Geschmack, kein Ausschluss |
| Rechts | Mag ich (Runde 1: Eher gern) | `LIKE` | Geschmack |
| Oben | Mag ich sehr (Runde 1: Sehr gern; entfällt mit `?r1scale=2`) | `PREFER` | Geschmack (im Kickoff „Superlike“) |
| Knopf | Kenne ich nicht | `UNFAMILIAR` | keine Bewertung |
| Textlink | Vertrage ich nicht | `INTOLERANT` | harter Ausschluss, kein Geschmack |
| Knopf | Rückgängig | `UNDO` | nimmt die letzte Antwort zurück |

Begründung [V]: symmetrisch, kurz und nah an Dislike/Like/Superlike [K]. „Eher ungern“ war beim Zwischencheck unklar [K]. Seit 0.9 schlägt der Dozent „Eher ungern / Eher gern / Sehr gern“ selbst für Runde 1 (Gruppen) vor [K]; Runden 2 bis 4 behalten diese Begriffe.
Alle Beschriftungen stehen in `src/labels.js`; ein Test verhindert, dass sie hart im JSX auftauchen.
Die Bedeutung jeder Antwort (Geschmackssignal ja/nein, harter Ausschluss, zählt fürs Limit) ist in `src/logic/answers.js` dokumentiert.

**„Vertrage ich nicht“** [V] ist bewusst nur ein dezenter Textlink unter den Knöpfen: keine fünfte Wischrichtung, kein gleichwertiger Knopf, Tippfläche trotzdem ≥ 44 × 44 px. Er trennt Verträglichkeit auch beim Wischen vom Geschmack [K] und steht in allen vier Runden zur Verfügung. Auf Familienkarten (z. B. Nüsse und Samen) öffnet er dieselbe Detailauswahl wie im Onboarding, damit nicht wegen Haselnüssen alle Nüsse wegfallen. Danach erscheint „Wir schlagen dir … nicht mehr vor.“ mit Rückgängig.

**Rückgängig** [V] erscheint, sobald eine Karte beantwortet ist. Technisch ist das Event-Log die einzige Quelle der Wahrheit: Der Zustand wird immer aus den Ereignissen abgeleitet (`replay`), UNDO ist ein eigenes Ereignis. So laufen Oberfläche, Profil und Protokoll nie auseinander.

**Wischen** (reine Logik in `src/logic/swipe.js`, Werte in `SWIPE` in `src/config.js`): Beim Ziehen erscheint auf der Karte die Beschriftung der angedeuteten Antwort mit Symbol; ihre Deckkraft wächst mit der Zugdistanz. Eine Antwort zählt erst ab der Schwelle (110 px seitlich, 90 px nach oben) oder bei schnellem Schnippen; darunter springt die Karte zurück. Die nächste Karte liegt leicht dahinter und rückt beim Ziehen nach vorn. Jede Richtung hat einen gleichwertigen Knopf an der Stelle, wohin die Karte fliegt (Wischen nach oben ist für viele schwierig).

**Fortschritt:** Ein Segment pro Karte, etwa „Karte 3 von 13“, je Runde. Anzahl und Prozentwert kommen aus `progress()`, nie fest aus der Oberfläche. Die Abschnitte zeigen Fragen, aktuelle Runde und Profil. Rückgängig wirkt nur in der laufenden Runde.

## Anmeldung (nur Vorname)

Seit dem 28.10.2026 (Teamentscheid) fragt die Anmeldung nur den Vornamen; Handynummer, SMS-Code und Firebase sind entfernt.

- **Ablauf:** Willkommen → Vorname (Pflicht, ein Feld mit `autocomplete="given-name"`) → „Über dich“. Unter dem Feld steht, dass der Vorname auf dem Gerät bleibt, die Testleitung ihn sieht und keine Handynummer nötig ist.
- **Zweck:** Die Testleitung kann die Antworten einer Person zuordnen. Der Vorname steht als `participantName` in der Sitzung, in der Admin-Ansicht neben der Teilnehmer-Nr. und im JSON- und CSV-Export (Spalte `participantName`). Mit `PRIVACY.logParticipantName = false` in `src/config.js` bleibt er nur im Konto auf dem Gerät (`localStorage`, Schlüssel `geschmacksprofil:account`); ein Test prüft beides (`src/logging/privacy.test.js`).
- **Abmelden** im Profil löscht Konto und Stand auf dem Gerät; die Sitzung für die Auswertung bleibt. „Neue Testperson starten“ in der Admin-Ansicht meldet die vorherige Person ebenfalls ab.
- **Protokoll:** `AUTH_STARTED` (Vorname eingeben) und `AUTH_COMPLETED` (`method: "name"`) stehen im Event-Log; so lässt sich die Dauer der Anmeldung getrennt von der Swipe-Dauer auswerten. Sitzungen vor 0.10 tragen `method: "sms"` oder `"sms-simulated"`.
- **Ohne Anmeldung:** `AUTH_ENABLED = false` in `src/config.js`.
- **Gespeicherte Stände** älterer Versionen (Handynummer, SMS-Code, Alltag) laufen beim nächsten Öffnen an der nächsten sinnvollen Stelle weiter.

## Mein Profil (Dashboard, nurec Anhang B)

**Optimierung vom 24.10.2026:** „Mein Profil“ zeigt zuerst die Anzahl aktueller Antworten und vier proportionale Balken mit Zählern. Die Kategorien „Mag ich sehr“, „Mag ich“, „Mag ich nicht“ und „Kenne ich nicht“ lassen sich unabhängig aufklappen; alle Listen starten geschlossen. Gruppen, einzelne Lebensmittel und Gerichte sind in den Listen gekennzeichnet. „Weitere Einblicke“ und Ausschlüsse sind ebenfalls aufklappbar. Details und Prüfhinweise: [`docs/allergieauswahl-dashboard.md`](docs/allergieauswahl-dashboard.md).

- **Dein Fortschritt:** Der Balken zeigt den Ablauf der vier Swipe-Runden, jede Runde zählt ein Viertel. Nach den Runden stehen 25 %, 50 %, 75 % und 100 %; innerhalb einer Runde wächst er mit den beantworteten Karten. Auch „Kenne ich nicht“ und „Vertrage ich nicht“ zählen als Antworten. Massgebend sind das Sitzungslimit und die tatsächlich erlaubten Karten; leere Runden werden wie im Ablauf übersprungen. Das vorzeitige Beenden einer offenen letzten Runde ergibt noch keine 100 %. Anzeige nach jeder Runde und unter „Mein Profil“, berechnet mit `creationProgress(state, config)` in `src/logic/engine.js`. Der analytische Erfassungsgrad nach Anhang B2 (`profileProgress`, 35/30/35) bleibt separat erhalten.
- **Dein Geschmack:** vier getrennte Antwortkategorien mit Anzahl und aufklappbarer Liste. „Mag ich sehr“ bleibt eine eigene Kategorie. Jede Karte zählt einmal anhand ihrer letzten direkten Antwort, auch nach einer Profiländerung. Gruppenbewertungen übertragen sich nicht auf einzelne Lebensmittel. Bei negativen Gruppen bleiben positiv bewertete Ausnahmen erkennbar.
- **Das vermutet die App** (B3.2, getrennt und gestrichelt): mögliche Favoriten und Vermutungen mit Begründung, stärkste zuerst, „Alle anzeigen“ bei langen Listen. Tippen öffnet die Bewertung: Die eigene Antwort ersetzt die Vermutung (`RATING_CHANGED` mit `fromPrediction: true` und `predictedScore`). Kontrollkarten erscheinen erst nach ihrer Antwort.
- **Noch offen:** „Kenne ich nicht“ enthält auch unbekannte Gerichte und bleibt getrennt von „Noch nicht gefragt“ unter „Weitere Einblicke“ (beides ist keine Geschmacksbewertung).
- **Feinheiten:** roh gegenüber gegart (z. B. Rohe Rüebli: Mag ich nicht · Gekochte Rüebli: Mag ich), nur wenn beides beantwortet ist und sich unterscheidet.
- **Gerichte** (Runde 4) sind in den Antwortlisten als Gericht gekennzeichnet; die Tendenz nach Küche steht unter „Weitere Einblicke“. Nach ihrem Abschluss wird keine weitere Gerichte-Runde angeboten.
- **Ausschlüsse** (Nie vorschlagen), getrennt vom Geschmack: Allergien, Ernährungsweise, „Vertrage ich nicht“, „Möchte ich nicht essen“, Notizen. Bei jedem Eintrag die Herkunft (im Onboarding, beim Wischen, im Profil) und der Zusatz „prüfen“ (eingetippt, nicht eindeutig zugeordnet); „ärztlich vorgegeben“ und „kleine Mengen gehen“ gibt es seit dem 28.10.2026 nicht mehr.
- **Bearbeiten:** Bewertung über ein Segmented Control mit den drei Bewertungen und „Aus dem Profil entfernen“; Allergien mit derselben Komponente wie im Onboarding; Ernährungsweise; „Vertrage ich nicht“ und „Möchte ich nicht essen“ über die Suche. Allergien und Unverträglichkeiten werden nur nach einer Bestätigung entfernt.
- **Event-Log:** Jede Änderung ist ein Ereignis (`RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED`, `PRACTICAL_SAVED`). Der Zustand wird per Replay abgeleitet; die ursprüngliche Antwort beim Wischen bleibt unverändert im Log.

## Einheitliche Suche (FoodSearch)

- **Allergieauswahl:** genau sechs feste Vorschläge (Gluten, Laktose, Milcheiweiss, Nüsse inklusive Erdnüsse, Eier und Soja), ohne Erweiterungsknopf. Weitere Allergene, z. B. Fisch, erscheinen ausschliesslich in der Suche und als entfernbare Auswahlchips. Bereits durch die Ernährungsform abgedeckte Vorschläge bleiben deaktiviert sichtbar. Die Auswahl ist eine Projektentscheidung, keine Häufigkeitsrangliste.
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
- **Bilder (Addendum A15, 21.10.2026):** Jede Karte zeigt oben ein Bild aus `public/cards/{cardId}.webp` (4:3, höchstens 1200 px, höchstens 150 KB), darunter den Namen als Text. Das Bild steht im Katalog als `image` (`src`, deutscher `alt`, `source` `ai-gemini` | `stock` | `own`, Lizenz und Nachweis). Gruppen zeigen seit dem 21.10.2026 wieder Fotos (je drei Beispiele, bei Ausschlüssen nur die erlaubten); der neutrale Teller aus dem Dozentenfeedback bleibt mit `GROUP_IMAGES = false` verfügbar. Alle 167 Karten haben ein Unsplash-Foto (Addendum A16 und Nachtrag, Nachweise mit Fotograf, Link und APA 7 in `src/data/image-credits.json`); wo ein Foto nicht genau die Karte zeigt, nennt ein TODO die Abweichung. Lädt ein Bild nicht, erscheint ein neutraler Platzhalter (Kartenfarbe und Name). Die Gemini-Prompts in `src/data/card-image-prompts.json` werden nicht mehr benötigt. **Bilder zeigen nie Ausgeschlossenes:** Jedes Bild nennt, was zu sehen ist (`shows`, `foods`); ist davon etwas ausgeschlossen, erscheint der Platzhalter (`isImageAllowed` in `src/lib/images.js`). Die nächsten zwei Karten werden vorgeladen; die Antwortzeit beginnt erst, wenn Bild oder Platzhalter sichtbar ist, und jede Antwort protokolliert `imageShown` und `imageSource`. Mit `IMAGE_STYLE = 'illustration'` zeigen alle Karten die eigenen Illustrationen (Pilotvergleich, Annahme 5). Details: [`docs/bilder-a15.md`](docs/bilder-a15.md) und [`docs/bilder-a16.md`](docs/bilder-a16.md); Prüfseite für das Team (nur lokal): `docs/bilder-review.html`.
- **Zustände:** Laden (Bild pulsiert ruhig, bis das Foto da ist), Leer (z. B. „Mein Profil“ vor der ersten Antwort, keine Karten nach den Angaben, keine Sitzungen), Fehler (Fehlergrenze mit „Neu laden“ für jeden Bildschirm, Hinweis bei gesperrtem Speicher, Platzhalter bei fehlendem Bild).
- **App-Gefühl:** sichere Zonen (`env(safe-area-inset-*)`), fester Aktionsbereich unten, untere Navigation ab Runde 1, sanfte Seitenübergänge. `prefers-reduced-motion` setzt alle Dauern auf 0.
- **PWA:** `public/manifest.webmanifest` mit `display: standalone`, App-Icons (rund und maskable) und `theme-color`: Vom Homescreen startet die App im Vollbild.
- **Texte:** alles in `src/labels.js`, Du-Form, Schweizer Rechtschreibung. `src/labels.test.js` prüft am Syntaxbaum, dass in keiner Komponente Text hart steht.

## Stufe 0: harte Ausschlüsse

Grundlage ist nurec v0.2, Kap. 2 [D]. Die Bereiche 0.1 bis 0.6 sind als drei Fragen umgesetzt [V].

| Frage | Bereiche | Umsetzung |
| --- | --- | --- |
| Feste Ernährungsweise | 0.4 | Tabelle `diets` in `stage0.json`: kein Schweinefleisch (religiöse Regel, auch keine Gelatine), kein Fisch, pescetarisch, vegetarisch, vegan schliessen Tags aus `animalOrigin` aus (vegetarisch und vegan auch Gelatine, vegan auch Honig) |
| Allergien und Unverträglichkeiten | 0.1 bis 0.3 | 14 Hauptallergene (LIV Anhang 6, LMIV Anhang II) in `allergens.json`; 8 als Kacheln, der Rest über „Weitere anzeigen“ und Suche; 0.2 („ärztlich festgestellt“) und 0.3 („kleine Mengen“) seit dem 28.10.2026 nicht mehr abgefragt, Laktose ist immer ein voller Ausschluss |
| Nie vorschlagen | 0.5, 0.6 | Schnellauswahl (inkl. Alkohol), Suche über alle Lebensmittel, Eintragen ohne Treffer (Marken und Herkunft seit dem 28.10.2026 entfernt) |

- Milch ist getrennt in **Laktose (Unverträglichkeit)** und **Milcheiweiss (Allergie)**.
- **„Kleine Mengen gehen“** wird seit dem 28.10.2026 nicht mehr abgefragt; Laktose ist immer ein voller Ausschluss (nurec 0.3: „eine variable Mengengrenze nicht ohne belastbare Angabe als sichere Freigabe verwenden“).
- **Erdnüsse** stehen seit der Rückmeldung vom 12.10. unter **Nüsse** (ersetzt A5). Sie behalten die eigene ID `peanut`; „Alle Nüsse (inkl. Erdnüsse)“ wählt sie mit aus.
- **Nüsse** und **Gluten** öffnen eine Unterauswahl mit „Alle Nüsse (inkl. Erdnüsse)“ bzw. „Alles mit Gluten (z. B. Zöliakie)“.
- **„Ich bin mir nicht sicher, ob es weitere gibt“** ist seit dem 28.10.2026 entfernt (Teamentscheid; vorher nur ein Flag ohne Wirkung). Abweichung von nurec Kap. 2 (dort „vorhanden / keine bekannt / unsicher“ je Kategorie): Frage 2 bietet „Ja“ und „Keine bekannt“.
- **Eintragen ohne Treffer:** Was man eintippt, wird eingetragen (`type: "food"`, Status „prüfen“). Keine Gruppe fällt weg, aber das Wort erscheint nirgends mehr als Beispiel, und konkrete Lebensmittel und Gerichte mit diesem Namen oder dieser Zutat fallen weg (z. B. „Tomate“ → „Rohe Tomaten“, Pizza Margherita).
- **Marken und Händler** (0.6) sowie Herkunft: seit dem 28.10.2026 entfernt (Teamentscheid; ohne Produktdaten wirkten sie nicht auf die Karten).
- **Nichts doppelt:** Was frühere Angaben schon ausschliessen, wird nicht nochmals angeboten.
- **Gespeichert je Regel** (Kap. 2.2): Typ, ID, Herkunft (`source`, `origin`), Prüfstatus (`status: "check"` bei Notizen) und der Zeitpunkt über das Ereignis im Log.
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
| `?limit=12` | Karten pro Runde, einschliesslich Runde 4 (`ROUND_CARD_LIMIT`), gültig 4 bis 15; ungültige Werte fallen auf den Standard zurück | 13 |
| `?admin=1` | Ansicht für die Testleitung | – |
| `?selection=fixed` | feste Reihenfolge wie in Version 0.6 statt adaptiver Auswahl (Vergleich im Pilot) | adaptiv |
| `?holdout=4` | Anzahl Kontrollkarten, gültig 0 bis 10 (0 = keine) | 6 |
| `?r1scale=2` | Begriffe in Runde 1: 3 (Eher ungern / Eher gern / Sehr gern) oder 2 (ohne „Sehr gern“ und ohne Wischen nach oben) | 3 |

Kombinierbar, z. B. `?limit=6&admin=1`. Die effektiven Werte werden in jeder Sitzung gespeichert. Ungültige Werte fallen auf den Standard zurück, stehen aber als `ignoredParams` in der Sitzung und rot in der Admin-Ansicht. Begründung [V]: Kernfrage 2 [A] lässt sich so ohne neuen Build vergleichen. `?tutorial` wirkt seit dem 13.10. nicht mehr. Die Standardwerte stehen als `ROUND_CARD_LIMIT`, `MAX_ROUNDS`, `SELECTION_MODE`, `HOLDOUT_CARDS`, `PREFERENCE_MODEL`, `TUTORIAL_ENABLED` (aus), `IMAGE_STYLE` (Fotos) und `AUTH_ENABLED` (an) in `src/config.js`. Explizit gewählte Auswahlverfahren bleiben erhalten; alle Sitzungen halten die neue Stufenfolge und die Grenze von 15 Karten in allen vier Runden ein. Bereits gespeicherte Antworten längerer Runden bleiben erhalten.

## Protokoll und Export

Alles bleibt im Browser (`localStorage`), es gibt kein eigenes Backend. Es gibt keine Netzwerkanfragen an Dritte (seit dem 28.10.2026 auch keinen SMS-Versand mehr). Eine Sitzung wird erst gespeichert, wenn unter „Über dich“ die Einwilligung gegeben ist.

- **Pro Sitzung:** `sessionId`, `participantCode`, `startedAt`, `endedAt`, `appVersion`, `participantName` (Vorname, seit 0.10), `config`, Onboarding (Altersgruppe, Ernährungsweise, Ausschlüsse mit `source`, Notizen) und das am Ende angezeigte Profil. Dazu Zeitpunkte im `trace` (nur im JSON-Export), z. B. Bildschirmwechsel, `stage0_edit` („Ändern“ in der Zusammenfassung), `stage0_confirm` („Stimmt so“), Start und Ende der Runde.
- **Pro Ereignis:** `sessionId`, `cardId`, `stage`, `kind` (Entitätstyp nach Kap. 8), `parentId`, `round` (Runde 1, 2, …, Gerichte „G1“; in der CSV als eigene Spalte), `phase` (`main` = normale Auswahl, `holdout` = Kontrollkarte, `dish` = Gericht), `alternatives` (bis zu 5 Kandidaten, die stattdessen hätten kommen können, Anhang B3.2), `positionInRound`, `response` (`DISLIKE` | `LIKE` | `PREFER` | `UNFAMILIAR` | `INTOLERANT` | `UNDO`), `timestamp`, `responseTimeMs` (Karte vollständig sichtbar bis Antwort), `inputMethod` (`swipe` | `button` | `link`; `keyboard` nur bei Demos am Laptop), `selectionReason` (warum die Karte kam, z. B. `stage2_favorite`, `stage2_exception`, `holdout_check`; Liste in `src/logic/selection.js`), `ruleVersion`, bei INTOLERANT zusätzlich `excludedCardIds`.
- **Weitere Ereignisse im selben Log** (`type`): `RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED` (Profil, `source = "profile"`), `AUTH_STARTED`, `AUTH_COMPLETED` (Registrierung), `HOLDOUT_DRAWN` (Kontrollkarten mit `cardIds`), `QUESTION_ABORTED` („Runde beenden“ mit offener Karte, Kap. 6); `PRACTICAL_SAVED` (Alltagsprofil) nur noch in Sitzungen vor 0.10. Die CSV hat dafür die Spalten `type`, `source`, `rating`, `previousRating`, `fromPrediction`, `predictedScore`, `section`, `exclusions`, `cardIds`, `newDiet`, `previousDiet`, dazu je Sitzung `participantName`, `auth`, `selection` und `holdout`.
- **Profil am Ende** (`profile` in der Sitzung): direkte Bewertungen, Ausschlüsse (mit `status`), getrennt davon `predicted` (Vermutungen mit `score` und `basisId`) und `progress` (Profilstand).

**Ansicht für die Testleitung:** `?admin=1` anhängen. Sie ist nirgends verlinkt und zeigt alle Sitzungen auf dem Gerät mit:

- Export JSON (alles) und Export CSV (eine Zeile pro Ereignis, `sessionId` in jeder Zeile, UTF-8, Komma als Trennzeichen),
- je Sitzung „Kontrollkarten: x von 6 beantwortet“ (nur vollständige Sitzungen eignen sich für die Lernkurve),
- „Neue Testperson starten“ (meldet die vorherige Person auf dem Gerät ab und lädt die App neu, behält Sitzungen und die Parameter wie `limit` oder `selection`). **Nach jeder Testperson drücken:** Sonst sieht die nächste Person „Willkommen zurück“ und das Profil der vorherigen (Gesundheitsdaten, siehe Frage F4).
- „Alle Daten löschen“ mit Bestätigung.

Datenschutz: Seit dem 28.10.2026 steht der Vorname als `participantName` in Sitzung und Export (Teamentscheid, damit die Testleitung die Antworten zuordnen kann; abschaltbar mit `PRIVACY.logParticipantName`); eine Telefonnummer wird nicht mehr erfasst. Die Ausschlüsse sind Gesundheitsdaten; solange Frage F4 (Einwilligung) offen ist, lassen sie sich mit `PRIVACY.logExclusionValues = false` in `src/config.js` auf Typ und Herkunft reduzieren (auch in Profiländerungen).

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
  data/allergens.json    14 Hauptallergene mit Unterauswahl
  data/stage0.json       Fragebogen Stufe 0 und Tabelle der Ernährungsweisen
  data/image-credits.json  Unsplash-Fotos und Bildnachweise (APA 7)
  data/card-image-prompts.json  Gemini-Prompts (A15, seit A16 nicht mehr benötigt)
  lib/images.js          Bild je Karte (A15), nie Ausgeschlossenes im Bild, Bildstil der Sitzung
  storage/local.js       Konto und Stand der App auf dem Gerät (nie in Exporten)
  logic/answers.js       Antworttypen und ihre Bedeutung
  logic/events.js        Ereignistypen im Event-Log (Antworten, Profiländerungen, Registrierung)
  data/foods.json        alle Zutaten und Getränke (Schweizer Nährwertdatenbank, BLV), erzeugt von scripts/import-foods.py
  logic/foodSearch.js    einheitliche Suche mit Synonymen, Mehrzahl, Tippfehlern, Kategorie und Hervorhebung
  logic/swipe.js         Wischgesten: Schwelle, Rückfederung, Deckkraft der Beschriftung
  logic/filter.js        isAllowed, isVisible, Hinweise auf Familienkarten
  logic/engine.js        replay (Event-Log inkl. Profiländerungen), vier gestufte Runden mit je maximal 15 Karten, Runde 4 die passendsten Gerichte, Kontrollkarten in Runde 2,
                         Fortschritt, computeProfile, derivedEntries (Vermutungen)
  logic/selection.js     adaptive Kartenauswahl (Regeln nach nurec v0.2) und feste Reihenfolge zum Vergleich
  logic/preferences.js   Präferenzmodell: direkte Bewertungen und Vermutungen
  logic/holdout.js       Kontrollkarten ziehen (geschichtet, Zufall aus der sessionId)
  logic/dashboard.js     Profilstand „Profil aufgebaut“ und Inhalt des Dashboards (Anhang B)
  analysis/evaluation.js Auswertung: Lernkurve, Vergleichswerte, Bootstrap-Intervalle, Modellvarianten
  logic/profile.js       Ausschlüsse für „Mein Profil“ gruppieren
  logic/stage0.js        Ausschlüsse aus dem Onboarding ableiten
  logic/allergens.js     Auswahl und Suche in der Allergenliste
  logic/search.js        tolerante Suche (Gross-/Kleinschreibung, ä/ae)
  logging/logger.js      Sitzungen in localStorage
  logging/export.js      CSV- und JSON-Export
  components/            Swipe-Karte, Antwortknöpfe, untere Navigation, Sheets, Suche, Chips, Zustände
  screens/               Willkommen, Anmeldung (Vorname), Willkommen zurück, Über dich, Fragebogen,
                         Zusammenfassung, Tutorial (aus), Runde (auch Gerichte), Abschluss, Mein Profil, Admin
  test/dom.js            kleine DOM-Umgebung (jsdom) für Komponententests
  test/simulate.js       simulierte Testpersonen für Tests (keine echten Daten)
docs/
  messkonzept.md         Kontrollkarten, Kennzahlen, Vergleichswerte, Kriterium, Pilot
  00_Index.md bis 10_    Technische Analyse vor der Nutzerstudie (26.10.2026): Kartenlogik, Filter, Profil, Flowcharts, Tests, Bewertung
scripts/
  test-setup.mjs         lädt JSX, JSON und CSS in node --test wie Vite
  evaluate.mjs           npm run auswertung: liest JSON-Exporte, schreibt Lernkurve und Tabellen nach auswertung/
  check-mobile.py        Prüfung der Mobile-Kriterien (A11) mit Playwright
```

## Kartenauswahl

Die Oberfläche ruft nur `nextCard(state, config)` auf, das intern `selectNextCards(state, config)` nutzt. Welche Karte kommt, entscheidet `rankedCards` in `src/logic/selection.js` (rein, getestet in `src/logic/selection.test.js` mit den Beispielen aus nurec Kap. 11). Die Regeln stammen aus nurec v0.2, Kap. 5, 6 und 11 [D]; die Rangfolge und die Anschlusskarten ohne Beispiel im Konzept sind eigene Entscheide [V] (`exceptionCandidate`, `contrastPair` und `followUpSource` je Gruppe im Katalog).

| Rang | Karten | `selectionReason` |
| --- | --- | --- |
| 1 | „Kenne ich nicht“ bei einer Gruppe oder Untergruppe: auf der nächsten Ebene ein verbreitetes Kind, bei erneutem „Kenne ich nicht“ höchstens ein zweites, andersartiges; danach bleibt der Zweig unbekannt. Die Klärung bleibt auf zwei Karten dieser Vertiefungsrunde begrenzt | `stage2_after_unfamiliar`, `stage3_after_unfamiliar` |
| 2 | Gruppen (Stufe 1), die noch nicht gefragt wurden | `stage1_family` |
| 3 | Gruppe „Mag ich nicht“: die plausible Ausnahme (Hülsenfrüchte → Sojaprodukte, Fisch und Meeresfrüchte → Krebstiere) | `stage2_exception` |
| 4 | Gruppe „Mag ich“ oder „Mag ich sehr“: zwei Untergruppen als Kontrast (Obst → Beeren und Zitrusfrüchte, Milchprodukte → Joghurt und Quark sowie Käse) | `stage2_contrast` |
| 5 | Ausnahme gefällt: bis zu zwei konkrete Lebensmittel daraus (Naturtofu, Tempeh); Kontrast verschieden: je ein konkretes Lebensmittel (Erdbeeren, Orangen) | `stage3_exception_detail`, `stage3_difference` |
| 6 | Untergruppe „Mag ich sehr“: bis zu drei konkrete Favoriten | `stage3_favorite` |
| 7 | Kontrast verschieden: die übrigen Untergruppen; „Vertrage ich nicht“ nur für einen Teil: höchstens zwei der übrigen | `stage2_difference`, `stage2_after_intolerant` |

- Fällt der Kontrast gleich aus, ist der Zweig geklärt: Die übrigen Untergruppen werden vermutet, nicht gefragt. Eier und Kartoffeln brauchen keine Untergruppe.
- Seit 0.9 (Dozentenfeedback): Eine Gruppe „Mag ich nicht“ schliesst ihre übrigen Untergruppen nicht mehr endgültig aus. Sie kommen ganz am Schluss der Runde (`stage2_after_negative`), in Runde 3 höchstens zwei konkrete Lebensmittel je negativer Untergruppe (`stage3_after_negative`, `NEGATIVE_GROUP_POLICY`, `NEGATIVE_GROUP_QUOTA_STAGE3`, vorläufig).
- Innerhalb eines Rangs wechseln sich die Gruppen ab. Eine Kontrollkarte wird durch das nächste passende Kind ersetzt.
- Massgebend ist die aktuelle direkte Bewertung, auch wenn sie im Profil geändert wurde. Harte Ausschlüsse wirken immer.
- **Budget:** standardmässig bis zu 4 × 13 = 52 Karten in vier Runden; die absolute Grenze beträgt 15 pro Runde. Die sechs Kontrollkarten teilen sich das Budget von Runde 2 mit den normalen Untergruppen. Weniger sinnvolle oder zulässige Karten verkürzen eine Runde.
- **Gerichte** bilden ausschliesslich Runde 4. Harte Ausschlüsse gelten vor der Sortierung; Zutatenvorlieben aus Runde 1 bis 3 bestimmen die Auswahl und Reihenfolge der besten 13 Gerichte, werden aber nie als Gerichtsbewertung gespeichert. „Runde beenden“ ist jederzeit möglich, beim Kartenlimit endet die Runde automatisch. Es gibt keine fünfte oder nachgelagerte Gerichte-Runde.
- **Feste Reihenfolge** (`?selection=fixed`): als Vergleich innerhalb derselben vier Ebenen, einschliesslich konkreter Lebensmittel in Runde 3. Auch sie hält Kontrollkarten bis zum Ende von Runde 2 zurück.
- Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen (heute `demo-0.9`); sie steht in jedem Ereignis. `roundFlow: staged-v1` kennzeichnet den neuen Ablauf. Alte Spielstände behalten Antworten und Ausschlüsse; das bisherige Standardlimit 10 wird auf 13, Limits über 15 werden auf 15 angepasst. Frühere G-Runden werden als Runde 4 fortgesetzt, soweit das Kartenlimit noch nicht erreicht ist.

## Präferenzmodell und Kontrollkarten

- **Direkt:** Mag ich nicht −1, Mag ich +1, Mag ich sehr +2. „Kenne ich nicht“ und „Vertrage ich nicht“ sind kein Geschmack.
- **Vermutet:** Eine Karte ohne eigene Bewertung erbt die Bewertung ihrer nächsten bewerteten Gruppe, pro Stufe mit dem Faktor 0.5 abgeschwächt (nurec Kap. 7: „nur ein vorsichtiger Hinweis“). „Mag ich sehr“ wird nie vermutet. Zusammengesetzte Produkte und Gerichte sind eigene Einheiten: keine Vermutung, und ihre Antwort geht nie auf Zutaten über. Variante für die Auswertung: bewertete Geschwister zählen mit (`siblingWeight`, Standard 0 = aus).
- Alle Zahlen sind Annahmen [V] (`PREFERENCE_MODEL` in `src/config.js`). Ohne Geschwister hängt die Richtung einer Vermutung nur am Vorzeichen; Faktor und Gewichte ändern die Trefferquote nicht (Test in `src/logic/preferences.test.js`).
- **Kontrollkarten:** Nach „Stimmt so“ zieht die App sechs Untergruppen zufällig (bei kleineren Limits höchstens so viele wie Rundenplätze). Sie erscheinen am Ende von Runde 2. Die Lernkurve verwendet ausschliesslich normale Antworten vor der ersten Kontrollkarte; spätere Lebensmittelantworten bleiben im Profil und den Pilotkennzahlen erhalten, verändern aber die gemessene Vorhersage nicht rückwirkend.
- **Auswertung:** `npm run auswertung -- <export.json>` rechnet aus dem Protokoll nach, was die App nach k Antworten vermutet hätte (Lernkurve), mit den Vergleichswerten „immer Mag ich“ und „andere Personen“ und 95-%-Intervallen. Alles Weitere, auch Kriterium und Pilottest: [`docs/messkonzept.md`](docs/messkonzept.md).

## Mobile-Kriterien

Geprüft (zuletzt am 24.10.2026, vor den Änderungen vom 28.10.) bei 360 × 640 und 430 × 932 auf allen Bildschirmen (inkl. Registrierung, Zusatzangaben in Frage 2, Detailauswahl, Zusammenfassung mit „Ändern“, Bestätigung, Abschluss mit Profilstand, Runde 2, Gerichte-Runde, Dashboard, Bewertung, Vermutungen der App mit Bewertung, Allergien, Suche und Bestätigung in „Mein Profil“ sowie „Willkommen zurück“), mit 100 % und 130 % Schrift: kein horizontaler Scroll, Touch-Ziele ≥ 44 × 44 CSS-px, Textkontrast ≥ 4.5:1 (axe-core), jeder Text ≥ 18 px, bei 130 % Schrift wird nichts abgeschnitten, `prefers-reduced-motion` wird respektiert. In der Runde füllt der Kartenstapel den Platz zwischen Fortschritt und Knöpfen; auf kleinen Bildschirmen wird nur das Kartenbild kleiner, damit alle Knöpfe und „Vertrage ich nicht“ ohne Scrollen sichtbar bleiben. Auf hohen Handys ist der Stapel begrenzt, damit das Foto nicht zu stark beschnitten wird. Die Skripte sind für den Stand vom 28.10.2026 angepasst (Anmeldung nur mit Vorname, Gerichte-Runde mit Hinweis nach zehn Gerichten und „Runde beenden“ unter den Knöpfen), seither aber nicht ausgeführt.

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
- Marken und Herkunft sowie die SMS-Registrierung: am 28.10.2026 entfernt. Im Einwilligungstext der Studie stattdessen den Vornamen im Export erwähnen (Frage F4).
- Stufe 3 und 4 (96 konkrete Lebensmittel in den Blöcken 3.1 bis 3.7 und 64 Gerichte, davon 42 vom 29.10.2026) sind Team-Ergänzungen [V] nach den Beispielen im Konzept: Auswahl, Titel und Tags mit nurec prüfen. Die Gerichte der Nährwertdatenbank sind weiterhin nicht in der Suche.
- Gerichte sind gemäss Teamvorgabe vom 18.10.2026 in Runde 4 enthalten; eine zusätzliche Runde entfällt.
- 42 Bilder mit TODO prüfen, Ersatzbilder (z. B. Älplermagronen, Raclette, Spezialpasta) durch eigene Fotos ersetzen. Liste in [`docs/bilder-a16.md`](docs/bilder-a16.md). Gruppenbilder in Runde 1 mit Tibor besprechen (`GROUP_IMAGES`).
- Profilstand: Gewichte 35/30/35 sind ein Entwurf von nurec, `stage3Target` (12) ist eine Annahme; im Pilot prüfen.
- Alltagsprofil und Marken: am 28.10.2026 entfernt (sie wirkten nicht auf die Karten); mit Produkt- und Rezeptdaten später neu entscheiden.
- Die Anmeldung mit Vornamen kostet wenige Sekunden vor dem Swipen (auswertbar über `AUTH_STARTED`/`AUTH_COMPLETED`). Abschaltbar mit `AUTH_ENABLED = false`.
- Dürfen Testpersonen ihr Profil während der Studie bearbeiten? Jede Änderung ist im Log nachvollziehbar, verändert aber das angezeigte Profil.
- Synonyme: unsichere Begriffe in `synonymTodos` (z. B. „Baumnuss“ für Walnuss vs. Kartentitel „Baumnüsse“, Peperoni in Deutschland).
- Glutenfreie Varianten: Früher hiess es „Nur glutenfrei“, mit Tags entfällt die Familie Brot bei „Alles mit Gluten“ ganz.
- Werden die neuen Begriffe im Pilot verstanden?
- Standardwert für das Kartenlimit: 13, absolute Obergrenze 15. Belastung und Antwortzeiten im Pilot prüfen; jede Runde bleibt auf ihrer Ebene.
- Wird „Vertrage ich nicht“ übersehen oder mit „Mag ich nicht“ verwechselt? Im Pilot über `inputMethod = link` und Rückgängig-Ereignisse auswertbar.
- Tutorial: seit dem 13.10. aus. Ein Pilot-Vergleich ist mit `TUTORIAL_ENABLED = true` möglich (nicht über die URL).
- Zusammenfassung vor dem ersten Swipe: am 13.10. entfernt, am 14.10. in kurzer Form wieder eingebaut, weil nurec v0.2, Kap. 2.2 [D] sie verlangt („Die Person bestätigt oder korrigiert jede Regel.“). Mit dem Team bestätigen. Wie lange sie dauert, zeigt das Protokoll (Bildschirmwechsel, `stage0_edit`, `stage0_confirm`).
- Gespeicherter Stand auf dem Testgerät („Willkommen zurück“): Ins Testprotokoll gehört, dass die Testleitung nach jeder Person „Neue Testperson starten“ drückt. Gehört zu Frage F4.
- „Aus dem Profil entfernen“: Die Karte zählt für die Runde weiter als beantwortet. Für die Auswertung vertretbar, im Bericht erwähnen.
- Kacheln: Die Auswahl der 8 häufigen Allergene ist eine Annahme, keine Häufigkeitsangabe.
- Frage F4: Einwilligung und Speicherung von Gesundheitsdaten im Test.
- Ansprache mit Du oder Sie, Wischschwellen.
- Bildlizenzen: alle 181 Fotos unter der Unsplash License (keine Unsplash+-Bilder, Stand 29.10.2026); Nachweise mit APA 7 in `src/data/image-credits.json`. Vor der Abgabe Namen und Titel prüfen (z. B. „David Foodphototasty“ ist ein Künstlername) und klären, ob nurec für eine spätere Nutzung eigene Fotos braucht.
- Fotos oder Illustrationen (`IMAGE_STYLE`): mit Tibor abstimmen oder im Pilot vergleichen. Ob die Fotos die Bewertung beeinflussen (Annahme 5), im Pilot beobachten; die Fotos stammen von vielen Fotografen und sind nicht alle im gleichen Licht.
- Fotos fehlen für **Vollkornpasta** und **Pasta aus Hülsenfrüchten**: In den gespeicherten Unsplash-Suchen gab es kein passendes freies Foto (die Live-Suche ist durch eine Bot-Sperre blockiert). Die Karten zeigen die Pasta-Illustration; das Bildraster „Pasta“ zeigt drei Weizenpasten. Nachliefern, z. B. mit einem eigenen Foto oder einem Unsplash- bzw. Pexels-Zugang.
- Adaptive Auswahl und Präferenzmodell (Version 0.7): Rangfolge der Regeln, Annahmen (−1/+1/+2, Faktor 0.5, ohne Geschwister) und Kriterium „aussagekräftig“ im Team bestätigen, im Pilot prüfen und vor der Hauptstudie festschreiben (Messkonzept, Abschnitte 5 und 6).
- Eigenleistung: Auswahl, Modell und Auswertung wurden mit Claude Code umgesetzt. Mit Tibor klären, wie das deklariert wird.
- Kontrollkarten am Ende von Runde 2: Wer vorher aufhört, liefert keine. Die Ansicht für die Testleitung zeigt den Stand; spätere Antworten werden nicht rückwirkend als Vorwissen gewertet.
- Gerichte (Stufe 4): Die Kontrollkarten und die Lernkurve decken nur Lebensmittel ab, nicht Gerichte (Gerichte werden nie vermutet).
- Rückmeldung Team (12.10.) statt A7: Eingetippte Notizen blenden das Wort als Beispiel aus, schliessen aber keine Gruppe aus. Bestätigen, dass das so bleiben soll.

## Abgleich mit nurec v0.2

| Kapitel | Anforderung | Umsetzung |
| --- | --- | --- |
| 1 | Leitregel: Swipe hebt keine harte Regel auf, DISLIKE ist kein Ausschluss | `isAllowed` vor jeder Auswahl; DISLIKE nur Geschmack |
| 2, 2.1 | Pflichtfragen 0.1 bis 0.6, Folgefragen nur bei „vorhanden“ | drei Fragen, Details nur bei „Ja“; religiöse Regel (kein Schweinefleisch). Abweichungen seit dem 28.10.2026 (Teamentscheid): keine Quelle (ärztlich), kein Geltungsbereich (Laktose), keine Marken und Herkunft, kein „unsicher“ |
| 2.1 | Allergen-Auswahlliste, frei benennbare Lebensmittel | 14 Hauptallergene, Suche über rund 560 Lebensmittel der Nährwertdatenbank, Notiz mit Status „prüfen“ |
| 2.2 | Zusammenfassung vor Stufe 1, jede Regel bestätigen oder korrigieren; offen bleibt offen; Speicherung von Typ, ID, Geltungsbereich, Quelle, Prüfstatus, Datum; REJECT vor jedem Score, auch für Produkte | „Stimmt das so?“ mit „Ändern“; Regeln mit `status` (`medical` und `scope` seit dem 28.10.2026 entfernt); Filter auch über Zutaten von Produkten und Gerichten |
| 2.3 | Freiwilliges Alltagsprofil nach den Runden, ausgelassen = unbekannt, nicht im Prozentwert | bis 0.9 als Bildschirm „Alltag“ (`PRACTICAL_SAVED`); am 28.10.2026 entfernt, weil es ohne Produktdaten nicht wirkte |
| 3 | Ablauf: Familien → Antwort → kurze Runde → Untergruppen freiwillig → konkrete Lebensmittel und optional Gerichte → getrennt speichern | Vier Runden mit Abschluss: Familien, Untergruppen, konkrete Lebensmittel, Gerichte. Fortsetzen bleibt freiwillig; keine fünfte Runde |
| 4 | Drei Wischrichtungen, „Kenne ich nicht“ als Knopf, kein „Ist okay“, kein Überspringen; UNRATED ≠ UNFAMILIAR | umgesetzt; dazu „Vertrage ich nicht“ als Link (Addendum A4); Wortlaut von LIKE im Pilot prüfen |
| 5 | Vier Stufen mit Haltepunkten, nach jeder Runde aufhören können; Stufe 4 nach Stufe 2 | Stufe 0 vorab, danach je Runde eine Ebene; „Runde beenden“ und Abschluss nach jeder Runde; Gerichte in Runde 4 |
| 6 | Auswahl: Familien abdecken, eine Ausnahme bei DISLIKE, Unterschiede bei LIKE/PREFER, nach UNFAMILIAR sofort ein Kind und höchstens ein zweites; Zusatzkarten zählen zum Limit; protokollieren von ID, Stufe, Grund, Regelversion, Antwort, Abbruch; stoppen ohne neue Information | `selection.js` (siehe „Kartenauswahl“); `selectionReason`, `ruleVersion`, `QUESTION_ABORTED` |
| 7 | Familie gibt nur vorsichtige Hinweise, explizite Antworten zählen stärker; abgeleitete Präferenz mit Quelle; Produkte und Gerichte nicht auf Zutaten übertragen | `preferences.js`, Vermutungen mit Begründung, keine Vermutung für Produkte und Gerichte |
| 8 | Datenmodell: Constraint, PurchasePreference, PreferenceResponse, DerivedPreference, QuestionEvent, PreferenceEntity | Ausschlüsse, ANSWER-Ereignisse, `predicted`, Protokoll mit `alternatives`, `kind` je Karte |
| 9 | Beispiel eines adaptiven Durchlaufs (vegan, Hülsenfrüchte DISLIKE → Sojaprodukte → Naturtofu, Hummus) | als Test nachgespielt (`selection.test.js`) |
| 10 | Im Pilot messen: Dauer und Abbrüche pro Runde, „Kenne ich nicht“, erkannte Nachfrage, redundante Karten, neue und widersprüchliche Hinweise | `npm run auswertung` (Pilot-Kennzahlen) und Messkonzept |
| 11 | Beispiele für Anschlussfragen | alle sechs als Regeln umgesetzt und getestet |
| A1, A2 | Kartenkatalog Stufe 1 und 2 | unverändert übernommen |
| A3 | Stufe 3 in Teilblöcken 3.1 bis 3.7, höchstens 30 je Block | 96 Karten, Test prüft die Obergrenze |
| B1 | Dashboard nach Stufe 1, nach jeder Runde aktualisiert: Vorlieben, eher ungern, nie vorschlagen, Feinheiten, offen, nächste Runde, Alltag, Gerichte | „Mein Profil“ und Abschluss (ohne Alltag seit dem 28.10.2026) |
| B2 | „Profil aufgebaut“ als Erfassungsgrad 35/30/35, steigt nur nach informativen Antworten | `profileProgress`, klar beschriftet |
| B3 | Bestätigte Top-Favoriten nur aus direkten Antworten zu konkreten Lebensmitteln; mögliche Favoriten getrennt und unbestätigt | „Deine Favoriten“ und „Das vermutet die App“ |

## Quelle

Kartenkatalog Stufe 1 und 2, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
Allergene: Verordnung des EDI betreffend die Information über Lebensmittel (LIV), Anhang 6; Verordnung (EU) Nr. 1169/2011 (LMIV), Anhang II.
Lebensmittelliste der Suche: Schweizer Nährwertdatenbank, Generische Lebensmittel V 7.1 (01.07.2026), Bundesamt für Lebensmittelsicherheit und Veterinärwesen (BLV), https://naehrwertdaten.ch (frei verwendbar mit Quellenvermerk; der Vermerk steht auch in „Mein Profil“ unter „Bildnachweise und Quellen“).
