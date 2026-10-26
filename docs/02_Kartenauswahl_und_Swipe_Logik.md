# 02 Kartenauswahl und Swipe-Logik

Stand 26.10.2026, Regeln `demo-0.6` (`src/logic/engine.js`), Auswahl `src/logic/selection.js`. Alles Beobachtung aus dem Code und aus ausgeführten Tests (`src/logic/selection.test.js`, `src/logic/engine.test.js`, neu `src/logic/studienszenarien.test.js`), Einschätzungen sind markiert.

## 1. Grundprinzip

1. **Runde = Ebene.** Runde 1 zeigt nur Gruppen (Stufe 1), Runde 2 nur Untergruppen (Stufe 2), Runde 3 nur konkrete Lebensmittel (Stufe 3), Runde 4 nur Gerichte (Stufe 4). Eine gröbere Karte wandert nie in eine spätere Runde (`engine.js → selectNextCards()`, `selection.js → rankedStageCards()`).
2. **Kartenlimit je Runde:** 13 (URL `?limit=4…15`, absolut höchstens 15). Die Runde endet, wenn das Limit erreicht ist oder keine passende Karte mehr übrig ist. Es gibt keine Füllkarten.
3. **Keine Vorbereitung, keine Zwischenspeicherung.** Nach jeder Antwort wird die Kartenliste aus dem Event-Log neu berechnet (`deriveRoundState()` → `selectNextCards()`). Die Oberfläche nimmt immer die erste Karte der Liste (`RoundScreen.jsx`, `queue[0]`), die zweite liegt sichtbar dahinter.
4. **Zufall nur an einer Stelle:** die Ziehung der sechs Kontrollkarten nach „Stimmt so“ (`holdout.js → drawHoldout()`), deterministisch aus der `sessionId`. Alles andere ist deterministisch (Test T11).
5. **Keine Karte doppelt:** Beantwortete Karten gelten als erledigt (`selection.js → isDone()`); `replay()` wertet nur die erste gültige Antwort je Karte.
6. **Ausschlüsse wirken vor jeder Auswahl** (`filter.js → isVisible()`), auch auf Kontrollkarten und Gerichte.

### Antworten auf die Untersuchungsfragen aus 4.1

| Frage | Beobachtung |
|---|---|
| Welche Karten stehen zur Verfügung? | 167 Karten in `catalog.json`: 13 Gruppen, 36 Untergruppen, 96 Lebensmittel, 22 Gerichte, abzüglich der durch Stufe 0 oder „Vertrage ich nicht“ ausgeschlossenen. |
| Wie wird Runde 1 ausgewählt? | Alle sichtbaren Gruppen in Katalogreihenfolge F01 bis F13 (`selection.js → rankedCards()`, Tier `family`). Ohne Ausschlüsse genau 13, also alle, auch beim Standardlimit 13. |
| Alle Karten oder Vorauswahl? | Vorauswahl: Je Runde kommen nur Karten, die eine Regel vorschlägt (Abschnitt 3 bis 5). Was keine Regel trifft, wird nicht gefragt, sondern vermutet. |
| Feste oder dynamische Anzahl? | Obergrenze fest (13), tatsächliche Anzahl dynamisch: so viele, wie Regeln und Ausschlüsse ergeben, höchstens das Limit. |
| Zufällige Reihenfolge? | Nein. Innerhalb eines Rangs wechseln sich die Gruppen ab (`interleave()`), nach jeder Antwort ausgeglichen nach „wie viele Karten dieser Gruppe wurden in dieser Runde schon gefragt“ (`balance()`). |
| Priorisierung nach bisherigen Entscheidungen? | Ja, ab Runde 2 vollständig: Rangfolge in Abschnitt 3. Massgebend ist die aktuelle direkte Bewertung je Karte, auch wenn sie im Profil geändert wurde (`selection.js → currentRating()`). |
| Kriterien? | Bewertung der Gruppe (Runde 2), der Untergruppe (Runde 3), Zutatenvorlieben (Runde 4), Sichtbarkeit, Kontrollkartenstatus, Kartenlimit. |
| Ausschluss möglich? | Ja: Stufe 0, „Vertrage ich nicht“, Profil. Eine negative Bewertung schliesst nie aus. |
| Mehrfach erscheinen? | Nein. |
| Vorbereitung der nächsten Runde? | Keine eigene Vorbereitung. `nextRoundNumber()` prüft nach jeder Runde, welche der folgenden Runden noch Karten hätte; leere Ebenen werden übersprungen. Der Abschluss zeigt die ersten drei Titel der nächsten Runde (`nextRoundCards()`). |

