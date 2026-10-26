# 05 Flowcharts

Stand 26.10.2026, aus dem Code abgeleitet (Regeln `demo-0.6`). Alle Diagramme sind Mermaid-Flowcharts und wurden mit dem Mermaid-Parser (Version 11.17) auf Gültigkeit geprüft. GitHub, VS Code (mit Mermaid-Erweiterung) und die meisten Markdown-Werkzeuge rendern sie direkt. Jedes Diagramm nennt die Codestellen, die es abbildet.

## Diagramm A: Gesamtablauf der Anwendung

Code: `src/app/model.js → reducer()`, `src/App.jsx`, `src/logic/engine.js → nextRoundNumber()`.

```mermaid
flowchart TD
  S["Start: Willkommen"] --> R{"Registrierung aktiv?<br/>AUTH_ENABLED"}
  R -- "ja" --> REG["Vorname, Handynummer, SMS-Code<br/>Ereignisse AUTH_STARTED, AUTH_COMPLETED"]
  R -- "nein" --> AB
  REG --> AB["Über dich: Altersgruppe, Einwilligung, Teilnehmer-Nr."]
  AB --> Q1["Frage 1: Ernährungsform, Einzelausschlüsse, Speisevorschriften"]
  Q1 --> Q2["Frage 2: Allergien und Unverträglichkeiten"]
  Q2 --> Q3["Frage 3: Nie vorschlagen"]
  Q3 --> D["deriveOnboarding(): Ausschluss-Einträge und Regeln"]
  D --> SUM["Zusammenfassung: Stimmt das so?"]
  SUM -- "Ändern" --> Q1
  SUM -- "Stimmt so" --> HO["drawHoldout(): 6 Kontrollkarten aus der sessionId"]
  HO --> E{"Mindestens eine Gruppe sichtbar?"}
  E -- "nein" --> C
  E -- "ja" --> R1["Runde 1: Lebensmittelgruppen, bis 13 Karten"]
  R1 --> C["Abschluss: Antworten gezählt, Profilstand, Rundenübersicht"]
  C --> M{"nextRoundNumber(): gibt es eine weitere Runde mit Karten?"}
  M -- "ja" --> RN["Runde 2: Untergruppen und Kontrollkarten<br/>Runde 3: einzelne Lebensmittel<br/>Runde 4: Gerichte"]
  RN --> C
  M -- "nein" --> P["Mein Profil: Dashboard"]
  C -- "Mein Profil ansehen" --> P
  P -. "freiwillig" .-> PR["Alltagsprofil, ohne Wirkung auf Karten"]
  P -- "Bewertung oder Ausschluss ändern" --> LOG["Ereignis mit source profile ins Log"]
  LOG --> P
```

Hinweise: „Runde beenden“ ist in jeder Runde möglich und führt zum Abschluss (Ereignis `QUESTION_ABORTED`); eine begonnene Runde lässt sich vom Abschluss aus fortsetzen, solange in einer späteren Runde noch nichts beantwortet ist (`canResumeRound()`). Ein gespeicherter Stand führt beim nächsten Öffnen zu „Willkommen zurück“ und dann an die gleiche Stelle.

## Diagramm B: Karten-Auswahlalgorithmus (technisch)

Code: `src/logic/engine.js → selectNextCards()`, `openDishes()`, `openHoldout()`; `src/logic/selection.js → rankedStageCards()`, `rankedCards()`, `balance()`, `interleave()`; `src/logic/filter.js → isVisible()`.

