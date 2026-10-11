# Geschmacksprofil 50+ · Prototyp

Bedien-Demo für den Zwischencheck am 12.10.2026 (Version 0.3, Stand 11.10.2026). Die adaptive Logik ist bewusst noch ein Platzhalter: Die Karten kommen in fester Reihenfolge.

## Ablauf

1. **Start:** kurze Einführung.
2. **Anmelden:** Vorname und Alter freiwillig, Einwilligung Pflicht, kein Passwort. Ein aufklappbares Feld „Für die Testleitung“ nimmt die Teilnehmer-Nr. auf.
3. **Fragebogen (Stufe 0):** drei Fragen zu festen Regeln, eine pro Bildschirm. Details nur bei „Ja“.
4. **Zusammenfassung:** „Deine festen Regeln“ zum Bestätigen oder Ändern, dazu der Kartenstapel der ersten Runde.
5. **Erklärung:** animierte Vorführung der Gesten.
6. **Runde:** die zulässigen Familienkarten aus Stufe 1.
7. **Zwischenstand:** Antworten nach Gruppen und die festen Regeln.

## Stufe 0: harte Ausschlüsse

Grundlage ist nurec v0.2, Kap. 2: Regeln, die nie durch Geschmack überstimmt werden. Die sechs Bereiche 0.1 bis 0.6 sind als drei Fragen umgesetzt (eigener Vorschlag, damit der Einstieg für Personen ab 50 kurz bleibt):

| Frage im Prototyp | Bereiche im Konzept | Wirkung auf die Karten |
| --- | --- | --- |
| Feste Ernährungsweise | 0.4 | Vegan, vegetarisch oder pescetarisch entfernen ganze Familien |
| Allergien und Unverträglichkeiten | 0.1 bis 0.3 | Schweizer Allergenliste plus Laktose. Ausschluss von Untergruppen oder Hinweis wie „Nur glutenfrei“ |
| Nie vorschlagen | 0.5 | Einzelne Untergruppen, z. B. Schweinefleisch. Ohne Begründung, „mag ich nicht“ gehört ins Wischen |

Regeln aus dem Konzept, die der Prototyp umsetzt:

- Laktoseintoleranz und Milcheiweissallergie sind getrennt.
- „Unsicher“ gibt nichts frei und erscheint als offener Punkt.
- Sind alle Untergruppen einer Familie ausgeschlossen, entfällt die Familie.
- Bleibt eine Familie, zeigt sie nur erlaubte Beispiele und einen Hinweis wie „Ohne Krebstiere“.
- Vor der ersten Runde kommt eine Zusammenfassung zum Bestätigen oder Korrigieren (Kap. 2.2).

Bereich 0.6 (Marken und Händler) fehlt bewusst. Die Zuordnung der Antworten zu Karten steht in `src/data/stage0.json` und ist ein Entwurf für das Konzept.

## Gestaltung

- Ruhige, helle Fläche; die Karte ist das einzige laute Element.
- Titel in Fraunces, Text in Atkinson Hyperlegible Next, einer Schrift, die gezielt für gute Lesbarkeit entwickelt wurde. Grundgrösse 19 px. Beide Schriften liegen im Projekt, es werden keine externen Server angefragt.
- Jede Wischgeste hat einen gleichwertigen Knopf. Die Knöpfe liegen in Wischrichtung, und beim Wischen wächst der passende Knopf mit.
- Ein schneller, kurzer Wisch zählt ebenfalls als Antwort; ein langsamer, kurzer Wisch federt zurück.
- Die Erklärung zeigt die Gesten als Animation. Wer im System „Bewegung reduzieren“ eingestellt hat, sieht sie ohne Animation.
- Auf Android gibt es bei jeder Antwort ein kurzes Vibrieren (abschaltbar über `FEATURES.haptics`).

## Starten

```bash
npm install
npm run dev
```

Auf dem Handy im selben WLAN: `npm run dev -- --host` ausführen und die angezeigte Network-Adresse öffnen.

Wie eine App: Auf dem iPhone in Safari „Teilen“ → „Zum Home-Bildschirm“, auf Android in Chrome das Menü → „App installieren“. Der Prototyp startet dann mit eigenem Symbol und ohne Browserleiste.

| Befehl | Zweck |
| --- | --- |
| `npm test` | Tests der Logik |
| `npm run build` | Produktions-Build in `dist/` |
| `npm run preview` | Build lokal ansehen |

## Auf GitHub Pages veröffentlichen

1. Repository auf GitHub anlegen und den Code auf `main` pushen.
2. Unter Settings → Pages bei „Source“ die Option „GitHub Actions“ wählen.
3. Jeder Push auf `main` testet, baut und veröffentlicht den Prototyp (`.github/workflows/deploy.yml`).