## 2. Runde 1: Gruppen

Alle sichtbaren Gruppen in Katalogreihenfolge, Grund `stage1_family`. Mit `?r1scale=3` (Standard) lauten die Begriffe „Eher ungern / Eher gern / Sehr gern“, mit 2 fehlt „Sehr gern“ samt Wischen nach oben. Intern bleibt es `DISLIKE / LIKE / PREFER`. Gruppen zeigen seit dem 21.10.2026 wieder ein Foto aus drei Beispielen (`GROUP_IMAGES = true`), keine Beispieltexte.

Antworten in Runde 1 verändern die Reihenfolge in Runde 1 nicht; „Kenne ich nicht“ erzeugt die Klärungskarte erst in Runde 2 (Test `selection.test.js: „Kenne ich nicht“ wird auf der nächsten Ebene …`).

## 3. Runde 2: Untergruppen und Kontrollkarten

`rankedCards()` geht jede Gruppe durch und ordnet deren Untergruppen nach der Antwort auf die Gruppe einem Rang zu. Danach werden die Ränge zusammengefügt; innerhalb eines Rangs wechseln sich die Gruppen ab.

| Rang | Antwort auf die Gruppe | Karten | `selectionReason` |
|---|---|---|---|
| 1 | Kenne ich nicht | eine verbreitete Untergruppe (erstes sichtbares Kind); bei erneutem „Kenne ich nicht“ in derselben Runde eine zweite; nie eine dritte | `stage2_after_unfamiliar` |
| 2 | (Gruppe noch nicht gefragt) | kommt in Runde 2 nicht vor, weil Runde 2 nur Stufe 2 zeigt | `stage1_family` |
| 3 | Mag ich nicht | die plausible Ausnahme (`exceptionCandidate` im Katalog), genau eine | `stage2_exception` |
| 4 | Mag ich oder Mag ich sehr | das Kontrastpaar (`contrastPair`), zwei Untergruppen | `stage2_contrast` |
| 7 | Mag ich / Mag ich sehr, Kontrast verschieden beantwortet | die übrigen Untergruppen dieser Gruppe | `stage2_difference` |
| 7 | Vertrage ich nicht, nur für einen Teil | höchstens zwei der übrigen Untergruppen | `stage2_after_intolerant` |
| 8 | Mag ich nicht | die übrigen Untergruppen, ganz am Schluss (`NEGATIVE_GROUP_POLICY = 'last'`) | `stage2_after_negative` |

Ränge 5 und 6 betreffen Stufe 3 und kommen in Runde 2 nicht zum Zug. Ist eine Kontrollkarte Teil eines Kontrastpaars oder die Ausnahme, rückt das nächste sichtbare Kind nach (`usableChildren()`); die Kontrollkarte selbst wird nie in der normalen Auswahl gezeigt.

**Ausnahmen und Kontrastpaare je Gruppe** (aus `catalog.json`):

| Gruppe | Ausnahme bei „Mag ich nicht“ | Kontrastpaar bei „Mag ich“ |
|---|---|---|
| F01 Fleisch und Geflügel | Geflügel | Geflügel, Schwein |
| F02 Fisch und Meeresfrüchte | Krebstiere | Fisch, Krebstiere |
| F03 Eier | keine (keine Untergruppen) | keine |
| F04 Milchprodukte | Käse | Joghurt und Quark, Käse |
| F05 Hülsenfrüchte | Sojaprodukte | Linsen, Sojaprodukte |
| F06 Brot | Knäckebrote | Helle Brote, Vollkornbrote |
| F07 Pasta | Klassische Pasta | Klassische Pasta, Vollkornpasta |
| F08 Reis und andere Getreide | Reis | Reis, Couscous und Bulgur |
| F09 Kartoffeln | keine | keine |
| F10 Salat und Rohkost | Rohes Fruchtgemüse | Blattsalate, Rohes Fruchtgemüse |
| F11 Gegartes Gemüse | Wurzelgemüse | Kohlgemüse, Fruchtgemüse |
| F12 Obst | Kernobst | Beeren, Zitrusfrüchte |
| F13 Nüsse und Samen | Kerne und Samen | Baumnüsse, Kerne und Samen |

