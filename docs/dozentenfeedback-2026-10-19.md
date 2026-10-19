# Umsetzung Dozentenfeedback vom 19.10.2026

Quellen: [A] Aufgabenstellung, [K] Dozentenfeedback 19.10.2026, [B] Befragung/Beobachtung, [D] Entwurf nurec v0.2, [V] eigene Annahme des Teams.

Stand: Arbeitspakete 1 (Verbesserungen 1 und 2), 2 (Verbesserungen 3, 4 und 5) und 3 (Verbesserungen 6, 7 und 8).

## Arbeitspaket 1: Vorfilter und Restriktionen

### Verbesserung 1: Hinweise passen zum angezeigten Kartennamen [K]

Beobachtung (Tibor): Ohne Rind und Schwein hiess die Karte bereits „Geflügel“, zeigte aber „Ohne Rindfleisch“ und „Ohne Schweinefleisch“.

Ursache: `annotateCard` (src/logic/filter.js) setzte Hinweise für alle ausgeblendeten Untergruppen, auch wenn der angezeigte Titel den betroffenen Teil („Fleisch“) schon weggelassen hatte.

Regel jetzt: Ein Hinweis erscheint nur, wenn die angezeigte Karte das Ausgeschlossene dem Namen nach noch umfasst.

| Ausschlüsse | Titel | Hinweis |
|---|---|---|
| kein Schwein | Fleisch und Geflügel | Ohne Schweinefleisch |
| kein Schwein, kein Rind | Geflügel | keiner |
| vegetarisch | Karte entfällt | – |

Hinweise nennen die Restriktion beim Namen (`restrictionLabel` im Katalog: „Ohne Rindfleisch“ statt „Ohne Rind und Kalb“).

### Verbesserung 2: Frage 1 in drei Teilen [K]

- **Teil A, Ernährungsform** (Pflicht): Keine besondere Ernährungsform, Pescetarisch, Vegetarisch, Vegan.
- **Teil B, Einzelausschlüsse** (freiwillig): Kein Schweinefleisch (auch keine Gelatine, oft vom Schwein; so sichtbar in der Auswahl), Kein Rindfleisch (auch Kalb), Kein Geflügel, Kein Fisch, Keine Meeresfrüchte, Kein Alkohol. Was die Form schon ausschliesst, ist angehakt und gesperrt („Schon durch ‚Vegetarisch‘ abgedeckt“). Eine vorher gewählte Angabe bleibt in der Antwort und gilt nach einem Wechsel der Form wieder.
- **Teil C, Speisevorschriften** (freiwillig): Halal, Koscher. Sie schliessen selbst nichts aus. Die App zeigt einen ehrlichen Hinweis und Vorschläge, die die Person einzeln bestätigt.

Es gibt keine Frage nach Religion, kein Feld dafür und keine Ableitung daraus, auch nicht im Export (Test in src/logic/diet.test.js).

**Eine Restriktion, ein Weg.** Schweinefleisch aus Frage 1 (Teil B), aus der Suche in Frage 2 und 3 und aus der Suche im Profil ergibt immer `animalOrigin:pork` und schliesst Gelatine ein (Teamentscheid nach AP1). Dafür tragen die Untergruppen Schwein, Rind und Kalb, Geflügel und Fisch im Katalog ein `restrictionTag`. Wie die Angabe erfasst wurde, bleibt als `selectedAs` erhalten. Die Chips „Schweinefleisch“ und „Rindfleisch“ in Frage 3 entfallen. Was schon in einer früheren Frage angegeben ist (z. B. „Kein Alkohol“), bietet Frage 3 nicht noch einmal an.

**Datenmodell.** Fleischkarten und Gerichte tragen neben `meat` die Fleischart (`pork`, `beef` für Rind und Kalb, `poultry`). Gerichte tragen `ingredientData` (`complete` oder `partial`; partial, solange Zutaten je nach Rezept offen sind).

### Annahmen [V], vom Team einzeln bestätigt (Freigabe AP1)

