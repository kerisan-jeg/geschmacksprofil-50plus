# 01 Systemübersicht

Stand 26.10.2026, Commit `60bc8c5`, Regeln `demo-0.6`. Alle Angaben sind Beobachtungen aus dem Code, sofern nicht als Einschätzung markiert.

## 1. Was der Prototyp ist

Eine React-Anwendung (React 19, Vite 8) ohne eigenen Server. Alles läuft im Browser des Testgeräts: Fragebogen, Kartenauswahl, Profilberechnung, Protokoll und Export. Daten liegen ausschliesslich im `localStorage` des Geräts. Es gibt keine Netzwerkverbindung zu Dritten; der frühere SMS-Versand über Firebase ist seit dem 28.10.2026 entfernt.

Es gibt keine Datenbank, kein Backend, kein maschinelles Lernen und keine Produkt- oder Rezeptdaten. „Anwendungslogik“ heisst in diesem Projekt: reine JavaScript-Funktionen in `src/logic/`, die im Frontend ausgeführt werden. Sie sind ohne Browser testbar, und genau diese Funktionen werden in den Dokumenten 02 bis 04 beschrieben.

## 2. Ablauf aus Sicht der Testperson

| Schritt | Bildschirm (`src/screens/`) | Was passiert |
|---|---|---|
| 1 | StartScreen | Einführung in drei Sätzen |
| 2 | RegisterName | Anmeldung nur mit dem Vornamen (nur mit `AUTH_ENABLED = true`, Standard); seit dem 28.10.2026 ohne Handynummer und SMS-Code. Der Vorname steht als `participantName` in der Sitzung und im Export für die Testleitung (`PRIVACY.logParticipantName`) |
| 3 | AboutScreen | Altersgruppe (Pflicht), Einwilligung als Kästchen mit kleinem Text unter den Altersfeldern (Pflicht), Teilnehmer-Nr. (für die Testleitung) |
| 4 | QuestionnaireScreen | Stufe 0: drei Fragen, je ein Bildschirm (Ernährungsform mit Einzelausschlüssen und zugeklappten Speisevorschriften; Allergien und Unverträglichkeiten ohne Zusatzangaben; „Nie vorschlagen“ ohne Marken und Herkunft; Stand 28.10.2026) |
| 5 | SummaryScreen | „Stimmt das so?“: alle festen Regeln, „Ändern“ je Frage, „Stimmt so“ |
| 6 | RoundScreen | Runde 1: Lebensmittelgruppen (bis 13 Karten) |
| 7 | CompleteScreen | Abschluss mit Zählung der Antworten, Profilstand, Rundenübersicht, „Weiter mit Runde 2“ |
| 8 | RoundScreen / CompleteScreen | Runde 2: Untergruppen und Kontrollkarten; Runde 3: einzelne Lebensmittel; Runde 4: alle passenden Gerichte ohne Kartenlimit, nach zehn Gerichten „Runde beenden“ (seit dem 28.10.2026) |
| 9 | ProfileScreen | „Mein Profil“: Antwortkategorien, Profilstand, Vermutungen, Ausschlüsse; Bearbeiten möglich. Das Alltagsprofil (PracticalScreen) ist seit dem 28.10.2026 entfernt |

Zusätzlich: WelcomeBackScreen (gespeicherter Stand auf demselben Gerät), IntroScreen (Tutorial, standardmässig aus), AdminScreen (`?admin=1`: Sitzungen, Export, „Neue Testperson starten“).

## 3. Architektur in Schichten

```
Daten (JSON)            src/data/catalog.json, stage0.json, allergens.json, cuisines.json, foods.json
Logik (rein)            src/logic/*.js         Auswahl, Filter, Profil, Vermutungen, Kontrollkarten, Dashboard
Zustand                 src/app/model.js       Bildschirmwechsel als Reducer; Event-Log als einzige Quelle der Wahrheit
Oberfläche              src/App.jsx, src/screens/, src/components/   React, Texte nur aus src/labels.js
Protokoll und Export    src/logging/logger.js, export.js             Sitzung in localStorage, JSON und CSV
Auswertung              src/analysis/evaluation.js, scripts/evaluate.mjs   Lernkurve aus den Exporten
```

### 3.1 Event-Log als einzige Quelle der Wahrheit

Jede Antwort beim Wischen ist ein Ereignis (`ANSWER`), ebenso Rückgängig (`UNDO`), Profiländerungen (`RATING_CHANGED`, `EXCLUSION_ADDED`, `EXCLUSION_REMOVED`, `DIET_CHANGED`), die gezogenen Kontrollkarten (`HOLDOUT_DRAWN`), Abbrüche (`QUESTION_ABORTED`), das Alltagsprofil (`PRACTICAL_SAVED`), Navigation (`NAVIGATION`) und die Registrierung (`AUTH_STARTED`, `AUTH_COMPLETED`). Typen und Felder: `src/logic/events.js`.

