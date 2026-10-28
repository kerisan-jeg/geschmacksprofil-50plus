# 07 Frontend-Bewertung: Benutzeroberfläche und Nutzererlebnis

Stand 26.10.2026. Grundlage: Code der Bildschirme und Komponenten (`src/screens/`, `src/components/`), alle Texte (`src/labels.js`, `src/data/stage0.json`), Komponententests und die Mobile-Prüfungen des Teams. **Keine Beobachtung echter Nutzerinnen und Nutzer**; das leistet erst der Pilot. Jede Bewertung ist als Einschätzung zu lesen, die Beobachtungen beziehen sich auf den Code.

## 1. Was gut gelöst ist (Beobachtung)

- **Lesbarkeit:** eine Schrift für Sehschwäche (Atkinson Hyperlegible Next), Grundschrift 19 px, kleinster Text 18 px, Kontraste mindestens 4.5:1 auch auf allen 13 Kartenfarben (`design.test.js`, `tints.test.js`), Touch-Ziele mindestens 44 px, kein horizontales Scrollen (Playwright-Prüfung des Teams).
- **Jede Geste hat einen Knopf** an der Stelle, wohin die Karte fliegt; Wischen ist nie nötig (`AnswerButtons.jsx`). Bewertungen nie nur über Farbe (Symbol plus Text).
- **Rückgängig** sofort nach jeder Antwort, ohne Zeitlimit; nach „Vertrage ich nicht“ erscheint eine Bestätigung mit Rückgängig.
- **Kein Scrollen in der Runde**, keine Beispieltexte auf Gruppenkarten, Rundenanzeige „Runde 1 von 4 · Lebensmittelgruppen“ und Zähler „Karte 3 von 13“ immer sichtbar.
- **Ehrliche Texte:** „Zeigt, wie viel von deinem Geschmack erfasst ist, nicht wie genau Vorschläge sind“; Notizen heissen „prüfen“; Speisevorschriften „weggelassen wird nur, was du bestätigt hast“.
- **Alle Texte an einer Stelle** (`labels.js`), Du-Form, Schweizer Rechtschreibung, Tests verhindern harte Texte im JSX.
- **Fehlerzustände:** Fehlergrenze mit „Neu laden“, Hinweis bei gesperrtem Speicher, Platzhalter statt kaputter Bilder, Bilder zeigen nie Ausgeschlossenes.
- **App-Gefühl:** PWA, sichere Zonen, reduzierte Bewegung wird respektiert, nächste Karte sichtbar dahinter, Bilder vorgeladen.

## 2. Bewertung je Bereich

### Verständlichkeit der Fragen (Stufe 0)

Beobachtung: Frage 1 hat drei Teile auf einem Bildschirm (Ernährungsform Pflicht, Einzelausschlüsse, Speisevorschriften mit Vorschlägen). Frage 2 und 3 sind zweistufig: „Ja / Keine bekannt“ und erst dann Auswahl, Suche, Notiz. Seit dem 28.10.2026 sind die Speisevorschriften in Frage 1 zugeklappt (erst öffnen, dann Halal oder Koscher wählen), und die Zusatzangaben („ärztlich festgestellt“, „ganz meiden / kleine Mengen gehen“, „nicht sicher, ob es weitere gibt“, Marken und Herkunft) sind entfernt.

Einschätzung: Die Fragen sind klar formuliert und die Pflichtteile klein. Frage 1 ist durch die drei Teile lang, seit dem 28.10.2026 mit zugeklapptem Teil C aber kürzer; Frage 3 kommt ohne die wirkungslosen Felder aus. Für Personen ab 50 ist die Menge an Optionen pro Bildschirm der grösste Zeitfaktor vor dem ersten Swipe (Registrierung, drei Fragen, Zusammenfassung). Risiko: „Mag ich nicht“ wird in Frage 3 eingetragen statt beim Wischen; der Hinweis „Was du einfach nicht magst, kannst du später beim Wischen angeben“ ist vorhanden.

### Swipe-Bedienung

Beobachtung: drei Richtungen, Schwelle 110 px seitlich und 90 px nach oben, Beschriftung auf der Karte wächst mit der Zugdistanz, Schnippen zählt, unter der Schwelle springt die Karte zurück; `touch-action: none` auf der Karte. In Runde 1 mit `?r1scale=2` kein Wischen nach oben.

