# Geschmacksprofil 50+ · Prototyp

Bedien-Demo für den Zwischencheck am 12.10.2026 (Stand 04.10.2026). Sie zeigt Start, Erklärung, eine Runde mit den 13 Familienkarten aus Stufe 1 und den Zwischenstand. Die adaptive Logik ist bewusst noch ein Platzhalter: Die Karten kommen in fester Reihenfolge.

## Starten

```bash
npm install
npm run dev
```

Auf dem Handy im selben WLAN: `npm run dev -- --host` ausführen und die angezeigte Network-Adresse öffnen.

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
  data/catalog.json    Kartenkatalog Stufe 1 und 2 (nurec v0.2, Anhang A1/A2)
  logic/engine.js      Austauschbare Logik: nextCard(), applyAnswer(), summarize()
  logic/answers.js     Antworttypen DISLIKE, LIKE, PREFER, UNFAMILIAR, UNRATED
  logging/logger.js    Protokoll jeder Antwort, Export als JSON
  components/          Swipe-Karte, Antwortknöpfe, Fortschritt, Kartenbild
  screens/             Start, Erklärung, Runde, Zwischenstand
public/images/         Fotos der Karten (Anleitung im README dort)
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
- Wischschwellen von 110 px seitlich und 90 px nach oben. Im Pilot prüfen.
- Profilfortschritt in Prozent: Die Berechnung ist Teil des Konzepts (nurec v0.2, Anhang B2).
- Stufe 0 mit den Ausschlüssen: erst nach Klärung von Datenschutz und Einwilligung (Frage F4).

## Quelle

Kartenkatalog, Antworttypen und Protokollfelder: nurec Präferenzanamnese v0.2, Arbeitsstand 28.09.2026.