1. **Halal-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Kein Alkohol. Ist „Kein Schweinefleisch“ bestätigt, ist Gelatine schon eingeschlossen und gesperrt angehakt.
2. **Koscher-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Keine Meeresfrüchte.
3. Halal und koscher betreffen auch Zubereitung, Schlachtung und Zertifizierung. Das kann die App nicht prüfen und behauptet es nicht. Ohne bestätigten Vorschlag wirkt eine Speisevorschrift nicht auf die Karten.

### Weitere Annahmen [V], vom Team bestätigt (Korrektur nach AP1)

4. **Gelatine:** „Kein Schweinefleisch“ in Teil B schliesst Gelatine ein, mit sichtbarem Hinweis („auch keine Gelatine, oft vom Schwein“). Damit entspricht die neue Option der früheren Ernährungsweise „Kein Schweinefleisch: auch keine Gelatine (oft vom Schwein)“. Technisch: `includes` in stage0.json; die Gelatine steht als eigener Ausschluss mit `includedBy` im Protokoll und im Profil als ein Eintrag mit dem Schweinefleisch (wird mit ihm entfernt). „Keine Gelatine“ allein gibt es nur als Vorschlag bei einer Speisevorschrift, weil heute keine Karte Gelatine enthält. Die Suche („Schweinefleisch“ in Frage 2, Frage 3 und im Profil) wirkt genau gleich, inklusive Gelatine (`restrictionIncludes`, `includedEntries` in src/logic/stage0.js; Test in src/logic/diet.test.js).
5. **Fleisch unbekannter Art:** Eine Karte mit `meat`, aber ohne Fleischart fällt weg, sobald irgendeine Fleischart ausgeschlossen ist. Heute betrifft das keine Karte (Test prüft es). Bestätigt.
6. **Frühere Antworten** (gespeicherte Sitzungen bleiben unverändert, sie werden nur anders gelesen): „Kein Schweinefleisch“ wird zu „Keine besondere Ernährungsform“ plus „Kein Schweinefleisch“ (mit Gelatine); „Kein Fisch“ zu Fisch und Meeresfrüchte. Die übrigen Formen bleiben gleich. Im CSV-Export enthält `diet` die Form, wie sie heute gelesen wird, und `dietOriginal` den damals gespeicherten Wert (nur bei solchen Sitzungen gefüllt). Bestätigt.
7. **Lamm** ist als Fleischart vorgesehen (`MEAT_KINDS`), der Katalog hat aber keine Lammkarte und keinen Punkt in Teil B. Bestätigt.

### Protokoll und Export

- **Speisevorschriften werden standardmässig nicht protokolliert** (`PRIVACY.logDietaryRules = false`, Teamentscheid). Begründung:
  - Die Stichprobe ist klein. Zusammen mit Altersgruppe und Teilnehmernummer kann eine Angabe wie „halal“ einzelne Personen erkennbar machen.
  - Halal oder koscher lässt Rückschlüsse auf die Religion zu, also auf besonders schützenswerte Personendaten. Die App fragt bewusst nicht nach Religion; das Protokoll soll sie auch nicht indirekt enthalten.
  - Für die Auswertung bringt die Angabe kaum etwas: Wirksam sind nur die einzeln bestätigten Ausschlüsse (z. B. Schweinefleisch), und die stehen wie alle Ausschlüsse im Protokoll.
- Die Spalte `dietaryRules` bleibt im CSV. Leer heisst „nicht erfasst“; im Protokoll steht dann `null` (mit `true` ein Array, `[]` für keine). Die Angabe selbst bleibt im App-Zustand auf dem Gerät, damit Zusammenfassung und Profil sie zeigen.
- Die Spalte `diet` enthält die Ernährungsform.
- **Ereignistyp:** Eine zusätzliche Spalte `eventType` gibt es nicht. Die bestehende Spalte `type` enthält den Ereignistyp jeder Zeile (ANSWER, UNDO, EXCLUSION_ADDED …) und erfüllt die Anforderung (Teamentscheid, Freigabe AP1).

### Rundenstatus und Fortsetzen (Teamentscheid, Korrektur nach AP1)