```mermaid
flowchart TD
  A["selectNextCards(state, config)"] --> B["remaining = Kartenlimit minus beantwortete Karten dieser Runde"]
  B --> C{"remaining > 0 und Runde 1 bis 4?"}
  C -- "nein" --> Z["leer: Runde ist zu Ende"]
  C -- "ja" --> D{"Runde 4?"}
  D -- "ja" --> E["openDishes(): sichtbare, offene Gerichte,<br/>sortiert nach Zutatenaffinität, dann Katalogreihenfolge"]
  E --> Y["die ersten remaining Karten an die Oberfläche"]
  D -- "nein" --> F["openHoldout(): Kontrollkarten dieser Stufe, offen und sichtbar"]
  F --> G["rankedStageCards(): Kandidaten der Stufe gleich Runde"]
  G --> H["rankedCards(): Regeln je Gruppe nach der aktuellen Bewertung"]
  H --> H1["Rang 1: Kenne ich nicht → bis 2 Klärungskarten"]
  H --> H2["Rang 2: noch nicht gefragte Gruppen"]
  H --> H3["Rang 3: Mag ich nicht → die Ausnahme<br/>Rang 8: übrige Untergruppen ganz am Schluss"]
  H --> H4["Rang 4: Mag ich oder Mag ich sehr → Kontrastpaar"]
  H --> H5["Rang 5: Ausnahme gefällt → bis 2 Lebensmittel<br/>Kontrast verschieden → je 1 Lebensmittel"]
  H --> H6["Rang 6: Untergruppe Mag ich sehr → bis 3 Favoriten"]
  H --> H7["Rang 7: Kontrast verschieden → übrige Untergruppen<br/>Vertrage ich nicht teilweise → bis 2 übrige"]
  H1 & H2 & H3 & H4 & H5 & H6 & H7 --> I["nur Karten, die sichtbar, keine Kontrollkarte und noch offen sind"]
  I --> J["Ränge zusammenfügen, Gruppen abwechseln (interleave), keine Karte doppelt"]
  J --> K["nur Karten der aktuellen Stufe; je Grund nach Gruppe ausgleichen (balance)"]
  K --> L{"Runde 3?"}
  L -- "ja" --> L1["plus je bewertete Untergruppe bis 2 Lebensmittel (3 bei Mag ich sehr),<br/>dann negative Untergruppen bis 2, ganz am Schluss"]
  L -- "nein" --> N
  L1 --> N["main = die ersten (remaining minus Kontrollkarten) Kandidaten"]
  N --> O["Reihenfolge: main, dann Kontrollkarten, auf remaining gekürzt"]
  O --> Y
```

## Diagramm B (vereinfacht): Was in welcher Runde kommt

```mermaid
flowchart TD
  A["Nächste Karte gesucht"] --> B{"Welche Runde?"}
  B -- "Runde 1" --> C["Alle erlaubten Gruppen in Katalogreihenfolge"]
  B -- "Runde 2" --> D["Je Gruppe nach ihrer Antwort:<br/>Kenne ich nicht → eine Klärungskarte<br/>Eher ungern → die Ausnahme<br/>Eher gern oder Sehr gern → zwei Kontraste"]
  D --> D2["Gruppen wechseln sich ab, 7 Plätze,<br/>danach die 6 Kontrollkarten"]
  B -- "Runde 3" --> E["Lebensmittel aus Ausnahmen, Unterschieden und Favoriten,<br/>dann bis 2 je gern bewertete Untergruppe,<br/>zuletzt bis 2 je negativem Zweig"]
  B -- "Runde 4" --> F["Erlaubte Gerichte, nach Zutatenvorlieben sortiert"]
  C & D2 & E & F --> G["Ausgeschlossene und beantwortete Karten entfernen,<br/>auf das Kartenlimit kürzen"]
  G --> H["Erste Karte anzeigen, zweite dahinter"]
```

## Diagramm C: Verarbeitung einer Swipe-Entscheidung

Code: `src/components/SwipeCard.jsx`, `src/logic/swipe.js → resolveRelease()`, `src/screens/RoundScreen.jsx → handleCommitted()`, `handleIntolerant()`, `src/App.jsx → record()`, `src/logic/engine.js → replay()`, `applyEvents()`.