Einschätzung: solide umgesetzt und testbar. Risiken für die Zielgruppe: Wischen nach oben (für „Sehr gern“) ist motorisch anspruchsvoll; der mittlere Knopf fängt das auf. Ob die Schwellen für langsame, zögerliche Bewegungen passen, zeigt nur der Pilot (Kennzahlen `inputMethod`, Rückgängig-Häufigkeit).

### Übersichtlichkeit der Karten

Beobachtung: Bild oben, Name darunter, bei Untergruppen und Lebensmitteln die Gruppe darüber als Etikett („Fleisch und Geflügel“), bei Gerichten „Gericht“, Beispiele ab Runde 2, Hinweise wie „Ohne Haselnüsse“ auf dem Bild. Gruppenkarten zeigen seit dem 21.10.2026 wieder ein dreiteiliges Foto.

Einschätzung: klar und ruhig. Zwei Punkte: Erstens widerspricht das Gruppenfoto der Empfehlung des Dozenten (Verbesserung 4, keine Beispiele in Runde 1); das Team hat das bewusst entschieden und es ist über `GROUP_IMAGES` umschaltbar, muss aber vor der Studie mit ihm geklärt sein. Zweitens nennt „Ohne Zopf; und 2 weitere“ nicht, was fehlt (Befund B5).

### Navigation zwischen den Runden

Beobachtung: Nach jeder Runde ein Abschluss mit Zählung, Profilstand, Rundenübersicht mit Status („Noch offen / Begonnen / Abgeschlossen“), „Weiter mit Runde n“ als Hauptknopf, „Mein Profil ansehen“ als zweiter. In der Runde: „Runde beenden“ oben links, Rundenanzeige als Knopf zur Übersicht (Antwortzeit pausiert). Untere Leiste erst ab dem Abschluss.

Einschätzung: der Pfad nach vorn ist eindeutig. Der Abschluss ist inhaltlich dicht (vier Blöcke; das freiwillige Alltagsprofil ist seit dem 28.10.2026 entfernt); für die Studie genügt er, weil die Testleitung anleitet. „Runde beenden“ als X oben links könnte mit „Zurück“ verwechselt werden; der Abbruch ist aber protokolliert und die Runde lässt sich fortsetzen.

### Verständlichkeit der Rückmeldungen

Beobachtung: Beim Ziehen leuchtet der passende Knopf; nach „Vertrage ich nicht“ der Satz „Wir schlagen dir … nicht mehr vor.“; Fehlermeldungen in ganzen Sätzen; Screenreader-Ansagen je Karte.

Einschätzung: angemessen. Es fehlt eine Rückmeldung, **warum** eine Karte kommt (der Grund steht nur im Protokoll). Für die Studie ist das richtig (keine Beeinflussung), für eine spätere Version könnte „Weil du Obst sehr gern magst“ das Vertrauen stärken.

### Darstellung der Ergebnisse und Dashboard

Beobachtung: „Mein Profil“ zeigt die Anzahl Antworten, vier Balken (Anteil je Kategorie), aufklappbare Listen mit Bild, Titel, Kartenart und Bewertung; Profilstand mit Prozent, Stufe und nächstem Schritt; „Weitere Einblicke“ mit Vermutungen (fünf je Richtung, „Alle anzeigen (97)“), „Noch nicht gefragt“, roh/gegart, Küchentendenz; „Ausschlüsse“ mit Herkunft („Alltag“ seit dem 28.10.2026 entfernt). Alles bearbeitbar.

Einschätzung: inhaltlich vollständig und ehrlich beschriftet. Drei Risiken: Der Prozentwert wird trotz Hinweis als Qualität gelesen werden (89 % bei fast nur Ablehnung, Szenario C). Die Vermutungslisten sind sehr lang (69 bis 102 Einträge), weil fast jede Karte einen bewerteten Vorfahren hat; die Begründungszeile hilft, aber die Masse wirkt beliebig. Die vielen Bearbeitungsmöglichkeiten sind für die Studie zweischneidig: Jede Änderung ist protokolliert, verändert aber das Profil, das die Person bewertet (Entscheid in [09](09_Studienbereitschaft.md)).

