# Geschmacksprofil 50+ · Prototyp

Bedien-Demo für den Zwischencheck am 12.10.2026 (Version 0.2, Stand 04.10.2026). Sie zeigt Start, eine animierte Erklärung, eine Runde mit den 13 Familienkarten aus Stufe 1 und den Zwischenstand. Die adaptive Logik ist bewusst noch ein Platzhalter: Die Karten kommen in fester Reihenfolge.

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
  logic/engine.js      Austauschbare Logik: nextCard(), applyAnswer(), summarize()
  logic/answers.js     Antworttypen DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED
  logging/logger.js    Protokoll jeder Antwort, Export als JSON
  components/          Swipe-Karte, Kartenaufbau, Antwortknöpfe, Fortschritt, Bild
  screens/             Start, Erklärung, Runde, Zwischenstand
  styles.css           Gestaltung mit allen Farben und Grössen an einem Ort
public/illustrations/  Eigene Illustrationen der 13 Karten (SVG)
public/images/         Platz für Fotos (Anleitung im README dort)
```

## Logik austauschen (Phase 2)

Die Oberfläche ruft nur `nextCard(state)` und `applyAnswer(state, cardId, answer)` auf. Die adaptive Logik ersetzt diese Funktionen in `src/logic/engine.js`; Oberfläche und Protokoll bleiben unverändert.

Die Funktionen sind rein, also ohne Zufall und ohne Uhrzeit. So lässt sich jedes Profil später aus dem Protokoll nachrechnen. Bei jeder Änderung der Regeln `RULE_VERSION` erhöhen.

## Protokoll

Jede Antwort wird mit Karten-ID, Stufe, Position, Auswahlgrund, Regelversion, Antwort, Eingabeart (`swipe`, `button`, `keyboard`) und Antwortzeit gespeichert. Die Felder folgen nurec v0.2, Kap. 6, ergänzt um Eingabeart und Antwortzeit. Dazu kommen Rundenstart, Rückgängig und Rundenende mit der zuletzt offenen Karte.

Die Daten bleiben im Browser. „Protokoll herunterladen“ auf dem Zwischenstand exportiert sie als JSON. Die Eingabeart zeigt später direkt, ob Personen ab 50 lieber wischen oder tippen.

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
- Stufe 0 mit den Ausschlüssen: erst nach Klärung von Datenschutz und Einwilligung (Frage F4).

## Quelle

Kartenkatalog, Antworttypen und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
