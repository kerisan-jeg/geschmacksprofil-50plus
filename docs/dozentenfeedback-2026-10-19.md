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
- **Teil B, Einzelausschlüsse** (freiwillig): Kein Schweinefleisch, Kein Rindfleisch (auch Kalb), Kein Geflügel, Kein Fisch, Keine Meeresfrüchte, Kein Alkohol. Was die Form schon ausschliesst, ist angehakt und gesperrt („Schon durch ‚Vegetarisch‘ abgedeckt“). Eine vorher gewählte Angabe bleibt in der Antwort und gilt nach einem Wechsel der Form wieder.
- **Teil C, Speisevorschriften** (freiwillig): Halal, Koscher. Sie schliessen selbst nichts aus. Die App zeigt einen ehrlichen Hinweis und Vorschläge, die die Person einzeln bestätigt.

Es gibt keine Frage nach Religion, kein Feld dafür und keine Ableitung daraus, auch nicht im Export (Test in src/logic/diet.test.js).

**Eine Restriktion, eine ID.** Schweinefleisch aus Frage 1 (Teil B), aus der Suche in Frage 3 und aus der Suche im Profil ergibt immer `animalOrigin:pork`. Dafür tragen die Untergruppen Schwein, Rind und Kalb, Geflügel und Fisch im Katalog ein `restrictionTag`. Wie die Angabe erfasst wurde, bleibt als `selectedAs` erhalten. Die Chips „Schweinefleisch“ und „Rindfleisch“ in Frage 3 entfallen. Was schon in einer früheren Frage angegeben ist (z. B. „Kein Alkohol“), bietet Frage 3 nicht noch einmal an.

**Datenmodell.** Fleischkarten und Gerichte tragen neben `meat` die Fleischart (`pork`, `beef` für Rind und Kalb, `poultry`). Gerichte tragen `ingredientData` (`complete` oder `partial`; partial, solange Zutaten je nach Rezept offen sind).

### Annahmen [V], vom Team einzeln bestätigt (Freigabe AP1)

1. **Halal-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Kein Alkohol.
2. **Koscher-Vorschläge:** Kein Schweinefleisch, Keine Gelatine, Keine Meeresfrüchte.
3. Halal und koscher betreffen auch Zubereitung, Schlachtung und Zertifizierung. Das kann die App nicht prüfen und behauptet es nicht. Ohne bestätigten Vorschlag wirkt eine Speisevorschrift nicht auf die Karten.

### Weitere Annahmen [V], zur Bestätigung

4. **Gelatine** steht nur als Vorschlag bei einer Speisevorschrift, nicht als eigener Punkt in Teil B: Der Katalog hat heute keine Karte mit Gelatine. Die Angabe wird trotzdem gespeichert und gilt, sobald Karten das Tag tragen.
5. **Fleisch unbekannter Art:** Eine Karte mit `meat`, aber ohne Fleischart fällt weg, sobald irgendeine Fleischart ausgeschlossen ist. Heute betrifft das keine Karte (Test prüft es).
6. **Frühere Antworten** (gespeicherte Sitzungen bleiben unverändert, sie werden nur anders gelesen): „Kein Schweinefleisch“ wird zu „Keine besondere Ernährungsform“ plus Schweinefleisch und Gelatine; „Kein Fisch“ zu Fisch und Meeresfrüchte. Die übrigen Formen bleiben gleich.
7. **Lamm** ist als Fleischart vorgesehen (`MEAT_KINDS`), der Katalog hat aber keine Lammkarte und keinen Punkt in Teil B.

### Protokoll und Export

- `onboarding.dietaryRules` (z. B. `["halal"]`) im Protokoll, im CSV als Spalte `dietaryRules`. Die Spalte `diet` enthält die Ernährungsform.
- Speisevorschriften können Rückschlüsse auf Überzeugungen erlauben. Mit `PRIVACY.logDietaryRules = false` (src/config.js) werden sie nicht protokolliert. Ob sie in der Studie protokolliert werden dürfen, ist mit der Einwilligung zu klären (offen).
- **Ereignistyp:** Eine zusätzliche Spalte `eventType` gibt es nicht. Die bestehende Spalte `type` enthält den Ereignistyp jeder Zeile (ANSWER, UNDO, EXCLUSION_ADDED …) und erfüllt die Anforderung (Teamentscheid, Freigabe AP1).

## Befunde für das Team

- **?limit:** Der URL-Parameter deckt nicht mehr 4 bis 30 ab, sondern nur noch 4 bis 15 (`ROUND_CARD_LIMIT_RANGE.max = 15` seit dem Stufenablauf vom 18.10.). Werte über 15 fallen still auf den Standard 13 zurück; gespeicherte Sitzungen mit mehr als 15 werden auf 15 gekürzt (`cardLimit`). Für einen Vergleich mit mehr Karten pro Runde müsste das Maximum angehoben werden (Teamentscheid).
- **Mobil-Check** (scripts/check-mobile.py): erwartete nach Runde 4 noch einen eigenen Schritt „Gerichte bewerten“. Seit dem Stufenablauf ist Runde 4 selbst die Gerichte-Runde; der Schritt ist im Skript jetzt optional.