- „Runde beenden“ behält Namen und Bedeutung (Messwert für Aufwand); das vorzeitige Ende steht als `QUESTION_ABORTED` im Log und bleibt dort.
- Nach einem vorzeitigen Ende ist die nächste Runde freigegeben.
- Status (`roundStatus` in src/logic/engine.js): „Begonnen“, solange Karten offen sind; „Abgeschlossen“, sobald die Runde das Kartenlimit erreicht oder keine Karte mehr hat, auch nach einem Fortsetzen.
- Fortsetzen ist möglich, solange in einer späteren Runde noch keine Karte beantwortet ist (`canResumeRound`), weil die Auswahl der späteren Runde auf dem Stand bei Rundenende beruht. Danach bleibt die Runde „Begonnen“. Knopf und Rundenübersicht folgen in Arbeitspaket 3.

### Admin-Ansicht: effektive Konfiguration

Jede Sitzung zeigt ihre Konfiguration, so wie sie lief: Limit, Tutorial, Auswahl, Kontrollkarten, Bildstil (ab AP2 auch die Skala von Runde 1, `r1scale`). Ungültige URL-Parameter fallen weiterhin auf den Standard zurück, stehen aber jetzt als `ignoredParams` in der Sitzung und rot in der Admin-Ansicht, z. B. „Achtung, ignoriert: ?limit=30. Es galt der Standard.“ Dasselbe gilt oben für die Adresse der nächsten Testperson.

## Arbeitspaket 2: Runde 1 und Orientierung

### Verbesserung 3: Eigene Bewertungsbegriffe für Runde 1 [K]

- Runde 1 (Gruppen, Stufe 1): **Eher ungern / Eher gern / Sehr gern** (Variante A, Standard). Mit `?r1scale=2`: **Eher ungern / Eher gern** (Variante B). Wischen nach oben, der Knopf „Sehr gern“ und die Taste ↑ entfallen dann; nach oben springt die Karte zurück.
- Runden 2 bis 4 behalten die Begriffe aus A3 (Mag ich nicht / Mag ich / Mag ich sehr). Die Richtungen sind überall gleich: links negativ, rechts positiv, oben stark positiv.
- Im Profil (Chip und Bewertung) zeigen Gruppen dieselben Begriffe wie in Runde 1.
- Die internen Antwortwerte bleiben DISLIKE, LIKE, PREFER, UNFAMILIAR, INTOLERANT, UNDO. Jedes Antwort-Ereignis und jede Bewertung im Profil trägt `labelShown` (der gezeigte Begriff) und `scaleVariant` (`r1-3`, `r1-2`, `standard`). Begriffe: `SCALE_LABELS` in src/labels.js; Zuordnung: src/logic/scale.js.
- `r1scale` steht in jeder Sitzung, im CSV (Spalte `r1scale`, je Ereignis `labelShown` und `scaleVariant`) und in der Admin-Ansicht. Ungültige Werte (z. B. `?r1scale=4`) fallen auf 3 zurück und erscheinen rot wie bei `limit`.
- Einleitung in Runde 1, solange noch keine Karte beantwortet ist: „Hier geht es um eine erste grobe Einschätzung. Einzelne Lebensmittel fragen wir später genauer.“
- „Eher ungern“ war seit A3 als alter Begriff gesperrt (Test). Er ist jetzt bewusst wieder erlaubt, aber nur in `SCALE_LABELS` für Runde 1.
- „Kenne ich nicht“ und „Vertrage ich nicht“ (mit Detailauswahl) bleiben in Runde 1 unverändert. Keine neutrale Bewertung.

### Negative Gruppe ist kein Ausschluss [K]

Bisher schlossen zwei Stellen in src/logic/selection.js endgültig aus: Bei einer Gruppe „Mag ich nicht“ kam nur die Ausnahme, und Runde 3 nahm nur Untergruppen mit positiver oder unbekannter Bewertung. Beides ist entfernt.

`NEGATIVE_GROUP_POLICY` in src/config.js (TODO Team) beschreibt die Varianten:

