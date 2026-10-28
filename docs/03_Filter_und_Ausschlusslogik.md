# 03 Filter- und Ausschlusslogik

Stand 26.10.2026. Beobachtungen aus `src/logic/stage0.js`, `src/logic/filter.js`, `src/logic/engine.js → applyEvents()` und den Tests `filter.test.js`, `diet.test.js`, `stage0.test.js`, `profile.test.js`, neu `studienszenarien.test.js` (T02 bis T05, T10, T13 bis T15).

## 1. Grundsatz im Code

- Ein Ausschluss steht über jedem Geschmack: `isVisible()` wird vor jeder Auswahl angewendet, in jeder Runde, für Kontrollkarten, Gerichte, Vermutungen, Bilder und Beispiele.
- Eine negative Geschmacksbewertung (`DISLIKE`) erzeugt nie einen Ausschluss (`answers.js → hardExclusion: false`; Tests T07, T16).
- „Vertrage ich nicht“ (`INTOLERANT`) erzeugt einen Ausschluss und ist nie ein Geschmackssignal (`isTasteSignal()` ist false; `tasteSignals()` und `computeProfile()` führen es getrennt).
- Der Zustand wird bei jedem Rendern aus dem Log neu berechnet; es gibt keinen Ort, an dem ein Ausschluss „vergessen“ werden könnte.

## 2. Woher Ausschlüsse kommen

| Quelle | Eingabe | Erzeugte Einträge (`type:value`) | Code |
|---|---|---|---|
| Frage 1, Teil A Ernährungsform | none, pescetarian, vegetarian, vegan | kein Eintrag; `diet` wird über die Tabelle `diets` in `stage0.json` zu `animalOrigin`-Ausschlüssen: pescetarisch meat, gelatin; vegetarisch meat, fish, seafood, gelatin; vegan zusätzlich dairy, egg, honey | `filter.js → dietExclusions()`, `buildExclusions()` |
| Frage 1, Teil B Einzelausschlüsse | Kein Schweinefleisch, Rindfleisch, Geflügel, Fisch, Meeresfrüchte, Alkohol | `animalOrigin:pork` (schliesst `animalOrigin:gelatin` ein), `beef`, `poultry`, `fish`, `seafood`, `food:Alkohol`; `origin: diet` | `stage0.js → deriveOnboarding()`, `withIncluded()` |
| Frage 1, Teil C Speisevorschriften | halal, koscher | **keine**; nur Vorschläge, die die Person in Teil B einzeln bestätigt (halal: Schwein, Gelatine, Alkohol; koscher: Schwein, Gelatine, Meeresfrüchte). `dietaryRules` wird gespeichert, standardmässig nicht protokolliert | `DietPicker.jsx`, `PRIVACY.logDietaryRules` |
| Frage 2 Allergien und Unverträglichkeiten | sechs Kacheln (Gluten, Laktose, Milcheiweiss, Nüsse, Eier, Soja), Suche über alle 14 Hauptallergene, Detailauswahl bei Nüssen und Gluten | `allergen:<id>` granular (z. B. `hazelnut`; „Alle Nüsse“ = neun IDs inklusive `peanut`; „Alles mit Gluten“ = wheat, spelt, rye, barley, oats). Seit dem 28.10.2026 ohne `medical` und `scope`: Laktose ist immer ein voller Ausschluss | `deriveOnboarding()`, `allergens.js` |
| Frage 2 Suche nach Lebensmitteln | Treffer `card:…` oder `food:…` | `card:F05.3` (Karte samt Nachkommen) oder `food:Tomate` (Wort); `card:F01.3` wird zu `animalOrigin:pork` (`canonicalKey()`, `restrictionTag` im Katalog) | `stage0.js → keyEntry()` |
| Frage 2 und 3 Notizen (kein Treffer) | eingetippter Text | `food:<Text>` mit `freeText: true`, Status „prüfen“ | `noteEntry()` |
| Frage 3 Nie vorschlagen | Schnellauswahl (Meeresfrüchte, Tofu und Soja, Alkohol), Suche, Notizen (Marken und Herkunft seit dem 28.10.2026 entfernt) | `animalOrigin:seafood`, `card:F05.4`, `food:Alkohol`, weitere Treffer wie in Frage 2 | `deriveOnboarding()` |
| Wischen „Vertrage ich nicht“ | Karte ohne Kinder: die Karte; Familienkarte: Detailauswahl | `card:<id>` je gewähltem Eintrag, `source: swipe`, `origin: <Karte>`; „alle gewählt“ wird zur Familie zusammengefasst (`collapseIntolerance()`) | `engine.js → swipeEntries()`, `RoundScreen.jsx` |
| Mein Profil | Allergien ändern, Ernährungsform, Suche, Einzelausschlüsse | `EXCLUSION_ADDED` / `EXCLUSION_REMOVED` mit `section`, `source: profile`; `DIET_CHANGED` | `App.jsx → profileHandlers`, `engine.js → applyEvents()` |