**Kontrollkarten.** Nach „Stimmt so“ zieht `drawHoldout()` sechs Untergruppen, höchstens eine je Gruppe, nur aus sichtbaren Karten. Sie erscheinen am Ende von Runde 2 in der gezogenen Reihenfolge und teilen sich das Limit mit den normalen Karten: `main = ranked.slice(0, remaining − offeneKontrollkarten)`. Mit Limit 13 bleiben also **7 Plätze für normale Untergruppen**. Fällt eine Kontrollkarte durch einen Ausschluss weg, geht der Platz an eine normale Karte (Test T18).

**Beobachtung zum Budget (Test T20):** Elf der 13 Gruppen haben Untergruppen. Wer alle Gruppen mit „Eher gern“ beantwortet, hätte 22 Kontrastkarten offen; Runde 2 fragt davon 7. Die übrigen Paare bleiben halb oder ganz offen, Stufe 2 gilt im Profilstand nie als abgeschlossen, und `stage2_difference` kommt praktisch nie zum Zug. Siehe Befund B3 in [08_Anwendungslogik_Bewertung.md](08_Anwendungslogik_Bewertung.md).

## 4. Runde 3: konkrete Lebensmittel

`rankedStageCards(state, 'adaptive', 3)` setzt drei Listen hintereinander (`selection.js`, ab Zeile 238):

1. **Aus den Regeln** (`rankedCards()`, nur Stufe-3-Einträge), in dieser Reihenfolge der Ränge:
   - Rang 1: Untergruppe „Kenne ich nicht“ (deren Gruppe nicht „Kenne ich nicht“ war) → bis zu zwei Lebensmittel, `stage3_after_unfamiliar`.
   - Rang 5: Ausnahme mit „Mag ich“ oder „Mag ich sehr“ → bis zu zwei Lebensmittel daraus (`EXCEPTION_DETAIL_LIMIT = 2`), `stage3_exception_detail`; Kontrastpaar verschieden beantwortet → je das erste offene Lebensmittel beider Untergruppen, nur solange dort noch keines beantwortet ist, `stage3_difference`.
   - Rang 6: Untergruppe „Mag ich sehr“ → bis zu drei Lebensmittel (`FAVORITE_LIMIT = 3`), `stage3_favorite`.
2. **Je bewertete Untergruppe** (`extra`): Jede Untergruppe mit Antwort „Mag ich“, „Mag ich sehr“, „Kenne ich nicht“ oder „Vertrage ich nicht“ erhält bis zu zwei Lebensmittel (bei „Mag ich sehr“ drei), Grund `stage3_detail` bzw. `stage3_after_unfamiliar`. Untergruppen, die nie gefragt wurden, bekommen hier nichts.
3. **Negative Zweige** (`negative`): Untergruppen mit „Mag ich nicht“ oder nie gefragte Untergruppen einer Gruppe mit „Mag ich nicht“ → bis zu `NEGATIVE_GROUP_QUOTA_STAGE3 = 2` Lebensmittel, `stage3_after_negative`, ganz am Schluss.

Jede Liste wird nach Gruppen ausgeglichen (`balance()`), Karten doppelter Herkunft zählen einmal. Auch als Kontrollkarte beantwortete Untergruppen zählen als bewertet und liefern Lebensmittel für Runde 3.

Folge: Eine Untergruppe, die in Runde 2 nicht gefragt wurde (Kontrast gleich, Budget erschöpft, Kontrollkarte nicht gezogen), erhält in Runde 3 keine Lebensmittel, es sei denn, ihre Gruppe war negativ. Ihre Lebensmittel werden nur vermutet.

## 5. Runde 4: Gerichte

`engine.js → openDishes()`: alle sichtbaren, noch nicht beantworteten Gerichte, sortiert nach Zutatenaffinität, bei Gleichstand Katalogreihenfolge; dann die ersten `remaining` (Limit 13). Affinität = Mittelwert der Modellwerte (`preferences.js → predictScores()`) über die verknüpften Zutatenkarten (`ingredients`), fehlende Werte zählen 0. Beispiel: Reis „Sehr gern“ und Fleisch „Eher ungern“ bringen Gemüsecurry mit Reis nach vorn und Wienerschnitzel ans Ende (Test T19).

