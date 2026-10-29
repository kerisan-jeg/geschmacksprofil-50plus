# 04 Profilberechnung

Stand 26.10.2026. Beobachtungen aus `src/logic/engine.js`, `src/logic/preferences.js`, `src/logic/dashboard.js`, `src/logic/cuisines.js`, `src/logic/profile.js` und den zugehörigen Tests.

## 1. Vier getrennte Ergebnisse

Das „Geschmacksprofil“ ist keine einzelne Zahl, sondern vier getrennt berechnete Dinge, die das Dashboard nebeneinander zeigt:

| Ergebnis | Funktion | Grundlage |
|---|---|---|
| Direkte Bewertungen | `engine.js → computeProfile()`, `buildProfile()` | die letzte direkte Antwort je Karte |
| Vermutungen | `preferences.js → predictScores()`, `engine.js → derivedEntries()` | Modellwerte, vererbt von Gruppe zu Untergruppe zu Lebensmittel |
| Profilstand „Profil aufgebaut“ | `dashboard.js → profileProgress()` | Anteil erfasster Gruppen, Zweige und Lebensmittel |
| Dashboard-Listen | `dashboard.js → buildDashboard()`, `cuisines.js → cuisineTendencies()` | direkte Bewertungen, nach Kategorie und Kartenart sortiert |

Es gibt keine Gewichtung über Runden, keinen Gesamtscore und keine Statistik über Personen in der App; die Lernkurve rechnet `src/analysis/evaluation.js` erst aus den Exporten.

## 2. Direkte Bewertungen

**Wirksame Bewertung je Karte** (`engine.js → applyEvents()`): die Antwort beim Wischen oder, falls später im Profil geändert, die letzte `RATING_CHANGED`-Änderung (`ratings`). Wird die Antwort beim Wischen rückgängig gemacht, gelten auch Profiländerungen dazu nicht mehr. „Aus dem Profil entfernen“ setzt die Bewertung auf `null`; die Karte zählt für die Runde weiterhin als beantwortet. Eine im Profil bestätigte Vermutung (`fromPrediction: true`) wird zur direkten Bewertung einer sonst nie gezeigten Karte (`profileRated`) und wird danach nicht mehr gefragt.

`computeProfile()` gruppiert die bewerteten Karten in `PREFER`, `LIKE`, `DISLIKE`, `UNFAMILIAR`, dazu `intolerant` und `removed`. `buildProfile()` ergänzt `unrated` (sichtbare Gruppen ohne Antwort), `predicted`, `diet`, `exclusions` und `ruleVersion`; genau dieses Objekt wird am Ende jeder Runde in die Sitzung geschrieben (`App.jsx → logger.finish()`) und nach Profiländerungen aktualisiert (`logger.updateProfile()`).

Beobachtung: Eine Gruppenbewertung überträgt sich nie als Bewertung auf Mitglieder; eine Gerichtsbewertung nie auf Zutaten (`engine.test.js: Gerichte werden nach zulässigen Vorlieben sortiert und übertragen keine Bewertung …`).

## 3. Vermutungen (Präferenzmodell)

`config.js → PREFERENCE_MODEL`: Gewichte `DISLIKE −1`, `LIKE +1`, `PREFER +2`, `inheritFactor 0.5`, `siblingWeight 0`, `stageWeights` 1 auf allen Stufen (ohne Wirkung). Alle Zahlen sind Annahmen [V].

`predictScores(index, ratings)` liefert je Karte `{ score, direct, basisId }`:

- direkt bewertet: `score = Gewicht × stageWeight`, `direct: true`;
- sonst: nächste bewertete Karte darüber (`inherited()`), `score = deren Wert × 0.5 ^ Abstand`, `basisId` = diese Karte;
- keine Vermutung für `COMPOSITE_FOOD` und `DISH` und für Karten ohne bewerteten Vorfahren;
- „Kenne ich nicht“ und „Vertrage ich nicht“ haben keinen Wert und werden beim Hochlaufen übersprungen: Die Sorte erbt dann von der Gruppe darüber (`preferences.test.js`).

Beispiel (Obst → Beeren → Erdbeeren):

| Antwort auf Obst | Beeren (Stufe 2) | Erdbeeren (Stufe 3) | Richtung |
|---|---|---|---|
| Eher gern (+1) | +0.5 | +0.25 | vermutlich gern |
| Sehr gern (+2) | +1 | +0.5 | vermutlich gern (nie „sehr“) |
| Eher ungern (−1) | −0.5 | −0.25 | vermutlich nicht |
| Kenne ich nicht | keine | keine | |
| Beeren direkt „Mag ich nicht“ bei Obst „Eher gern“ | −1 (direkt) | −0.5 (aus Beeren) | Erdbeeren vermutlich nicht |

`predictedRating(score)`: Vorzeichen entscheidet, 0 oder fehlend heisst unentschieden. Ohne Geschwister hängt die Richtung nur am Vorzeichen der nächsten bewerteten Karte; Gewichte und Faktor ändern nur die Reihenfolge (Test `preferences.test.js: Die Richtung hängt nicht an den angenommenen Zahlen`).