Der Zustand einer Runde wird nie gespeichert, sondern bei jedem Rendern aus dem Log neu abgeleitet: `src/logic/engine.js → deriveRoundState()` ruft `replay()` (gültige Antworten nach Rückgängig) und `applyEvents()` (Ausschlüsse, Ernährungsform und Bewertungsänderungen in zeitlicher Reihenfolge) auf. Folge: Oberfläche, Profil und Protokoll können nicht auseinanderlaufen, und jedes Profil lässt sich aus dem Export nachrechnen. Nichts wird gelöscht; Rückgängig ist ein eigenes Ereignis.

### 3.2 Datenmodell der Karten

`src/data/catalog.json` enthält 209 Karten (seit dem 29.10.2026, davon 64 Gerichte) in einem Baum über `parentId` und `children`:

| Stufe | Anzahl | Beispiel | Besonderheit |
|---|---|---|---|
| 1 Gruppe (`FAMILY`) | 13 | Obst | `exceptionCandidate`, `contrastPair`, teils `titleParts` (zusammengesetzte Namen wie „Fisch und Meeresfrüchte“) |
| 2 Untergruppe (`SUBGROUP`) | 36 | Beeren | zwei Untergruppen ohne Kinder (Milch F04.3, Quinoa F08.3); Fleischuntergruppen tragen `restrictionTag` |
| 3 konkret (`SIMPLE_FOOD`, `COMPOSITE_FOOD`) | 96 | Erdbeeren, Hummus | Blöcke 3.1 bis 3.7; `variantOf` für roh/gegart; zusammengesetzte Produkte mit `ingredients` |
| 4 Gericht (`DISH`) | 22 | Pizza Margherita | ohne Elternkarte; `ingredients` (Karten-IDs), `ingredientNames` (Wörter), `cuisines`, `ingredientData` complete oder partial |

Eier (F03) und Kartoffeln (F09) sind Gruppen ohne Untergruppen. Jede Karte ohne Kinder trägt Tags `allergens` (granulare IDs aus `allergens.json`) und `animalOrigin` (`meat`, `pork`, `beef`, `poultry`, `fish`, `seafood`, `dairy`, `egg`, `honey`, `gelatin`). Karten mit Kindern tragen keine eigenen Tags; ihre Sichtbarkeit folgt aus den Kindern (`src/logic/catalog.js → validateCatalog()` prüft das). 34 Karten sind mit `todo` markiert (unsichere Allergen-Zuordnung, konservativ getaggt).

Weitere Daten: `stage0.json` (Fragen und Tabelle `diets`), `allergens.json` (14 Hauptallergene, sechs davon als Kacheln), `cuisines.json` (acht Küchen, „asiatisch“ als Oberbegriff), `practical.json` (Alltagsfragen), `brands.json` (Händler und Marken, ohne Wirkung), `foods.json` (rund 560 Lebensmittel der Schweizer Nährwertdatenbank, nur für die Suche).

### 3.3 Antworten

| Intern | Knopf oder Geste | Runde 1 (Gruppen) | Runden 2 bis 4 | Bedeutung (`src/logic/answers.js`) |
|---|---|---|---|---|
| `DISLIKE` | links | Eher ungern | Mag ich nicht | Geschmack, kein Ausschluss |
| `LIKE` | rechts | Eher gern | Mag ich | Geschmack |
| `PREFER` | oben oder mittlerer Knopf | Sehr gern (entfällt mit `?r1scale=2`) | Mag ich sehr | Geschmack, stärker |
| `UNFAMILIAR` | Knopf | Kenne ich nicht | Kenne ich nicht | keine Bewertung |
| `INTOLERANT` | Textlink | Vertrage ich nicht | Vertrage ich nicht | harter Ausschluss, kein Geschmack |
| `UNDO` | „Rückgängig“ oben rechts | | | nimmt die letzte Antwort der laufenden Runde zurück |

Welcher Begriff gezeigt wurde, steht in jedem Ereignis als `labelShown` und `scaleVariant` (`src/logic/scale.js`). Die Zuordnung Geste zu Antwort ist in `src/logic/swipe.js` (Schwellen 110 px seitlich, 90 px nach oben, Schnippen ab 0.55 px/ms) und `src/components/SwipeCard.jsx` umgesetzt; jede Richtung hat einen gleichwertigen Knopf (`src/components/AnswerButtons.jsx`).

### 3.4 Zentrale Begriffe