| Variante | Wirkung | Stand |
|---|---|---|
| (a) `last` | Unterkarten kommen nach allen anderen Karten der Runde, nur wenn das Kartenlimit Platz lässt | umgesetzt, vorläufiger Platzhalter |
| (b) Quote | höchstens N weitere Unterkarten je negativer Gruppe | nicht umgesetzt |
| (c) abgeschwächte Rangzahl | Unterkarten mit einem Faktor nach hinten sortiert statt in einer festen letzten Stufe | nicht umgesetzt |

Mit (a) hängt Runde 2 die übrigen Untergruppen ganz hinten an (`stage2_after_negative`). Runde 3 hängt je negativer Untergruppe konkrete Lebensmittel ganz hinten an (`stage3_after_negative`), höchstens `NEGATIVE_GROUP_QUOTA_STAGE3 = 2`. Diese Begrenzung ist eine **Quote (Element von Variante b)** und eine **vorläufige Entscheidung** (TODO Team in src/config.js), keine reine Variante (a). Eine negative Gruppe erzeugt nie eine Ausschluss-ID, keine Allergie und keine Restriktion.

**Folge:** Bei vielen Ablehnungen werden Runden 2 und 3 länger als vor dem 19.10.2026, aber nie länger als das Kartenlimit. Beispiel aus dem Test „durchgängige Ablehnung“: Bisher endete die Profilerstellung nach Runde 2 ohne konkrete Lebensmittel; jetzt füllt Runde 3 mit höchstens zwei Lebensmitteln je Untergruppe.

Angepasste Tests (src/logic/selection.test.js), alte und neue Erwartung:

| Test | Alt | Neu |
|---|---|---|
| Hülsenfrüchte „Mag ich nicht“ → Sojaprodukte als Ausnahme | nur Sojaprodukte (Ausnahme) | Sojaprodukte (Ausnahme), danach Linsen, Bohnen, Erbsen mit `stage2_after_negative` |
| … nach „Sojaprodukte: Mag ich“ | übrige Hülsenfrüchte kommen nie | übrige Hülsenfrüchte erst nach allen anderen Karten |
| … nach „Sojaprodukte: Mag ich nicht“ | keine Karte mehr aus Hülsenfrüchte | nur noch `stage2_after_negative`, keine weitere Vertiefung |
| … Fisch und Meeresfrüchte „Mag ich nicht“ | nur Meeresfrüchte (Ausnahme) | Meeresfrüchte (Ausnahme), danach Fisch und dritte Untergruppe am Schluss |
| Kontrast und Ausnahme weichen einer Kontrollkarte aus | Hülsenfrüchte: nur Ersatz-Ausnahme | Ersatz-Ausnahme, danach die zwei übrigen am Schluss |
| Regeln folgen der aktuellen Bewertung (Obst im Profil auf „Mag ich nicht“) | nur die Ausnahme | Ausnahme, danach vier Untergruppen am Schluss |
| Durchgängige Ablehnung | keine Antwort auf Stufe 3 | Stufe 3 nur mit `stage3_after_negative`, höchstens `NEGATIVE_GROUP_QUOTA_STAGE3` je Untergruppe |

Neu dazugekommen ist der Test „Negative Gruppe schliesst nie endgültig aus“ (Kürbis-Beispiel).

### Gewichtung je Ebene: STAGE_WEIGHTS und inheritFactor

`STAGE_WEIGHTS` (src/config.js) steht auf 1 für alle Stufen und hat damit keine Wirkung. Die Werte legt das Team fest (TODO).

So würden die beiden Grössen zusammenwirken (src/logic/preferences.js):

- Direkte Bewertung einer Karte auf Stufe s: Wert = Gewicht der Antwort × `STAGE_WEIGHTS[s]`.
- Vermutung für eine Karte auf Stufe t aus der nächsten bewerteten Gruppe auf Stufe s: Wert der Gruppe × `inheritFactor` hoch (t − s).
- Zusammen: Gewicht × S(s) × f^(t − s).