Eine Gerichtsantwort bleibt eine Gerichtsbewertung: Sie wird nie auf Zutaten übertragen, und Gerichte werden nie vermutet (`predictScores()` überspringt `DISH` und `COMPOSITE_FOOD`). Gerichte zählen nicht zum Profilstand. Nach Runde 4 gibt es keine weitere Runde.

**Warum oft nur etwa sieben Gerichte?** Beobachtung (Test T19): Das Limit ist 13, aber 15 der 22 Gerichte tragen die Tags `lactose` und `milk_protein` (konservativ getaggt, z. B. Butter in Rösti mit Spiegelei, Rahm in der Gerstensuppe). Wer in Frage 2 Laktose oder Milcheiweiss angibt (beide gehören zu den sechs Kacheln), sieht genau 7 Gerichte: Chili con Carne, Wienerschnitzel, Gemüsecurry, Minestrone, Pad Thai, Frühlingsrollen, Ratatouille. Weitere Zahlen in [03_Filter_und_Ausschlusslogik.md](03_Filter_und_Ausschlusslogik.md), Abschnitt 10, Empfehlung zu zehn Gerichten in [08_Anwendungslogik_Bewertung.md](08_Anwendungslogik_Bewertung.md), Abschnitt 5.

## 6. Wirkung jeder Antwort (4.2)

Jede Antwort erzeugt ein `ANSWER`-Ereignis mit `cardId`, `stage`, `kind`, `parentId`, `round`, `positionInRound`, `phase` (main, holdout, dish), `response`, `timestamp`, `responseTimeMs`, `inputMethod` (swipe, button, link, keyboard), `selectionReason`, `ruleVersion`, `alternatives` (bis zu fünf Karten, die stattdessen gekommen wären), `labelShown`, `scaleVariant`, `imageShown`, `imageSource`, bei Gerichten `cuisines`, bei „Vertrage ich nicht“ `excludedCardIds` (`App.jsx → record()`).

| Antwort | Gespeichert | Bewertung der Karte | Verwandte Karten (Vermutung) | Ganze Gruppe | Nächste Runde | Profil |
|---|---|---|---|---|---|---|
| Eher ungern / Mag ich nicht (`DISLIKE`) | Ereignis, Wert −1 | ja | Nachkommen ohne eigene Antwort erben −0.5 je Stufe | kein Ausschluss, nur Vermutung | Gruppe: Ausnahme in Runde 2 (Rang 3), übrige Untergruppen Rang 8; Untergruppe: in Runde 3 bis 2 Lebensmittel am Schluss | „Mag ich nicht“ mit Ausnahmen darunter; zählt für Stufe 1 bzw. 3 des Profilstands |
| Eher gern / Mag ich (`LIKE`) | Ereignis, Wert +1 | ja | Nachkommen erben +0.5 je Stufe | nur Vermutung | Gruppe: Kontrastpaar (Rang 4); Untergruppe: bis 2 Lebensmittel in Runde 3; Lebensmittel: nichts mehr | „Mag ich“; konkrete Karten als Favoriten |
| Sehr gern / Mag ich sehr (`PREFER`) | Ereignis, Wert +2 | ja | Nachkommen erben +1 je Stufe (nie als „sehr“ vermutet) | nur Vermutung | Gruppe: **gleich wie Mag ich** (Test T21); Untergruppe: bis 3 Lebensmittel (Rang 6); Gerichte rücken durch die höhere Affinität vor | „Mag ich sehr“ zuerst in Listen |
| Kenne ich nicht (`UNFAMILIAR`) | Ereignis, kein Wert | keine Bewertung | keine Vermutung aus dieser Karte; Nachkommen erben von der nächsten bewerteten Karte darüber | nein | Gruppe: eine Klärungskarte, bei erneutem „Kenne ich nicht“ eine zweite (Runde 2); Untergruppe: bis 2 Lebensmittel in Runde 3 (siehe Befund B2) | „Kenne ich nicht“, keine Punkte |
| Vertrage ich nicht (`INTOLERANT`) | Ereignis mit `excludedCardIds`, Ausschluss-Einträge `type card`, `source swipe` | keine Bewertung | Karte und gewählte Nachkommen unsichtbar; Gerichte mit diesen Karten als `ingredients` ebenfalls | bei Familienkarten Detailauswahl: ganze Gruppe oder einzelne Einträge | wirkt in allen folgenden Runden; bei Teil-Ausschluss bis 2 übrige Untergruppen (`stage2_after_intolerant`) | unter „Ausschlüsse → Vertrage ich nicht (beim Wischen)“, im Profil entfernbar |
| Rückgängig (`UNDO`) | eigenes Ereignis | letzte Antwort der laufenden Runde entfällt | Ausschluss daraus entfällt | | Karte kommt sofort wieder (Test T17) | wie vor der Antwort |

