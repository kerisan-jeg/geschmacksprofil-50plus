# Umsetzung Dozentenfeedback vom 19.10.2026

Quellen: [A] Aufgabenstellung, [K] Dozentenfeedback 19.10.2026, [B] Befragung/Beobachtung, [D] Entwurf nurec v0.2, [V] eigene Annahme des Teams.

Stand: Arbeitspaket 1 (Verbesserungen 1 und 2). Arbeitspakete 2 und 3 folgen nach Freigabe.

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

**Eine Restriktion, eine ID.** Schweinefleisch aus Frage 1 (Teil B), aus der Suche in Frage 3 und aus der Suche im Profil ergibt immer `animalOrigin:pork`. Dafür tragen die Untergruppen Schwein, Rind und Kalb, Geflügel und Fisch im Katalog ein `restrictionTag`. Wie die Angabe erfasst wurde, bleibt als `selectedAs` erhalten. Die Chips „Schweinefleisch“ und „Rindfleisch“ in Frage 3 entfallen. Was schon in einer früheren Frage angegeben ist (z. B. „Kein Alkohol“), bietet Frage 3 nicht noch einmal an.

**Datenmodell.** Fleischkarten und Gerichte tragen neben `meat` die Fleischart (`pork`, `beef` für Rind und Kalb, `poultry`). Gerichte tragen `ingredientData` (`complete` oder `partial`; partial, solange Zutaten je nach Rezept offen sind).

### Annahmen [V], vom Team einzeln bestätigt (Freigabe AP1)

1. **Halal-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Kein Alkohol. Ist „Kein Schweinefleisch“ bestätigt, ist Gelatine schon eingeschlossen und gesperrt angehakt.
2. **Koscher-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Keine Meeresfrüchte.
3. Halal und koscher betreffen auch Zubereitung, Schlachtung und Zertifizierung. Das kann die App nicht prüfen und behauptet es nicht. Ohne bestätigten Vorschlag wirkt eine Speisevorschrift nicht auf die Karten.

### Weitere Annahmen [V], vom Team bestätigt (Korrektur nach AP1)

4. **Gelatine:** „Kein Schweinefleisch“ in Teil B schliesst Gelatine ein, mit sichtbarem Hinweis („auch keine Gelatine, oft vom Schwein“). Damit entspricht die neue Option der früheren Ernährungsweise „Kein Schweinefleisch: auch keine Gelatine (oft vom Schwein)“. Technisch: `includes` in stage0.json; die Gelatine steht als eigener Ausschluss mit `includedBy` im Protokoll und im Profil als ein Eintrag mit dem Schweinefleisch (wird mit ihm entfernt). „Keine Gelatine“ allein gibt es nur als Vorschlag bei einer Speisevorschrift, weil heute keine Karte Gelatine enthält. Die Suche in Frage 3 („Schweinefleisch“) ergibt dieselbe ID `animalOrigin:pork`, aber ohne Gelatine: Die Gelatine gehört zur Option in Teil B.
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

## Befunde für das Team

- **?limit:** Der URL-Parameter deckt nicht mehr 4 bis 30 ab, sondern nur noch 4 bis 15 (`ROUND_CARD_LIMIT_RANGE.max = 15` seit dem Stufenablauf vom 18.10.). Werte über 15 fallen still auf den Standard 13 zurück; gespeicherte Sitzungen mit mehr als 15 werden auf 15 gekürzt (`cardLimit`). Für einen Vergleich mit mehr Karten pro Runde müsste das Maximum angehoben werden (Teamentscheid).
- **Mobil-Check** (scripts/check-mobile.py): erwartete nach Runde 4 noch einen eigenen Schritt „Gerichte bewerten“. Seit dem Stufenablauf ist Runde 4 selbst die Gerichte-Runde; der Schritt ist im Skript jetzt optional.