Beispiel mit S(1) = 0.5 und f = 0.5: Obst „Eher gern“ ergibt für Beeren (Stufe 2) 1 × 0.5 × 0.5 = 0.25 und für Erdbeeren (Stufe 3) 0.125. Ohne STAGE_WEIGHTS wären es 0.5 und 0.25. Beide Grössen schwächen Gruppenbewertungen ab: **doppelte Abschwächung**, sobald S(1) < 1 und f < 1.

Was sich ändert und was nicht:
- Die Richtung einer Vermutung (vermutlich gern / nicht) hängt bei `siblingWeight = 0` nur vom Vorzeichen ab und ändert sich nie.
- Eine konkrete Bewertung gilt immer vor jeder Vermutung, unabhängig von den Zahlen.
- Wirkung haben die Zahlen auf die Reihenfolge der Gerichte nach Zutaten-Affinität (`openDishes`), auf die Mischung mit Geschwistern (`siblingWeight > 0`) und auf jede spätere Auswertung, die Beträge vergleicht.

Mögliche Entscheide: (1) STAGE_WEIGHTS nur für direkte Bewertungen, Vermutungen nur über f; (2) STAGE_WEIGHTS ersetzt f; (3) beide bewusst kombiniert. Ohne Entscheid bleibt S = 1, also das heutige Verhalten.

### Verbesserung 4: Keine Beispiele, neutrales Symbol in Runde 1 [K]

Tibors Wunsch [K]: Beispiele unter Gruppenkarten lenken die Einschätzung („Gemüse“ mit Tomaten und Gurken). Deshalb zeigen die 13 Gruppen:

- **keinen Beispieltext und kein Foto**, auch im Stapel dahinter und im Profil;
- auf allen Karten **dasselbe neutrale Symbol**, einen leeren Teller mit Besteck (Variante A, Teamentscheid). Kein Symbol zeigt ein einzelnes Lebensmittel;
- je Gruppe eine **eigene Kartenfarbe**. Die Farben sind neu gewählt (OKLCH, abwechselnd heller und etwas dunkler), damit sich alle 13 deutlich unterscheiden: kleinster Abstand ΔE(OKLab) 0.037 statt 0.004 vorher (Hülsenfrüchte und Kartoffeln waren fast gleich). Test: src/tints.test.js;
- einen **grösseren Titel** (1.15-fach);
- auch bei **reduzierter Bewegung** einen sichtbaren Kartenwechsel: kurzes Überblenden (240 ms, nur Deckkraft, keine Bewegung) statt sofortigem Austausch. Dazu wechselt „Karte 3 von 13“, und der Screenreader sagt die neue Karte an.

Kontraste (A11, gemessen und im Test geprüft, Korrektur nach AP2): Jeder Text der Karte erreicht auf jeder der 13 Kartenfarben und auf Weiss mindestens 4.5:1, auch wenn Titel und Umschreibung heute auf Weiss stehen. Titel (`--color-ink`) 10.6:1 bis 13.4:1; Umschreibung, Art der Karte und Symbol (`--color-ink-secondary`) 4.6:1 bis 5.8:1; Hinweise (`--color-rule`) ebenfalls über 4.5:1. Dafür sind die dunkleren Kartenfarben leicht aufgehellt.

Neutrale Umschreibungen (`description` im Katalog, `descriptionStatus: provisional`, **vorläufig**, Freigabe offen):

| Gruppe | Umschreibung |
|---|---|
| Reis und andere Getreide | Körner als Beilage |
| Salat und Rohkost | Gemüse, roh gegessen |
| Gegartes Gemüse | Gemüse, gekocht, gedämpft oder gebraten |
| Nüsse und Samen | Harte Kerne, roh oder geröstet |

Hülsenfrüchte ohne Umschreibung (Teamentscheid). Die übrigen Begriffe gelten als selbsterklärend. Runden 2 bis 4 zeigen Beispiele und Fotos wie bisher.

### Verbesserung 5: Aktuelle Runde sichtbar [K]