Zuordnung zu Gesten und Knöpfen: links = `DISLIKE`, rechts = `LIKE`, oben oder mittlerer Knopf = `PREFER`, Knopf „Kenne ich nicht“, Textlink „Vertrage ich nicht“ (`AnswerButtons.jsx`, `SwipeCard.jsx`, Tasten ←, →, ↑, K in `RoundScreen.jsx`). Jede Antwort zählt fürs Rundenlimit (`answers.js → countsTowardLimit`), auch „Kenne ich nicht“ und „Vertrage ich nicht“.

## 7. Abhängigkeiten zwischen den Runden (4.3)

| Untersuchungsfrage | Beobachtung |
|---|---|
| Führt eine positive Gruppenbewertung später zu mehr passenden Lebensmitteln? | Ja, in drei Schritten: Runde 2 fragt das Kontrastpaar; jede dort positiv bewertete Untergruppe bringt in Runde 3 zwei (bei „Mag ich sehr“ drei) Lebensmittel; Runde 4 sortiert Gerichte mit diesen Zutaten nach vorn. Untergruppen ausserhalb des Kontrastpaars werden nur gefragt, wenn das Paar verschieden ausfiel und das Limit Platz lässt. |
| Werden negativ bewertete Gruppen reduziert oder ausgeschlossen? | Reduziert, nie ausgeschlossen (seit `demo-0.6`): Runde 2 fragt die Ausnahme an dritter Stelle und die übrigen Untergruppen nur, wenn nach allen anderen Karten Platz bleibt; Runde 3 höchstens zwei Lebensmittel je negativer Untergruppe, am Schluss. Gerichte mit diesen Zutaten rutschen nach hinten, bleiben aber dabei. Test T07, T16. |
| Werden Unterkategorien aufgrund übergeordneter Bewertungen priorisiert? | Ja: Die Rangfolge hängt ausschliesslich an der Bewertung der übergeordneten Karte (Abschnitte 3 und 4). Eine Untergruppe, die nie gefragt wurde, bekommt in Runde 3 keine Lebensmittel (ausser über den negativen Pfad). |
| Können sich Entscheidungen widersprechen? | Ja, und beide bleiben gespeichert: „Salat und Rohkost: eher ungern“ und „Gurke: mag ich“. Die Auswahl und das Profil nutzen die direkte Bewertung der konkreten Karte; das Dashboard zeigt die Gurke als Ausnahme unter der Gruppe (`dashboard.test.js: Widersprüchliche Bewertungen …`). Die Vermutung für Geschwister (z. B. Tomaten) bleibt bei der Gruppe, weil Geschwister im Standardmodell nicht zählen (`siblingWeight = 0`). |
| Werden frühere Bewertungen überschrieben oder ergänzt? | Beim Wischen nie überschrieben (eine Antwort je Karte). Im Profil ersetzt `RATING_CHANGED` die wirksame Bewertung (`engine.js → applyEvents()`), die ursprüngliche Antwort bleibt im Log. Die Auswahl folgt der geänderten Bewertung (`selection.test.js: Die Regeln folgen der aktuellen Bewertung …`). „Aus dem Profil entfernen“ setzt die Bewertung auf null; die Karte zählt für die Runde weiterhin als beantwortet. |
| Wie geht die Anwendung mit unbekannten Lebensmitteln um? | „Kenne ich nicht“ ist keine Bewertung: kein Wert, keine Vermutung aus dieser Karte, keine Punkte. Die App versucht höchstens zwei Klärungen auf der nächsten Ebene (Runde 2) und je unbekannter Untergruppe bis zwei Lebensmittel (Runde 3). Bleibt alles unbekannt, bleibt der Zweig im Profil unter „Kennst du nicht“. |
| Wie werden Präferenzen verschiedener Runden kombiniert? | Nicht verrechnet, sondern geschichtet: Jede Karte hat höchstens eine direkte Bewertung. Für unbewertete Karten gilt die nächste bewertete Karte darüber, pro Stufe halbiert (`preferences.js`). Eine konkrete Bewertung gilt immer vor einer vermuteten. Gerichte stehen ganz getrennt. |