```mermaid
flowchart TD
  A["Karte sichtbar: Bild oder Platzhalter geladen, Antwortzeit läuft"] --> B{"Eingabe"}
  B -- "Wischen" --> C["resolveRelease(): Schwelle 110 px seitlich, 90 px nach oben, oder schnelles Schnippen"]
  C -- "unter der Schwelle" --> A
  C -- "Antwort erkannt" --> D["commit(answer, inputMethod)"]
  B -- "Knopf oder Taste" --> D
  B -- "Vertrage ich nicht" --> E{"Karte hat Kinder?"}
  E -- "ja" --> E1["Detailauswahl: ganze Gruppe oder einzelne Einträge → excludedCardIds"]
  E -- "nein" --> E2["excludedCardIds = die Karte selbst"]
  E1 --> D
  E2 --> D
  D --> F["ANSWER-Ereignis: cardId, stage, round, positionInRound, response,<br/>responseTimeMs, inputMethod, selectionReason, alternatives, labelShown, imageShown"]
  F --> G["logger.recordEvent() und dispatch: Ereignis ins Log und in den Zustand"]
  G --> H["deriveRoundState(): replay() und applyEvents() über das ganze Log"]
  H --> H1{"Antwort"}
  H1 -- "DISLIKE, LIKE, PREFER" --> I1["Wert −1, +1, +2 für diese Karte;<br/>Nachkommen ohne Antwort erben die Hälfte je Stufe"]
  H1 -- "UNFAMILIAR" --> I2["kein Wert; Zweig bleibt unbekannt"]
  H1 -- "INTOLERANT" --> I3["Ausschluss-Einträge mit source swipe;<br/>Karte und Nachkommen unsichtbar, auch in Gerichten;<br/>Hinweis mit Rückgängig"]
  H1 -- "UNDO" --> I4["letzte Antwort der Runde entfällt samt Ausschluss"]
  I1 & I2 & I3 & I4 --> J["selectNextCards() neu berechnet"]
  J --> K{"Karten übrig und Limit nicht erreicht?"}
  K -- "ja" --> A
  K -- "nein" --> L["Abschluss der Runde: Profilstand, Rundenübersicht, weiter oder Profil"]
```

## Diagramm D: Zusammenspiel der Runden

Zeigt, welche Antwort einer Runde welche Karten der nächsten Runde auslöst. Code: `src/logic/selection.js → rankedCards()`, `rankedStageCards()`; `src/logic/engine.js → openDishes()`; `src/logic/preferences.js`.

```mermaid
flowchart LR
  subgraph S0["Stufe 0 (vor Runde 1)"]
    O["Ausschlüsse und Ernährungsform"]
    HO["6 Kontrollkarten gezogen"]
  end
  subgraph R1["Runde 1: Gruppen"]
    A1["Antwort je Gruppe"]
  end
  subgraph R2["Runde 2: Untergruppen (7 Plätze plus Kontrollkarten)"]
    B1["Klärung nach Kenne ich nicht, bis 2"]
    B2["Ausnahme nach Mag ich nicht, 1; übrige ganz am Schluss"]
    B3["Kontrastpaar nach Mag ich oder Mag ich sehr, 2"]
    B4["Kontrollkarten, 6, am Ende"]
  end
  subgraph R3["Runde 3: einzelne Lebensmittel"]
    C1["Ausnahme gefällt → bis 2"]
    C2["Kontrast verschieden → je 1"]
    C3["Untergruppe Mag ich sehr → bis 3"]
    C4["jede weitere bewertete Untergruppe → bis 2"]
    C5["negative Untergruppen → bis 2, ganz am Schluss"]
  end
  subgraph R4["Runde 4: Gerichte"]
    D1["erlaubte Gerichte, sortiert nach Zutatenaffinität"]
  end
  MOD["Präferenzmodell: direkte Werte −1, +1, +2;<br/>Vermutungen für Unbewertetes, halbiert je Stufe"]
  O -- "isVisible() in jeder Runde" --> R1
  O --> R2
  O --> R3
  O --> R4
  HO --> B4
  A1 -- "Kenne ich nicht" --> B1
  A1 -- "Mag ich nicht" --> B2
  A1 -- "Mag ich oder Mag ich sehr" --> B3
  A1 -- "Vertrage ich nicht" --> O
  B2 -- "Ausnahme Mag ich" --> C1
  B3 -- "verschieden beantwortet" --> C2
  B1 -- "Mag ich sehr" --> C3
  B3 -- "Mag ich sehr" --> C3
  B4 -- "Mag ich sehr" --> C3
  B1 -- "Mag ich oder Kenne ich nicht" --> C4
  B3 -- "Mag ich oder Kenne ich nicht" --> C4
  B4 -- "Mag ich oder Kenne ich nicht" --> C4
  B2 -- "Mag ich nicht" --> C5
  R1 --> MOD
  R2 --> MOD
  R3 --> MOD
  MOD -- "Mittelwert über die Zutatenkarten" --> D1
  MOD --> PROF["Mein Profil: Vermutungen"]
```