Über dem Kartenstapel steht „Runde 1 von 4 · Lebensmittelgruppen · erste grobe Einschätzung“ (in Runde 1; sonst ohne Zusatz), darunter der bestehende Fortschritt der Runde „Karte 3 von 13“ (bezogen auf das tatsächliche Rundenlimit). Rundennamen: Lebensmittelgruppen, Genauer nachgefragt, Einzelne Lebensmittel, Gerichte. Während des Wischens erscheint kein Profilstand, also höchstens zwei Angaben. Beides leitet sich aus dem Event-Log ab und folgt Rückgängig sofort.

**Kein Scrollen in der Runde** (Korrektur nach AP2): Wischen nach oben ist eine Bewertung, Scrollen könnte zu Fehlbewertungen führen. Deshalb:
- Der ausführliche Einleitungssatz steht auf der Zusammenfassung vor Runde 1 („Danach: Runde 1“), nicht mehr auf der Karte.
- Der Rundenbildschirm scrollt nie. Fehlt Höhe, gibt die Karte Platz ab: zuerst das Bild, bei sehr wenig Höhe fällt es weg und der Titel wird etwas kleiner. Die Kopfzeile bleibt einzeilig (bei grosser Schrift ohne Symbole).
- Die Karte selbst lässt sich nie scrollen (`touch-action: none`): Eine Bewegung auf der Karte ist immer eine Geste.
- Mobil-Check (scripts/check-mobile.py) prüft auf **jeder Karte** aller Runden: Seite scrollt nicht; Karte, Antwortknöpfe, „Kenne ich nicht“, „Vertrage ich nicht“ liegen im Bild; Titel und Text der Karte sind nicht abgeschnitten. Bei 130 % Schrift: kein Scrollen, Antwortknöpfe sichtbar, Kartentext nicht abgeschnitten. Scrollen wird als Befund gemeldet.
- Ergebnis: 360 × 640 und 430 × 932, je 100 % und 130 %: keine Befunde. Bei 130 % auf 360 × 640 ist das Bild der Karte klein oder fehlt.

## Arbeitspaket 3: Gerichte, Rundenübersicht, Alltag

### Verbesserung 6: Gerichte nach Esskulturen [K]

- Jedes Gericht trägt `cuisines` (IDs) im Katalog; die Anzeigenamen stehen zentral in src/data/cuisines.json. „Asiatisch“ ist Oberbegriff (`parent`); differenziert ist nur, wo Gerichte im Katalog sind (thailändisch, chinesisch). Die beiden Currys bleiben „asiatisch“ (Teamentscheid AP1). Chili con Carne gilt als mexikanisch (Tex-Mex, Annahme [V]).
- **Nur Metadatum** [V]: Die Küche erscheint nie auf der Karte, weil ein Label wie „Schweizer Küche“ die Bewertung beeinflussen kann. Sie steht in jedem Antwort-Ereignis eines Gerichts (`cuisines`, auch im CSV) für die Auswertung.
- **Vorsichtige Tendenz** im Profil (Abschnitt Gerichte, „Tendenz nach Küche“): erst ab `CUISINE_MIN_RATED = 3` bewerteten Gerichten einer Küche (TODO Team), formuliert als „eher gern / eher ungern / gemischt“, nie als feste Vorliebe. „Kenne ich nicht“ zählt nicht (auch nicht negativ). Unterküchen zählen für den Oberbegriff.
- Keine Abfrage oder Ableitung von Nationalität oder Herkunft, keine Annahme, dass jemand die Küche seines Landes bevorzugt.

**Vier Zusatzgerichte** (Teamfreigabe nach AP2), mit Allergenen, Tierherkunft inkl. Fleischart, Zutaten-Karten, `ingredientNames` und `ingredientData`:

| ID | Gericht | Küche | ingredientData | Grund für partial |
|---|---|---|---|---|
| D19 | Pad Thai mit Crevetten | thailändisch | partial | Fischsauce, Sojasauce und Ei je nach Rezept, konservativ getaggt |
| D20 | Frühlingsrollen mit Gemüse | chinesisch | partial | Füllung je nach Rezept auch mit Schweinefleisch, Crevetten oder Ei |
| D21 | Enchiladas mit Poulet | mexikanisch | partial | Tortillas aus Mais oder Weizen, mit Weizen getaggt |
| D22 | Ratatouille | französisch | complete | – |