Mit GitHub Free funktioniert Pages nur bei öffentlichen Repositories. Für ein privates Repository braucht es z. B. GitHub Pro, das im GitHub Student Developer Pack enthalten ist.

## Aufbau

```
src/
  config.js            Wortlaut, Wischschwellen, Funktionen (Stellschrauben für den Pilot)
  data/catalog.json    Kartenkatalog Stufe 1 und 2 (nurec v0.2, Anhang A1/A2), mit Farbton und Bild je Karte
  data/stage0.json     Fragebogen Stufe 0 und Zuordnung der Antworten zu Karten
  logic/engine.js      Austauschbare Logik: nextCard(), applyAnswer(), summarize()
  logic/stage0.js      Harte Ausschlüsse aus dem Fragebogen ableiten, Karten anpassen
  logic/answers.js     Antworttypen DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED
  logging/logger.js    Protokoll jeder Antwort, Export als JSON
  components/          Swipe-Karte, Kartenaufbau, Antwortknöpfe, Auswahlfelder, Fortschritt, Bild
  screens/             Start, Anmelden, Fragebogen, Zusammenfassung, Erklärung, Runde, Zwischenstand
  styles.css           Gestaltung mit allen Farben und Grössen an einem Ort
public/illustrations/  Eigene Illustrationen der 13 Karten (SVG)
public/images/         Platz für Fotos (Anleitung im README dort)
```

## Logik austauschen (Phase 2)

Die Oberfläche ruft nur `nextCard(state)` und `applyAnswer(state, cardId, answer)` auf. Die adaptive Logik ersetzt diese Funktionen in `src/logic/engine.js`; Oberfläche und Protokoll bleiben unverändert.

Die Funktionen sind rein, also ohne Zufall und ohne Uhrzeit. So lässt sich jedes Profil später aus dem Protokoll nachrechnen. Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen.

## Protokoll

Jede Antwort wird mit Karten-ID, Stufe, Position, Auswahlgrund, Regelversion, Antwort, Eingabeart (`swipe`, `button`, `keyboard`) und Antwortzeit gespeichert. Die Felder folgen nurec v0.2, Kap. 6, ergänzt um Eingabeart und Antwortzeit. Dazu kommen Rundenstart, Rückgängig und Rundenende mit der zuletzt offenen Karte.

Aus Anmeldung und Fragebogen kommen hinzu: Teilnehmer-Nr., Altersgruppe, Einwilligung, die abgeleiteten Ausschlüsse (Karten-IDs) und der Kartenstapel der Runde.

Datenschutz: Der Vorname wird nie gespeichert, nur ob einer angegeben wurde. Rohantworten aus dem Fragebogen, also welche Allergie jemand hat, werden nicht gespeichert, solange Frage F4 (Einwilligung, Gesundheitsdaten) offen ist. Umschalten über `PRIVACY.logStage0Answers`.

Die Daten bleiben im Browser. „Protokoll herunterladen“ auf dem Zwischenstand exportiert sie als JSON; der Dateiname enthält die Teilnehmer-Nr. „Nochmals von vorn“ beginnt ein neues Protokoll für die nächste Person. Die Eingabeart zeigt später direkt, ob Personen ab 50 lieber wischen oder tippen.

## Tastatur für Demos am Laptop

| Taste | Antwort |
| --- | --- |
| Pfeil links | Eher ungern |
| Pfeil rechts | Gern |
| Pfeil oben | Besonders gern |
| K | Kenne ich nicht |

## Offen für Konzept und Pilot

- „Kenne ich nicht“ löst noch keine konkrete Nachfrage aus (nurec v0.2, Kap. 6). Das kommt mit der Logik in Phase 2.
- Wortlaut von „Gern“: „mag ich“ oder „würde ich essen“ (nurec v0.2, Kap. 4). Im Pilot prüfen.
- Ansprache mit Du oder Sie. Im Pilot prüfen.
- Rückgängig-Knopf: eigene Idee, abschaltbar über `FEATURES.undo`. Im Pilot prüfen.
- Wischschwellen von 110 px seitlich und 90 px nach oben sowie die Schnipp-Erkennung. Im Pilot prüfen.
- Illustrationen oder Fotos: Was erkennen Personen ab 50 schneller und eindeutiger? Lässt sich im Pilot direkt vergleichen.
- Profilfortschritt in Prozent: Die Berechnung ist Teil des Konzepts (nurec v0.2, Anhang B2).
- Stufe 0 im Test: echte oder fiktive Angaben zu Allergien (Frage F4).
- Drei statt sechs Fragen in Stufe 0: Verständlichkeit und Dauer im Pilot prüfen.
- Anmeldung ohne Passwort: bewusst, damit der gemessene Aufwand vom Profil stammt und nicht vom Einloggen.

## Quelle

Kartenkatalog, Antworttypen, Stufe 0 und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