Jeder Eintrag hat die Form `{ type, value, source, origin, label, freeText?, includedBy?, selectedAs? }` (`filter.js`, Kopfkommentar; `medical` und `scope` gibt es seit dem 28.10.2026 nicht mehr). Die Herkunft bleibt sichtbar („Angegeben im Onboarding / beim Wischen / im Profil“).

## 3. Technische Verdichtung

`filter.js → buildExclusions(entries, { diet, diets, index })` bildet vier Mengen:

| Menge | Inhalt |
|---|---|
| `allergens` | alle `allergen`-Werte |
| `animalOrigin` | Werte aus der Ernährungsform plus alle `animalOrigin`-Einträge |
| `cardIds` | alle `card`-Werte **und alle ihre Nachkommen** (`catalog.js → descendantIds()`) |
| `foods` | alle `food`-Wörter |

## 4. Entscheidung je Karte

`filter.js → isAllowed(card, exclusions)` prüft in dieser Reihenfolge; die erste zutreffende Regel verbirgt die Karte:

1. Karten-ID in `cardIds` (eigener Ausschluss oder Ausschluss eines Vorfahren).
2. Ein Allergen-Tag der Karte in `allergens`.
3. Ein `animalOrigin`-Tag in `animalOrigin`.
4. Karte trägt `meat` ohne Fleischart und irgendeine Fleischart (`pork`, `beef`, `poultry`, `lamb`) ist ausgeschlossen (betrifft heute keine Karte, Test in `diet.test.js`).
5. Eine verknüpfte Zutatenkarte (`ingredients`) in `cardIds` (Gerichte und zusammengesetzte Produkte).
6. Ab Stufe 3: Name oder ein Wort aus `ingredientNames` passt zu einem `food`-Eintrag (`foodMatches()`: wortweise, ohne Umlaute und Grossschreibung, ab vier Buchstaben auch als Wortanfang, „Tomate“ trifft „Tomaten“).

`isVisible(card, index, exclusions)`: zusätzlich die Familienregel. Eine Karte mit Kindern ist nur sichtbar, wenn mindestens ein Kind sichtbar ist. Dadurch verschwindet „Fisch und Meeresfrüchte“ bei vegetarisch, obwohl die Gruppenkarte selbst keine Tags trägt; bei Haselnussallergie bleibt „Nüsse und Samen“ sichtbar, nur Haselnüsse fehlen (Test T02).

## 5. Beziehungen zwischen Lebensmitteln, Zutaten und Kategorien

| Ebene | Wie ein Ausschluss wirkt |
|---|---|
| Kategorie (Gruppe, Untergruppe) | über die Kinder (Familienregel) oder über einen `card`-Ausschluss der Kategorie selbst, der alle Nachkommen mitnimmt |
| Lebensmittel (Stufe 3) | über eigene Tags, über einen `card`-Ausschluss von sich oder einem Vorfahren, über ein `food`-Wort im Namen oder in `ingredientNames` (z. B. „Tomate“ → Rohe Tomaten) |
| Zusammengesetztes Produkt (Hummus, Falafel, Fruchtjoghurt) | wie Lebensmittel, zusätzlich über `ingredients` (Hummus → Kichererbsen F05.3, Sesam F13.2.3) |
| Gericht (Stufe 4) | über Tags (`allergens`, `animalOrigin`, Fleischart), über `ingredients` (z. B. Spaghetti Bolognese → Spaghetti, Rindsgehacktes, Schwein) und über `ingredientNames` (Wein → „Alkohol“) |
| Bild | ein Foto zeigt nie Ausgeschlossenes: `lib/images.js → isImageAllowed()` prüft `shows` (Karten) und `foods` (Wörter) des Bildes; sonst Platzhalter oder nur die erlaubten Teilbilder |
| Beispiele und Titel | `annotateCard()`: Beispiele nur aus sichtbaren Kindern, Hinweise „Ohne Haselnüsse“, zusammengesetzte Titel verkürzt („Fisch“ statt „Fisch und Meeresfrüchte“) |

Zutaten sind doppelt beschrieben: `ingredients` (Karten-IDs, für Karten-Ausschlüsse) und `ingredientNames` (Wörter, für eingetippte Lebensmittel). Allergen- und Tier-Tags der Gerichte sind unabhängig davon direkt gesetzt.

## 6. Mehrere Einschränkungen gleichzeitig