**Bildnachweise:** Kein Gericht im Katalog hat ein Foto; alle 22 zeigen die eigene Illustration public/illustrations/dish.svg (Teamarbeit, keine Fremdrechte). Die vier neuen Gerichte ebenso. Fotos für Gerichte wären eine eigene Aufgabe (mit Nachweisen in src/data/image-credits.json wie bei den Lebensmitteln).

**Verteilung** (22 Gerichte): schweizerisch 9, italienisch 5, mexikanisch 2, asiatisch 4 (davon thailändisch 1, chinesisch 1, Currys 2), österreichisch 1, französisch 1.

**Wie viele erscheinen in Runde 4?** Höchstens das Kartenlimit, sortiert nach Nähe zu den Zutaten (`openDishes`, bei Gleichstand Katalogreihenfolge). Simulation mit drei Geschmacksprofilen (src/test/simulate.js, ohne Ausschlüsse):

| Limit | Profil | Gezeigte Küchen |
|---|---|---|
| 10 | alles „Mag ich“ | schweizerisch 5, italienisch 1, mexikanisch 1, österreichisch 1, Curry 1, thailändisch 1 |
| 10 | Gemüse und Reis „sehr“, Fleisch „nicht“ | schweizerisch 5, italienisch 2, Curry 2, thailändisch 1 |
| 13 | alles „Mag ich“ | schweizerisch 6, italienisch 2, Curry 2, thailändisch 1, chinesisch 1, mexikanisch 1 |
| 13 | „Fisch sehr“ | schweizerisch 6, italienisch 2, Curry 2, thailändisch 1, chinesisch 1, mexikanisch 1 |

Folge: Mit `CUISINE_MIN_RATED = 3` entsteht in einer Sitzung meist nur für die schweizerische Küche und (über den Oberbegriff) für die asiatische eine Tendenz. Für italienisch, mexikanisch, französisch und österreichisch reicht es selten. Die Reihenfolge der Gerichte ist Teil der Auswahllogik (Eigenleistung Team) und wurde nicht geändert; ein Ausgleich nach Küchen wäre eine eigene Entscheidung (siehe „Noch offen“).

### Verbesserung 7: Rundenübersicht [K]

- **Übersicht der vier Runden** (src/components/RoundOverview.jsx, Logik src/logic/rounds.js): Name, Status mit Symbol und Text, Fortschritt in Karten („1 von 13 Karten“). Keine Statistik, kein weiterer Balken.
- **Status** [V], aus dem Event-Log abgeleitet: „Noch offen“ (keine Antwort), „Begonnen“ (Karten offen, auch nach „Runde beenden“), „Abgeschlossen“ (Kartenlimit erreicht oder keine Karte mehr, auch nach dem Fortsetzen). „Abgeschlossen“ steht nie für eine vorzeitig beendete Runde mit offenen Karten. Das vorzeitige Ende bleibt als `QUESTION_ABORTED` im Log.
- **Runde ohne passende Karte** (z. B. alle Gerichte durch Ausschlüsse weg): „Abgeschlossen · Keine passenden Karten nach deinen Angaben“, sobald die Runden davor nicht mehr offen sind. Annahme [V]: Es gibt nur die drei Status; „keine Karte mehr“ zählt nach eurer Regel als abgeschlossen.
- **Sperre:** Eine Runde ist gesperrt, solange eine frühere noch offen ist („Startet nach Runde 2“). Nach „Runde beenden“ ist die nächste Runde frei (Teamentscheid AP1).
- **Runde fortsetzen** auf dem Abschluss nach jeder Runde: nur für begonnene Runden, solange in einer späteren Runde noch nichts beantwortet ist (die Auswahl der späteren Runde beruht auf dem Stand bei Rundenende). Bereits beantwortete Karten kommen nicht noch einmal.
- **Während des Wischens erreichbar:** Die Rundenanzeige über dem Stapel ist ein Knopf und öffnet die Übersicht als Blatt (nur Ansicht, „Zurück zur Karte“). Die Antwortzeit pausiert, solange das Blatt offen ist; `responseTimeMs` zählt nur die Zeit, in der die Karte sichtbar war (Test in src/components/round.test.js).
- **Navigationsereignisse:** eigener Typ `NAVIGATION` mit `action` (`overview_open`, `overview_close`, `round_resume`) und `round`. Keine Antwort: Replay, Profil und Rundenstatus ignorieren sie. Im CSV: Spalte `type` = NAVIGATION, neue Spalte `action`.
- Zustand bleibt beim Wechsel zwischen Ansichten erhalten, weil alles aus dem Event-Log abgeleitet wird.
- Rückgängig wirkt wie bisher nur innerhalb der laufenden Runde; über die Rundengrenze geht es nicht (unverändert, A8).