**Was keine Wirkung auf spätere Runden hat** (Beobachtung): „Sehr gern“ gegenüber „Eher gern“ auf einer Gruppe (gleiche Karten in Runde 2 und 3, nur Gerichte-Reihenfolge und Vermutungsstärke anders, Test T21); jede Antwort auf ein Lebensmittel der Stufe 3 (nur Gerichte-Reihenfolge und Profil); jede Antwort auf ein Gericht (nur Profil); Antworten auf Kontrollkarten (sie zählen aber als bewertete Untergruppe für Runde 3 und als Vorwissen für die Lernkurve nicht).

## 8. Ablaufbeispiele (4.4)

Die drei Szenarien sind **tatsächlich ausgeführte Testfälle**: `src/test/szenarien.js` spielt sie wie die App ab, Test T23 in `src/logic/studienszenarien.test.js` prüft die Kartenfolge exakt, `node scripts/ablauf-beispiele.mjs` druckt sie. Konfiguration: Standard (Limit 13, adaptiv, 6 Kontrollkarten). Die Kontrollkarten hängen an der `sessionId` (`szenario-a`, `szenario-b`, `szenario-c`); mit einer anderen ID wären es andere Untergruppen.

### Szenario A: Marianne, 68, keine Einschränkungen

Ausgangslage: Frage 1 „Keine besondere Ernährungsform“, Frage 2 „Keine bekannt“, Frage 3 „Nein“. Mag fast alles, Obst sehr gern, Hülsenfrüchte und Nüsse eher ungern, Fisch kennt sie kaum. Kontrollkarten: Zitrusfrüchte, Reis, Knäckebrote, Kerne und Samen, Vollkornpasta, Käse.

| Runde 1 (13 Gruppen, Katalogreihenfolge) | Antwort |
|---|---|
| Fleisch und Geflügel, Eier, Milchprodukte, Brot, Pasta, Reis und andere Getreide, Kartoffeln, Salat und Rohkost, Gegartes Gemüse | Eher gern |
| Fisch und Meeresfrüchte | Kenne ich nicht |
| Hülsenfrüchte, Nüsse und Samen | Eher ungern |
| Obst | Sehr gern |

| Pos. | Runde 2 | Grund | Antwort |
|---|---|---|---|
| 1 | Fisch | `stage2_after_unfamiliar` (Klärung nach „Kenne ich nicht“) | Mag ich |
| 2 | Sojaprodukte | `stage2_exception` (Ausnahme zu Hülsenfrüchte) | Mag ich |
| 3 | Baumnüsse | `stage2_exception` (Ausnahme zu Nüsse) | Mag ich |
| 4 | Geflügel | `stage2_contrast` (Fleisch) | Mag ich |
| 5 | Joghurt und Quark | `stage2_contrast` (Milchprodukte) | Mag ich |
| 6 | Helle Brote | `stage2_contrast` (Brot) | Mag ich |
| 7 | Klassische Pasta | `stage2_contrast` (Pasta) | Mag ich |
| 8 bis 13 | Zitrusfrüchte, Reis, Knäckebrote, Kerne und Samen, Vollkornpasta, Käse | `holdout_check` | Mag ich nicht, dann fünfmal Mag ich |

Auswirkung: Der zweite Teil der Kontrastpaare (Schwein, Vollkornbrote) und das Obst-Kontrastpaar wurden nicht gefragt, das Budget war mit sieben Plätzen erschöpft. Käse, Vollkornpasta und Reis kamen nur als Kontrollkarten.

| Pos. | Runde 3 | Grund | Antwort |
|---|---|---|---|
| 1 | Naturtofu | `stage3_exception_detail` (Sojaprodukte gefielen) | Mag ich sehr |
| 2 | Haselnüsse | `stage3_exception_detail` (Baumnüsse gefielen) | Mag ich |
| 3 | Tempeh | `stage3_exception_detail` | Mag ich |
| 4 | Walnüsse | `stage3_exception_detail` | Mag ich |
| 5 bis 13 | Poulet, Lachs, Naturjoghurt, Zopf, Spaghetti, Basmatireis, Truthahn, Kabeljau, Skyr | `stage3_detail` (je positiver Untergruppe bis 2, Gruppen abwechselnd) | Mag ich |