| Begriff | Bedeutung im Code |
|---|---|
| Runde | Eine der vier Durchgänge; Runde n zeigt ausschliesslich Karten der Stufe n (`engine.js → selectNextCards()`). Leere Runden werden übersprungen (`nextRoundNumber()`). |
| Kartenlimit | `ROUND_CARD_LIMIT = 13` je Runde, URL `?limit=4…15`, absolut nie über 15 (`config.js → cardLimit()`). |
| Ausschluss (ExclusionEntry) | `{ type: allergen \| animalOrigin \| card \| food, value, source: onboarding \| swipe \| profile, … }`; verdichtet zu Mengen in `filter.js → buildExclusions()`; Entscheid je Karte in `isAllowed()`, mit Familienregel in `isVisible()`. |
| Kontrollkarte (holdout) | Sechs Untergruppen, nach „Stimmt so“ zufällig aus der `sessionId` gezogen (`holdout.js`), nie in der normalen Auswahl, am Ende von Runde 2 gezeigt; Massstab für die Vermutungen (Messkonzept). |
| Vermutung | Abgeleiteter Wert für eine nicht bewertete Karte aus der nächsten bewerteten Gruppe darüber, pro Stufe halbiert (`preferences.js`). Nie eine Bewertung, getrennt angezeigt. |
| Profilstand | „Profil aufgebaut“ in Prozent, ein Erfassungsgrad nach nurec Anhang B2 (35/30/35), keine Trefferquote (`dashboard.js → profileProgress()`). |
| selectionReason | Grund, warum eine Karte kam (`selection.js → REASONS`), in jedem Antwort-Ereignis. |

### 3.5 Konfiguration

Alle Stellschrauben stehen in `src/config.js`: Kartenlimit, Anzahl Runden, Auswahlverfahren (`adaptive` oder `fixed`), Kontrollkarten, Skala in Runde 1, Präferenzmodell (−1, +1, +2, Faktor 0.5, Geschwister aus, Stufengewichte 1), Profilstandgewichte (35/30/35, Ziel 12 Lebensmittel), Verhalten negativer Gruppen (`last`, Quote 2 in Runde 3), Küchentendenz ab 3 Gerichten, Tutorial aus, Bilder, Registrierung, Datenschutz-Schalter (`PRIVACY`). Per URL veränderbar: `?limit`, `?selection`, `?holdout`, `?r1scale`, `?sms=sim`, `?admin=1`; ungültige Werte fallen auf den Standard zurück und stehen als `ignoredParams` in der Sitzung. Die effektive Konfiguration wird in jeder Sitzung gespeichert.

## 4. Wo welche Logik steht

| Frage | Datei → Funktion |
|---|---|
| Welche Karte kommt als Nächstes? | `src/logic/engine.js → selectNextCards()`, Rangfolge in `src/logic/selection.js → rankedCards()` und `rankedStageCards()` |
| Warum diese Karte? | `engine.js → selectionReason()` |
| Welche Karten sind erlaubt? | `src/logic/filter.js → isAllowed()`, `isVisible()`; Einträge aus `src/logic/stage0.js → deriveOnboarding()` und `engine.js → applyEvents()` |
| Wie sieht die Karte aus (Titel, Hinweise)? | `filter.js → annotateCard()`, `displayCardTitle()`; `engine.js → presentCard()` |
| Was bewirkt eine Antwort? | `engine.js → replay()`, `applyEvents()`; Bedeutung in `answers.js → RESPONSE_SEMANTICS` |
| Wie entsteht das Profil? | `engine.js → computeProfile()`, `buildProfile()`, `derivedEntries()`; `preferences.js → predictScores()`; `dashboard.js → profileProgress()`, `buildDashboard()` |
| Reihenfolge der Gerichte? | `engine.js → openDishes()` |
| Kontrollkarten? | `src/logic/holdout.js → drawHoldout()`; Einbau in `engine.js → selectNextCards()` |
| Rundenstatus, Fortsetzen? | `engine.js → roundStatus()`, `canResumeRound()`; `src/logic/rounds.js → roundOverview()` |
| Bildschirmwechsel? | `src/app/model.js → reducer()` |
| Protokoll und Export? | `src/logging/logger.js`, `src/logging/export.js` (CSV-Spalten in `CSV_COLUMNS`) |
| Auswertung der Lernkurve? | `src/analysis/evaluation.js`, `scripts/evaluate.mjs` |

## 5. Was im Prototyp bewusst nicht wirkt

Beobachtung: Diese Angaben werden gespeichert, verändern aber keine Karte und keinen Wert: Speisevorschriften (halal, koscher) ohne einzeln bestätigte Vorschläge und die Esskultur eines Gerichts (nur Metadatum und Tendenz im Profil). Die früheren wirkungslosen Angaben (Marken und Herkunft in Frage 3, Alltagsprofil, „ärztlich festgestellt“, „kleine Mengen gehen“, Unsicherheits-Kästchen in Frage 2) hat das Team am 28.10.2026 entfernt; alte gespeicherte Antworten mit diesen Feldern bleiben wirkungslos.