Alle Einträge werden vereinigt (Mengen), es gibt keine Rangfolge und keinen Konflikt: Jede Einschränkung verbirgt zusätzlich. „Was schon ausgeschlossen ist, wird nicht nochmals angeboten“: `stage0.js → createRedundancyCheck()` deaktiviert in Frage 2 und 3 Kacheln, Suchtreffer und Chips, deren Karten durch frühere Angaben bereits alle verborgen sind (z. B. Schweinefleisch bei vegetarisch); gleiche Angaben aus Frage 1 (Alkohol) werden in Frage 3 nicht wiederholt. Im Profil dasselbe über `redundancyFor()`. Vegetarisch plus „Kein Schweinefleisch“ ergibt eine Regel, nicht zwei; nach einem Wechsel auf „keine“ gilt Schwein wieder (`diet.test.js`).

Nachgerechnet (`openDishes`, `isVisible`, Skript in der Analyse, Werte in Test T03, T04, T19):

| Angaben | Gruppen | Untergruppen | Lebensmittel | Gerichte sichtbar |
|---|---|---|---|---|
| keine | 13 | 36 | 96 | 22 (13 gezeigt) |
| vegetarisch | 11 | 30 | 80 | 12 |
| vegan | 9 | 27 | 69 | 4 |
| pescetarisch | 12 | 33 | 88 | 14 |
| kein Schweinefleisch | 13 | 35 | 93 | 19 |
| Laktose | 12 | 33 | 86 | 7 |
| Milcheiweiss | 12 | 33 | 86 | 7 |
| alles mit Gluten | 12 | 30 | 81 | 8 |
| nur Weizen | 13 | 32 | 83 | 10 |
| Eier | 12 | 36 | 94 | 17 |
| Sellerie | 13 | 36 | 95 | 14 |
| Haselnuss | 13 | 36 | 95 | 21 |
| alle Nüsse inkl. Erdnuss | 13 | 35 | 88 | 20 |
| vegetarisch + Laktose | 10 | 27 | 70 | 4 |
| vegan + Gluten | 8 | 21 | 58 | 2 |
| Laktose + Gluten + Eier | 10 | 27 | 74 | 3 |
| Meeresfrüchte (Frage 3) | 13 | 34 | 92 | 21 |
| Notiz „Tomate“ | 13 | 36 | 95 | 15 |
| halal, drei Vorschläge bestätigt | 13 | 35 | 93 | 16 |

Laktose entfernt die ganze Gruppe Milchprodukte (auch Hartkäse und Weichkäse, die konservativ mit Laktose getaggt sind, `todo` im Katalog) und drei Brote (Zopf, Toastbrot, Vollkorntoast).

## 7. Fehlende oder unvollständige Zutateninformationen

- 34 Karten tragen `todo` (unsichere Zuordnung, bewusst konservativ getaggt). 15 der 22 Gerichte haben `ingredientData: partial`. Konservativ heisst: Im Zweifel ist das Tag gesetzt, die Karte fällt eher weg.
- Erdnuss, Honig und Gelatine haben keine eigene Karte. Eine Erdnussallergie wirkt nur auf Pad Thai (Tag `peanut`); „Keine Gelatine“ wirkt heute auf keine Karte (Test in `filter.test.js` mit künstlichen Karten zeigt, dass die Regel bereitsteht).
- Eingetippte Notizen (Status „prüfen“) wirken nur über Wortvergleich auf Stufe 3 und 4 und schliessen nie eine Gruppe aus; die App sagt das in der Zusammenfassung und im Profil (`ONBOARDING.allergyNoteEffect`).
- „Kleine Mengen gehen“ (Laktose) und das Unsicherheits-Kästchen in Frage 2 gibt es seit dem 28.10.2026 nicht mehr; Laktose ist ein vollständiger Ausschluss (nurec 0.3; Test `stage0.test.js`), alte Antworten mit diesen Feldern bleiben wirkungslos.

## 8. Geschmackliche Abneigung gegenüber zwingendem Ausschluss

| | Abneigung („Mag ich nicht“) | Ausschluss (Allergie, Ernährungsform, „Vertrage ich nicht“, „Nie vorschlagen“) |
|---|---|---|
| Speicherung | `ANSWER` mit `response: DISLIKE`, Wert −1 | `ExclusionEntry` in `entries`, verdichtet in `exclusions` |
| Wirkung auf Karten | Rang nach hinten, nie unsichtbar | unsichtbar in allen Runden, Beispielen, Bildern, Gerichten |
| Wirkung auf Profil | Kategorie „Mag ich nicht“, Ausnahmen möglich | Abschnitt „Ausschlüsse“, getrennt vom Geschmack |
| Zählt als Geschmack | ja | nie |
| Änderbar | im Profil (Bewertung ändern) | im Profil (entfernen mit Bestätigung bei Allergien) |

Beide können sich widersprechen, ohne dass es ein Problem ist: Wer Käse ausschliesst und Milchprodukte „Mag ich sehr“ wischt, bekommt Milchprodukte-Karten ohne Käse. Es gibt keine Stelle, an der ein Geschmackswert einen Ausschluss aufhebt (Tests: `engine.test.js: Meeresfrüchte bleiben in allen vier Runden …`, T02 bis T05, T14).