### Lesbarkeit und Bedienbarkeit ab 50

Beobachtung: Schriftgrössen, Kontraste, Zielgrössen und Vergrösserung auf 130 % sind geprüft; eine Schriftfamilie; keine Emojis; haptisches Feedback nur auf Android.

Einschätzung: technisch über dem Üblichen. Offen bleibt die kognitive Last: die drei Begriffe in Runde 1 („Eher ungern / Eher gern / Sehr gern“) sind asymmetrisch (zwei positive, eine negative Stufe), was positive Antworten begünstigen kann; ob das stört, muss der Pilot zeigen (`?r1scale=2` als Vergleich). Die Umstellung der Begriffe ab Runde 2 („Mag ich nicht / Mag ich / Mag ich sehr“) ist eine zusätzliche Hürde, die der Dozent so gewünscht hat.

### Mögliche Missverständnisse

- „Vertrage ich nicht“ ist ein kleiner Textlink unter den Knöpfen; wer ihn übersieht, wählt „Mag ich nicht“, und die Allergie bleibt unerfasst (das frühere Kästchen „nicht sicher“ in Frage 2 ist seit dem 28.10.2026 weg; die Testleitung sollte Allergien in Frage 2 erfassen lassen). Im Protokoll über `inputMethod = link` auswertbar.
- „Kenne ich nicht“ bei Gruppen wie Eier oder Kartoffeln ist kaum sinnvoll, der Knopf ist aber überall gleich (Teamentscheid, im Pilot messen).
- „Karte 3 von 13“: Die Gesamtzahl kann sich während der Runde ändern (z. B. wenn eine Kontrollkarte durch „Vertrage ich nicht“ wegfällt). Selten, aber irritierend.
- Der Begriff „Gruppe“ auf dem Etikett und „Lebensmittelgruppe“ auf Karten könnte für Laien abstrakt sein.
- „Profil aufgebaut 81 %“ wird als Treffergenauigkeit verstanden, trotz Hinweis.

### Überflüssige Interaktionen (Einschätzung)

- Die Anmeldung vor dem Swipen ist seit dem 28.10.2026 nur noch der Vorname (keine Handynummer, kein SMS-Code); sie kostet wenige Sekunden und gibt der Testleitung die Zuordnung (`participantName`). Abschaltbar mit `AUTH_ENABLED = false`.
- Marken und Herkunft in Frage 3 und das Alltagsprofil (beide ohne Wirkung auf die Karten) sind seit dem 28.10.2026 entfernt.
- Die Zusammenfassung vor Runde 1 ist von nurec gefordert; sie kostet einen Bildschirm.

### Allgemeine Nutzerfreundlichkeit

Einschätzung: Die Oberfläche ist reif genug für eine begleitete Studie. Die technischen Grundlagen (Lesbarkeit, Knöpfe, Rückgängig, Fehlertoleranz) stimmen. Die Risiken liegen in der Menge der Vorab-Angaben, in den Begriffen und im Verstehen des Profilstands, nicht in der Bedienung selbst.

## 3. Verbesserungspotenziale

| Priorität | Massnahme | Aufwand (Einschätzung) |
|---|---|---|
| vor der Studie | Registrierung ausschalten oder simulieren; `GROUP_IMAGES` mit dem Dozenten klären | Konfiguration |
| vor der Studie | Entscheid, ob Testpersonen das Profil während der Studie bearbeiten dürfen (sonst Anweisung an die Testleitung) | Prozess |
| später | „und 2 weitere“ durch die vollständige Liste in der Detailansicht ersetzen | klein |
| später | Vermutungen im Profil auf die stärksten je Gruppe begrenzen oder nach Gruppe bündeln | mittel |
| später | Begründung je Karte anzeigen („Weil du Obst sehr gern magst“) | klein, aber nicht während der Studie |
| später | Prozentwert des Profilstands durch eine Stufenanzeige ohne Prozent ersetzen | klein |
| erledigt 28.10.2026 | Marken, Herkunft und Alltagsprofil entfernt; Speisevorschriften zugeklappt; Einwilligung als Kästchen; Anmeldung ohne SMS | klein |