| Runde 4 (Gerichte nach Affinität) | Antwort |
|---|---|
| Älplermagronen, Rösti mit Spiegelei, Raclette, Gemüsewähe, Gemüsecurry, Poulet-Curry, Frühlingsrollen, Enchiladas, Birchermüesli, Käsefondue, Pilzrisotto, Eglifilets, Zürcher Geschnetzeltes | Mag ich |

Ergebnis: Profilstand 81 % (Stufe 1: 32.3 Punkte, weil Fisch unbekannt blieb; Stufe 2: 13.6, weil die meisten Kontrastpaare offen blieben; Stufe 3: 35, weil 12 Lebensmittel erreicht sind). Dashboard: Favorit Naturtofu („Mag ich sehr“), 14 weitere konkrete Favoriten; Hülsenfrüchte und Nüsse als „eher ungern“ mit Ausnahmen Sojaprodukte, Naturtofu, Tempeh, Baumnüsse, Haselnüsse, Walnüsse, Kerne und Samen; Küchentendenz Schweizer Küche eher gern (8 Gerichte), asiatisch eher gern (3). 97 Vermutungen (z. B. Beeren, Kernobst, Steinobst, Tropisches Obst „vermutlich gern“, weil Obst „Sehr gern“).

### Szenario B: Peter, 74, vegetarisch und laktoseintolerant

Ausgangslage: Frage 1 „Vegetarisch“, Frage 2 „Ja“ mit Laktose, Frage 3 „Nein“. Mag fast alles, Rohkost eher ungern, gegartes Gemüse sehr gern, Gerichte kennt er oft nicht. Kontrollkarten: Knäckebrote, Steinobst, Wurzelgemüse, Vollkornpasta, Blattsalate, Couscous und Bulgur.

Runde 1 zeigt 10 Gruppen: Fleisch, Fisch und Milchprodukte fehlen. Die Karte Brot trägt den Hinweis „Ohne Zopf“ und „und 2 weitere“ (Toastbrot und Vollkorntoast sind mit Laktose getaggt). Antworten: Salat und Rohkost eher ungern, Gegartes Gemüse sehr gern, alle anderen eher gern.

| Pos. | Runde 2 | Grund | Antwort |
|---|---|---|---|
| 1 | Rohes Fruchtgemüse | `stage2_exception` (Ausnahme zu Salat und Rohkost) | Mag ich |
| 2 bis 7 | Linsen, Helle Brote (Hinweis „Ohne Zopf; Ohne Toastbrot“), Klassische Pasta, Reis, Kohlgemüse, Beeren | `stage2_contrast` | Mag ich, Kohlgemüse Mag ich sehr |
| 8 bis 13 | Knäckebrote, Steinobst, Wurzelgemüse, Vollkornpasta, Blattsalate, Couscous und Bulgur | `holdout_check` | Mag ich |

| Pos. | Runde 3 | Grund | Antwort |
|---|---|---|---|
| 1, 2 | Rohe Tomaten, Gurke | `stage3_exception_detail` | Mag ich |
| 3 bis 5 | Broccoli, Blumenkohl, Rosenkohl | `stage3_favorite` (Kohlgemüse „Mag ich sehr“) | Mag ich |
| 6 bis 13 | Rote Linsen, Baguette, Spaghetti, Basmatireis, Erdbeeren, Grüne Linsen, Roggenknäcke, Hörnli | `stage3_detail` | Mag ich |

Runde 4 zeigt nur **vier** Gerichte (vegetarisch und laktosefrei): Frühlingsrollen (Kenne ich nicht), Gemüsecurry (Mag ich), Minestrone (Kenne ich nicht), Ratatouille (Mag ich sehr). Reihenfolge: Frühlingsrollen zuerst, weil ihre einzige verknüpfte Zutat „Gegartes Gemüse“ mit +2 bewertet ist.

Ergebnis: Profilstand 85 % (35 + 15 + 35), keine Küchentendenz (keine Küche erreicht drei bewertete Gerichte), 69 Vermutungen. Salat und Rohkost „eher ungern“ mit Ausnahmen Blattsalate, Rohes Fruchtgemüse, Tomaten, Gurke.

### Szenario C: Ruth, 59, Haselnussallergie, überwiegend ungern

Ausgangslage: Frage 2 „Ja“ mit Haselnuss. Beim Wischen „Vertrage ich nicht“ bei Eiern. Mag Brot, Kartoffeln, Käse und Helle Brote, sonst alles eher ungern. Kontrollkarten: Linsen, Wurzelgemüse, Milch, Beeren, Rind, Helle Brote.