Lesebeispiel: Obst „Sehr gern“ in Runde 1 löst in Runde 2 das Kontrastpaar Beeren und Zitrusfrüchte aus. Beeren „Mag ich sehr“ und Zitrusfrüchte „Mag ich nicht“ lösen in Runde 3 Erdbeeren und Orangen aus (Kontrast verschieden), dazu bis zu zwei weitere Beeren (Favoriten). Kernobst, Steinobst und Tropisches Obst werden nur gefragt, wenn in Runde 2 noch Plätze frei sind, sonst nur vermutet. Was nie gefragt wurde, erreicht Runde 3 nicht.

## Diagramm E: Berechnung des Geschmacksprofils

Code: `src/logic/engine.js → replay()`, `applyEvents()`, `computeProfile()`, `derivedEntries()`, `buildProfile()`; `src/logic/preferences.js → predictScores()`; `src/logic/dashboard.js → profileProgress()`, `buildDashboard()`; `src/logic/cuisines.js`; `src/logging/logger.js → finish()`.

```mermaid
flowchart TD
  L["Event-Log: ANSWER, UNDO, RATING_CHANGED, EXCLUSION_ADDED, EXCLUSION_REMOVED, DIET_CHANGED, HOLDOUT_DRAWN"] --> R["replay(): gültige Antworten je Karte nach Rückgängig"]
  L --> X["applyEvents(): Ausschluss-Einträge, Ernährungsform,<br/>letzte direkte Bewertung je Karte (ratings)"]
  R --> X
  X --> V["buildExclusions() und isVisible(): relevante Karten"]
  X --> P1["computeProfile(): Mag ich sehr, Mag ich, Mag ich nicht, Kenne ich nicht;<br/>Vertrage ich nicht und Entferntes getrennt"]
  X --> P2["predictScores(): Wert −1, +1, +2 je direkter Bewertung;<br/>Vermutung = Wert der nächsten bewerteten Karte darüber mal 0.5 je Stufe;<br/>keine Vermutung für Produkte, Gerichte und nach Kenne ich nicht"]
  P2 --> P3["derivedEntries(): sichtbare, unbewertete Karten der Stufen 2 und 3,<br/>Richtung aus dem Vorzeichen, stärkste zuerst, ohne offene Kontrollkarten"]
  V --> P4
  X --> P4["profileProgress(): Stufe 1 bis 35 Punkte (Anteil Gruppen mit Geschmacksantwort),<br/>Stufe 2 bis 30 (Anteil geklärter Zweige),<br/>Stufe 3 bis 35 (Lebensmittel mit Antwort, voll ab 12)"]
  P1 --> P5["buildDashboard(): Antwortkategorien, Favoriten nur aus konkreten Karten,<br/>Gruppen, Ungern mit Ausnahmen, Offen, roh gegenüber gegart, Gerichte"]
  P5 --> P6["cuisineTendencies(): ab 3 bewerteten Gerichten je Küche, Vorzeichen des Mittels"]
  P2 --> D4["openDishes(): Reihenfolge der Gerichte in Runde 4"]
  P1 & P3 & P4 & P5 & P6 --> UI["Mein Profil und Abschluss"]
  P1 & P3 & P4 --> LOGP["buildProfile() → logger.finish(): profile in der Sitzung, nach jeder Runde und nach Profiländerungen"]
```

## Prüfung der Diagramme

Die sechs Diagramme wurden am 26.10.2026 mit `mermaid.parse()` (Mermaid 11.17.2 in Node mit jsdom) geprüft: alle gültig (`flowchart-v2`). Wer sie erneut prüfen will, kann das Mermaid Live Editor (mermaid.live) verwenden oder die Vorschau in VS Code.