## 9. Konsequenz über alle Runden

Beobachtung, geprüft: Jede Runde ruft `selectNextCards()` auf demselben `deriveRoundState()` auf, Vermutungen (`derivedEntries()`) und Kontrollkarten (`openHoldout()`) filtern ebenfalls über `isVisible()`, Gerichte über `openDishes()`. Ein im Profil nachträglich hinzugefügter Ausschluss entfernt auch eine gezogene Kontrollkarte (`selection.test.js: Kontrollkarten teilen das Budget …`). Ein im Profil entfernter Ausschluss macht die Karten wieder sichtbar, auch in späteren Runden (`profile.test.js`).

Testfälle, die gesperrte Lebensmittel oder Gerichte verhindern: `filter.test.js` (vegan, vegetarisch, pescetarisch, Haselnuss, alle Nüsse, Laktose gegenüber Milcheiweiss, Karten-Ausschluss mit Nachkommen, Gerichte mit ausgeschlossener Zutat, Hummus bei Sesam, kein Schweinefleisch mit Gelatine), `diet.test.js` (Frage 1 in drei Teilen, halal, koscher, Legacy, „ein Weg je Restriktion“), `engine.test.js` (Meeresfrüchte in allen Runden und Auswahlverfahren), `image-credits.test.js` (Bilder zeigen nie Ausgeschlossenes), neu T02, T03, T04, T05, T10, T13, T14, T15.

## 10. Wirkung auf die Anzeige

- Gruppenkarten zeigen bei teilweisem Ausschluss Hinweise „Ohne Haselnüsse“, bei mehr als zwei „Ohne Zopf“ und „und 2 weitere“ (`CARD_NOTES.more`). Ein Hinweis erscheint nur, wenn der angezeigte Titel das Ausgeschlossene noch umfasst (Dozentenfeedback, Verbesserung 1).
- Zusammengesetzte Titel verkürzen sich (`titleParts`): „Fisch“ ohne Meeresfrüchte, „Geflügel“ ohne Rind und Schwein.
- Der Hinweis nutzt die Wörter der Person (`cardLabels`) oder `restrictionLabel` („Ohne Schweinefleisch“).

## 11. Befunde

**B1 (wichtig): „Vertrage ich nicht“ beim Wischen wirkt kartenbasiert, Allergien im Onboarding tagbasiert.** Beobachtung (Test T15): Nach „Vertrage ich nicht“ auf der Karte Eier (F03) bleiben Zopf, Bandnudeln, Lasagne, Wienerschnitzel und Gemüsewähe sichtbar (sie tragen das Tag `egg`, verknüpfen aber nicht die Karte F03); Rösti mit Spiegelei fällt weg (verknüpft F03). Nach Onboarding-Allergen „Eier“ fallen alle sechs weg. Nach „Vertrage ich nicht“ auf Milchprodukte bleiben 14 Gerichte, davon 7 mit Milch-Tag (Butter, Rahm); mit Laktose im Onboarding bleiben 7. Das ist so dokumentiert (`filter.js`: `type card` schliesst „die Karte und alle Nachkommen“ aus, plus `ingredients`), widerspricht aber dem Satz in `answers.js` („Wie Stufe 0: gilt für alle folgenden Runden“) in der Wirkung. Ursache: Die Karte „Eier“ ist eine Gruppe ohne Tag-Verknüpfung zu den Gerichten; die Gerichte kennen Ei nur als Allergen-Tag und als Wort in `ingredientNames`. **Offen:** Soll „Vertrage ich nicht“ auf einer Karte zusätzlich deren Tags (hier `egg`, `dairy`, `lactose`, `milk_protein`) ausschliessen? Vorschlag in [08_Anwendungslogik_Bewertung.md](08_Anwendungslogik_Bewertung.md).

**B4: Konservatives Tagging verkürzt die Gerichte-Runde stark** (Abschnitt 6, Tabelle). Das ist beabsichtigt (nurec: fehlende Information ist keine Sicherheit), führt aber bei den häufigsten Angaben zu 7 oder weniger Gerichten.

**B5: „und 2 weitere“ nennt nicht, was fehlt.** Die Person sieht auf der Gruppenkarte „Ohne Zopf; und 2 weitere“ (Szenario B). Einschätzung: verständlich genug für die Studie, für eine spätere Version besser die vollständige Liste in der Detailansicht.

Nicht gefunden: eine Stelle, an der ein ausgeschlossenes Lebensmittel als Vermutung, Favorit, Kontrollkarte, Beispiel oder Gericht wieder auftaucht, sofern der Ausschluss über Tags oder Karten-IDs erfasst ist.