Runde 1: 13 Gruppen, Nüsse und Samen mit Hinweis „Ohne Haselnüsse“. Eier → Vertrage ich nicht (Karte ohne Kinder, also direkt ausgeschlossen, Hinweis „Wir schlagen dir Eier nicht mehr vor“).

| Pos. | Runde 2 | Grund | Antwort |
|---|---|---|---|
| 1 bis 7 | Geflügel, Krebstiere, Käse, Sojaprodukte, Klassische Pasta, Reis, Rohes Fruchtgemüse | `stage2_exception` (je eine Ausnahme je negativer Gruppe, Gruppen abwechselnd) | Mag ich nicht, Käse Mag ich |
| 8 bis 13 | Linsen, Wurzelgemüse, Milch, Beeren, Rind, Helle Brote | `holdout_check` | Mag ich nicht, Helle Brote Mag ich |

Die Ausnahmen für Obst, Gegartes Gemüse, Brot (gern) und Nüsse kamen nicht mehr: sieben Plätze, elf Gruppen mit Untergruppen.

| Pos. | Runde 3 | Grund | Antwort |
|---|---|---|---|
| 1, 2 | Hartkäse, Weichkäse | `stage3_exception_detail` (Käse gefiel) | Mag ich nicht |
| 3, 4 | Zopf, Toastbrot | `stage3_detail` (Helle Brote gefielen) | Mag ich nicht |
| 5 bis 13 | Poulet, Lachs, Rote Linsen, Spaghetti, Basmatireis, Kopfsalat, Broccoli, Erdbeeren, Walnüsse | `stage3_after_negative` (je eine je negativer Untergruppe, Gruppen abwechselnd) | Mag ich nicht |

Runde 4: 13 Gerichte, beginnend mit Älplermagronen (Mag ich), dann Raclette, Pizza, Eglifilets, Zürcher Geschnetzeltes, Wienerschnitzel, Lasagne, Käsefondue, Enchiladas, Ratatouille, Chili con Carne, Gerstensuppe, Bolognese (alle Mag ich nicht).

Ergebnis: Profilstand 89 % trotz überwiegender Ablehnung (der Wert misst Erfassung, nicht Zustimmung). Favorit nur Kartoffeln; Küchentendenz Schweizer und italienische Küche eher ungern. **Beobachtung (Befund B1):** Zopf (enthält Ei) kam in Runde 3 und Wienerschnitzel, Lasagne (beide mit Ei) in Runde 4, obwohl Ruth bei Eiern „Vertrage ich nicht“ gewählt hatte. Der Ausschluss wirkt über die Karte „Eier“ und über Gerichte, die diese Karte als Zutat verknüpfen (Rösti mit Spiegelei fehlt), nicht über das Allergen-Tag `egg`. Details in [03_Filter_und_Ausschlusslogik.md](03_Filter_und_Ausschlusslogik.md), Abschnitt 11.

## 9. Feste Reihenfolge (`?selection=fixed`)

Als Vergleich im Pilot: Runde 1 Gruppen in Katalogreihenfolge, Runde 2 die Untergruppen abwechselnd (erstes Kind jeder Gruppe, dann zweites), Runde 3 alle Lebensmittel bewerteter Untergruppen, Runde 4 Gerichte; Kontrollkarten ebenfalls am Ende von Runde 2 (`selection.js → fixedOrder()`, `rankedStageCards()` mit `mode !== 'adaptive'`). Gespeicherte Sitzungen ohne Angabe laufen fest. Die Studie sollte nur eines der beiden Verfahren verwenden (siehe 09).

## 10. Kurzfassung

- Runde 1 ist für alle gleich (bis auf Ausschlüsse). Erst ab Runde 2 wirkt die Antwort: unbekannt → klären, ungern → eine Ausnahme testen, gern → zwei Kontraste testen.
- Runde 3 vertieft nur, was in Runde 2 bewertet wurde: zwei Lebensmittel je positiver Untergruppe, drei bei „Mag ich sehr“, Ausnahmen und Unterschiede zuerst, negative Zweige zuletzt.
- Runde 4 ist eine sortierte Liste der erlaubten Gerichte, keine adaptive Auswahl im engeren Sinn.
- Sieben normale Plätze in Runde 2 sind der Engpass des gesamten Verfahrens.