## Noch offen (Entscheid oder Pilot)

- **Wirkt Runde 1 ohne Bilder monoton?** Alle 13 Gruppen zeigen dasselbe Symbol. Im Pilot prüfen (Rückmeldungen, Antwortzeiten, Abbrüche in Runde 1) und Tibor zeigen.
- „Gegartes Gemüse“ und „Salat und Rohkost“ sind als Gruppen sehr breit (Kürbis-Beispiel). Nicht umgebaut.
- „Kenne ich nicht“ in Runde 1: wenig sinnvoll bei Eier, Milchprodukte, Brot, Pasta, Kartoffeln, Obst, Salat und Rohkost, Gegartes Gemüse; eher sinnvoll bei Hülsenfrüchte, Nüsse und Samen, Reis und andere Getreide, Fisch und Meeresfrüchte. Regelvorschlag: Knopf überall gleich lassen, im Pilot den Anteil je Karte messen.
- `NEGATIVE_GROUP_POLICY` (Variante a, b oder c) und `STAGE_WEIGHTS` (Werte, Zusammenspiel mit inheritFactor).
- Umschreibungen der vier Gruppen freigeben.
- Runde 4 (Gerichte) zählt in diesem Lauf nicht zum Profilstand (nurec B2, Teamentscheid AP1).
- `CUISINE_MIN_RATED` (Wert) und ob Runde 4 die Küchen ausgleichen soll (heute überwiegen Schweizer Gerichte; Tendenzen für andere Küchen entstehen selten).
- Gerichte mit unvollständigen Zutatendaten (`ingredientData: partial`, 15 von 22): keine positive Eignungsaussage; Rezepte klären.

## Befunde für das Team

- **?limit:** Der URL-Parameter deckt nicht mehr 4 bis 30 ab, sondern nur noch 4 bis 15 (`ROUND_CARD_LIMIT_RANGE.max = 15` seit dem Stufenablauf vom 18.10.). Werte über 15 fallen still auf den Standard 13 zurück; gespeicherte Sitzungen mit mehr als 15 werden auf 15 gekürzt (`cardLimit`). Für einen Vergleich mit mehr Karten pro Runde müsste das Maximum angehoben werden (Teamentscheid).
- **Mobil-Check** (scripts/check-mobile.py): erwartete nach Runde 4 noch einen eigenen Schritt „Gerichte bewerten“. Seit dem Stufenablauf ist Runde 4 selbst die Gerichte-Runde; der Schritt ist im Skript jetzt optional.
- **Mobil-Check, Runde 3:** Die Kontrollkarten werden je Sitzung zufällig gezogen. Im kurzen Testablauf (`?limit=4`) kann Runde 3 deshalb leer sein; die App bietet dann direkt Runde 4 an (korrekt). Das Skript erwartete fest Runde 3 und brach gelegentlich ab; es folgt jetzt dem Angebot der App.
- **„Karte 1 von 4“** auf den Screenshots: Der Mobil-Check startet mit `?limit=4` (kurzer Ablauf), das ist korrekt.