`derivedEntries(state)` zeigt im Profil nur Karten ab Stufe 2, die sichtbar, nicht beantwortet und keine offene Kontrollkarte sind, stärkste zuerst (Betrag des Scores, dann Katalogreihenfolge). Je Eintrag steht die Begründung („Vermutet, weil du Obst besonders magst“). Beobachtung aus den Szenarien: 97, 69 und 102 Vermutungen, weil fast jede unbewertete Karte einen bewerteten Vorfahren hat; die Oberfläche zeigt fünf je Richtung und „Alle anzeigen“.

Die Vermutungen gehen in die Kartenauswahl nicht ein (`selection.js` nutzt nur `currentRating()`), wohl aber in die Reihenfolge der Gerichte (Abschnitt 6) und in die Lernkurve.

## 4. Sichtbarer Fortschritt und analytischer Erfassungsgrad

Die Oberfläche zeigt unter „Dein Fortschritt“ den Ablauf der vier Swipe-Runden (`engine.js → creationProgress(state, config)`). Jede Runde trägt 25 Prozentpunkte bei. In der laufenden Runde zählt der Anteil beantworteter Karten, einschliesslich „Kenne ich nicht“ und „Vertrage ich nicht“. Beim Weitergehen zählen frühere Runden als durchlaufen. Nach Abschluss der vierten Runde werden 100 % angezeigt, auch bei einem angepassten Kartenlimit oder weniger erlaubten Gerichten. Sind wegen Ausschlüssen keine weiteren Karten vorhanden, ist der Ablauf ebenfalls abgeschlossen. Ein Abbruch mit offenen Karten erhöht den Fortschritt nicht; Rückgängig öffnet den letzten Platz wieder. Gespeicherte Sitzungen werden aus ihren Antworten neu berechnet.

Die folgende Berechnung nach Anhang B2 bleibt als analytischer Erfassungsgrad erhalten; sie bestimmt die sichtbare Fortschrittsanzeige nicht mehr.

`profileProgress(state)` nach nurec Anhang B2, Gewichte `PROFILE_PROGRESS = { stage1: 35, stage2: 30, stage3: 35, stage3Target: 12 }`:

| Teil | Formel | Was zählt | Was nicht zählt |
|---|---|---|---|
| Stufe 1 (bis 35) | 35 × Anteil der sichtbaren Gruppen mit Geschmacksantwort | DISLIKE, LIKE, PREFER | UNFAMILIAR, INTOLERANT, ausgeschlossene Gruppen (sie sind nicht relevant) |
| Stufe 2 (bis 30) | 30 × Mittel des Zweigkredits über alle Gruppen mit nutzbaren Untergruppen | Zweigkredit: Gruppe unbewertet 0; UNFAMILIAR oder INTOLERANT: 1, sobald ein Kind eine Geschmacksantwort hat; DISLIKE: Ausnahme beantwortet (0 oder 1); LIKE/PREFER: beantwortete Karten des Kontrastpaars geteilt durch 2 | Gruppen ohne Untergruppen (Eier, Kartoffeln) sind kein Zweig |
| Stufe 3 (bis 35) | 35 × min(1, Lebensmittel mit Geschmacksantwort / 12) | konkrete Karten der Stufe 3 | Gerichte |

`percent` ist die gerundete Summe, höchstens 100. `stage` (höchste abgeschlossene Stufe): 1, wenn jede sichtbare Gruppe beantwortet ist; 2, wenn zusätzlich keine Klärung, Ausnahme oder Kontrastkarte mehr offen ist (`rankedCards()` enthält keinen Eintrag mit diesen Gründen).

Nachgerechnet an Szenario A ([02](02_Kartenauswahl_und_Swipe_Logik.md)): 12 von 13 Gruppen mit Geschmacksantwort (Fisch unbekannt) → 35 × 12/13 = 32.3; Zweige: 11 Gruppen mit Untergruppen, Kredit u. a. Fisch 1 (Klärung beantwortet), Hülsenfrüchte 1, Nüsse 1, Fleisch 0.5, Milchprodukte 0.5, Brot 0.5, Pasta 0.5, Obst 0, Reis 0, Salat 0, Gegartes Gemüse 0 → 5/11 × 30 = 13.6; 13 Lebensmittel mit Geschmacksantwort, mehr als das Ziel 12 → 35. Summe 80.9 → **81 %**, `stage` 1.

Beobachtung: Der Wert misst Erfassung, nicht Zustimmung. Szenario C erreicht 89 % mit fast nur „Mag ich nicht“. Der Wert sinkt durch neue Antworten nie (Test T12), kann aber durch neue Ausschlüsse im Profil fallen, weil sich die Menge der relevanten Karten ändert (nicht getestet).

## 5. Dashboard

`buildDashboard(state)` (nur direkte Bewertungen):

| Feld | Inhalt |
|---|---|
| `responses`, `summary` | die vier Antwortkategorien mit Kartenart (Gruppe, Lebensmittel, Gericht); Basis der Balken „Dein Geschmack“ |
| `favorites` | **nur konkrete Karten** (ohne Kinder, keine Gerichte) mit „Mag ich sehr“ (zuerst) oder „Mag ich“; Eier und Kartoffeln zählen als konkret |
| `groups` | Gruppen und Untergruppen mit „Mag ich sehr“ oder „Mag ich“ |
| `dislikes` | „Mag ich nicht“ mit positiv bewerteten Nachkommen als Ausnahmen |
| `unfamiliar` | „Kenne ich nicht“ ohne Gerichte; Gerichte stehen in `responses` |
| `unasked` | sichtbare Gruppen, die nie gefragt wurden |
| `details` | roh gegenüber gegart (`variantOf`), nur wenn beide beantwortet und verschieden |
| `dishes` | Gerichte mit Geschmacksantwort |
| `cuisines` | Tendenz je Küche ab `CUISINE_MIN_RATED = 3` bewerteten Gerichten: Vorzeichen des Mittels der Gewichte, „gemischt“ bei 0; Unterküchen zählen für „asiatisch“ |

Die Oberfläche (`ProfileScreen.jsx`) zeigt zuerst die Anzahl Antworten und vier Balken (Anteil je Kategorie), dann den Profilstand mit nächstem Schritt, dann aufklappbar „Weitere Einblicke“ (Vermutungen, noch nicht gefragt, Feinheiten, Küchen), „Ausschlüsse“ (das frühere „Alltag“ ist seit dem 28.10.2026 entfernt).

## 6. Gerichte

Auswahl und Reihenfolge in Runde 4 (`engine.js → openDishes()` und `selectNextCards()`): Zutaten-Zuneigung = Mittelwert über die verknüpften Zutatenkarten (`ingredients`) der jeweils nächsten direkten Bewertung im Baum (−1, +1, +2; ohne Bewertung 0, keine Abschwächung je Stufe). Konkrete Bewertungen aus Runde 3 haben Vorrang vor Untergruppen aus Runde 2 und Gruppen aus Runde 1. Alle erlaubten Gerichte werden absteigend nach Zuneigung sortiert, gleiche Werte in Katalogreihenfolge; vorgeschlagen werden nur die besten verbleibenden Plätze im gemeinsamen Kartenlimit, standardmässig insgesamt 13 (Regelversion `demo-0.9`). Beispiel aus Szenario B: Frühlingsrollen und Ratatouille zuerst, weil ihre Zutaten zu „Gegartes Gemüse“ (+2) gehören. Die Antwort auf ein Gericht ist eine eigene Bewertung und bleibt es; Gerichte zählen nicht zum Profilstand.

## 7. Änderungen im Profil

| Aktion | Ereignis | Wirkung |
|---|---|---|
| Bewertung ändern | `RATING_CHANGED { cardId, rating, previousRating }` | neue wirksame Bewertung für Auswahl, Vermutungen, Dashboard; die Karte wird nicht erneut gefragt |
| Aus dem Profil entfernen | `RATING_CHANGED { rating: null }` | Karte in keiner Kategorie, bleibt beantwortet; Vermutung für diese Karte erscheint wieder (sie ist nicht `done`) |
| Vermutung bestätigen | `RATING_CHANGED { fromPrediction: true, predictedScore }` | wird zur direkten Bewertung, die Vermutung vorher bleibt im Log |
| Allergie oder Ausschluss hinzufügen oder entfernen | `EXCLUSION_ADDED` / `EXCLUSION_REMOVED` mit `section` | Sichtbarkeit sofort neu, auch Kontrollkarten und Gerichte |
| Ernährungsform ändern | `DIET_CHANGED` | wie Frage 1 |

Alle Profiländerungen tragen `source: profile`; nur solche verändern das Profil (`profile.test.js`).

## 8. Was protokolliert wird

Je Sitzung `profile` mit `ruleVersion`, `taste` (PREFER, LIKE, DISLIKE), `unfamiliar`, `unrated`, `intolerant`, `removed`, `predicted` (`cardId`, `score`, `basisId`), `diet`, `exclusions` (mit `status check`), `progress` (`percent`, `points`, `stage`); `medical`, `scope` und `practical` gibt es seit dem 28.10.2026 nicht mehr. Mit `PRIVACY.logExclusionValues = false` bleiben von den Ausschlüssen nur Typ und Herkunft.

## 9. Nachvollziehbarkeit

Alles ist deterministisch und aus dem Export nachrechenbar: `src/analysis/evaluation.js → prepareSession()` spielt das Log mit denselben Funktionen (`replay`, `deriveRoundState`, `predictScores`) nach. Test T11 zeigt identische Profile bei identischen Eingaben, T12 die Konsistenz zwischen Antworten, Profil und Dashboard.

## 10. Grenzen (Einschätzung, Details in 08)

Der Profilstand misst Erfassung und wird in Runde 3 schnell voll (zwölf Lebensmittel). Die Vermutungen sind grob (nur Vorzeichen, Geschwister zählen nicht) und zahlreich. „Sehr gern“ auf eine Gruppe wird nie als „sehr“ vererbt. Alle Gewichte sind unbelegte Annahmen; erst die Kontrollkarten der Studie liefern einen Massstab.
