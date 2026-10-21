# Addendum A15: Bilder auf allen Karten

Stand 21.10.2026. Quellen: [A] Addendum A15 (Team), [K] Dozentenfeedback 19.10.2026, [V] Annahme des Teams.

## Ziel und Entscheide

Jede Karte zeigt oben ein Bild, darunter den Kartennamen als echten Text [A]. Die adaptive Auswahl bleibt unverändert (A2).

Entscheide des Teams vom 21.10.2026 (Rückfrage vor der Umsetzung):

| Frage | Entscheid |
|---|---|
| Gruppen (Runde 1) | **Neutraler Teller bleibt** (Tibors Wunsch [K], Teamentscheid 20.10.). A15-Bilder gelten für Untergruppen, Lebensmittel und Gerichte. |
| Vorhandene Unsplash-Fotos | **Behalten als „stock“**, ins A15-Format übernommen. Gemini nur für Karten ohne Bild. |
| Team-Prompts ohne passende Karte | **Katalog bleibt.** Diese Prompts entfallen; für jede Karte ohne Bild gibt es einen Prompt im Stil der Team-Prompts. |
| Branch | `feature/bilder-a15`, ein lokaler Commit, nicht gepusht. |

## Datenmodell

`image` im Katalog (src/data/catalog.json), wie in A15:

```
image?: { src: "cards/{cardId}.webp", alt: string, source: "ai-gemini" | "stock" | "own", license?: string }
```

Zusätzlich, optional:
- `credit`: Schlüssel des Bildnachweises in src/data/image-credits.json (Fotograf, Link, APA 7), nur bei Unsplash.
- `shows`, `foods`: was im Bild zu sehen ist. Damit zeigt ein Bild weiterhin nie etwas Ausgeschlossenes (Allergie, Ernährungsform, „Vertrage ich nicht“, eingetippte „Tomate“); sonst erscheint der Platzhalter. Ohne diese Felder wäre der bestehende Bildfilter verloren gegangen.

Dateien: public/cards/{cardId}.webp, 4:3, höchstens 1200 px breit, höchstens 150 KB. Die Katalogprüfung (`validateCatalog`) meldet ein Bild ohne alt-Text, mit falschem Pfad, mit unbekannter Quelle oder auf einer Gruppe als Fehler.

## Stand der Bilder

| Karten | Anzahl | Bild |
|---|---|---|
| Gruppen (Stufe 1) | 13 | neutrales Symbol (eigene Grafik) |
| Untergruppen mit Unsplash-Foto | 34 | `stock`, WebP aus public/images |
| Lebensmittel, deren Foto genau sie zeigt | 26 | `stock` (Kopie des Fotos, z. B. Lachs) |
| Untergruppen, Lebensmittel und Gerichte ohne Bild | 94 | neutraler Platzhalter, bis die Gemini-Bilder da sind |

Die Original-JPGs in public/images bleiben als Quelle der WebP-Dateien und für die Bildnachweise. Die App lädt nur noch public/cards.

## Gemini-Bilder erzeugen und übernehmen

1. Prompts: src/data/card-image-prompts.json (94 Einträge), oder ausgeben mit `python scripts/prepare-card-images.py prompts`.
2. Bilder mit Gemini erzeugen und als `{cardId}.png` (oder .jpg, .webp) in einem Ordner speichern, z. B. `F12.5.1.png` für Bananen.
3. `python scripts/prepare-card-images.py gemini <ordner>` schneidet auf 4:3 zu, verkleinert auf höchstens 1200 px, speichert WebP unter 150 KB und trägt `image` mit alt-Text, `shows` und `foods` aus der Prompt-Liste in den Katalog ein (`source: "ai-gemini"`). Optional `--license "Hinweis"`.
4. `python scripts/prepare-card-images.py check` prüft alle Bilder; danach `npm test`.

Voraussetzung: `pip install pillow`. Gruppen werden übersprungen (neutrales Symbol).

Jeder Prompt zeigt nur das Lebensmittel der Karte („only this food, no other foods, no garnish“): Ein zusätzliches Lebensmittel im Bild wirkt wie ein Beispiel und kann Ausgeschlossenes zeigen.

## Zuordnung der Team-Prompts aus A15

| Team-Prompt | Verwendet für | Bemerkung |
|---|---|---|
| aelplermagronen | D04 Älplermagronen | unverändert |
| geschnetzeltes_roesti | D06 Zürcher Geschnetzeltes mit Rösti | unverändert |
| gemuesecurry | D15 Gemüsecurry mit Reis | unverändert |
| spaghetti_bolognese | D02 Spaghetti Bolognese | unverändert |
| birchermueesli | D17 Birchermüesli | angepasst: Haselnüsse statt Beeren, wie im Katalog |
| gemuesesuppe | – | entfällt: Bündner Gerstensuppe (D09) enthält Bündnerfleisch und Speck, der Prompt zeigt eine Gemüsesuppe; D09 hat einen eigenen Prompt |
| lachs_ofengemuese, linsensalat, omelette, fischknusperli | – | keine Karte im Katalog (Katalog bleibt) |
| fleisch, fisch_meeresfruechte, milchprodukte, eier, gemuese, obst, getreide_brot, huelsenfruechte, nuesse | – | Gruppen zeigen das neutrale Symbol |
| suesses | – | keine Gruppe „Süsses“ im Katalog |

## Darstellung

- Bild oben, darunter der Kartenname als Text (mindestens 22 px). Etiketten über dem Bild („Gericht“, „Ohne …“) haben eine eigene weisse Fläche (Kontrast nach A11).
- **Platzhalter** (kein Bild, Ladefehler, Ausgeschlossenes im Bild oder zu langes Laden): Kartenfarbe und Kartenname. Der Name steht unten in der Fläche, damit er nie unter einem Etikett liegt; ist die Fläche sehr niedrig (kleine Bildschirme), entfällt er dort, weil er ohnehin darunter steht. Die Karte bleibt voll bedienbar.
- **Laden:** Die nächsten zwei Karten werden vorgeladen. Lädt ein Bild länger als `IMAGE_LOAD_TIMEOUT_MS = 3000` (Annahme [V], im Pilot prüfen), gilt der Platzhalter, und die Karte wechselt danach nicht mehr.
- Bildstil `illustration` (Pilotvergleich, Annahme 5) bleibt: Dann zeigen die Karten die eigenen Illustrationen.

## Antwortzeit und Protokoll

- `responseTimeMs` beginnt beim späteren von zwei Zeitpunkten: Ende der Einblendung oder Bild bzw. Platzhalter sichtbar (A9: Karte vollständig sichtbar). Antwortet jemand, bevor das Bild geladen ist, ist `responseTimeMs` leer (`null`): Die Karte war nie vollständig sichtbar. Zeit in der Rundenübersicht zählt weiterhin nicht.
- Je Antwort (und bei „Runde beenden“) neu: `imageShown` (true, wenn Bild oder Symbol sichtbar war; false bei Platzhalter) und `imageSource` (`stock`, `ai-gemini`, `own`; bei einem nicht gezeigten Bild die Quelle des vorgesehenen Bildes, ohne Bild leer). Gruppen: `imageShown: true`, `imageSource: own` (neutrales Symbol). Beide Spalten stehen im CSV.

## Tests

- Karte ohne Bild: Platzhalter mit Name, per Wischen beantwortbar (src/components/artwork.test.js).
- Fehlerhafter Bildpfad: Platzhalter, kein Absturz, gemeldet als nicht gezeigt.
- Zu langes Laden: Platzhalter, kein späterer Wechsel.
- Antwortzeit erst ab geladenem Bild; Antwort davor ohne Zeit; Platzhalter gilt als sichtbar.
- Die nächsten zwei Karten werden vorgeladen.
- Jede Karte mit Bild: deutscher alt-Text, eigene Datei, WebP, 4:3, höchstens 1200 px, höchstens 150 KB; für jede Karte ohne Bild ein Prompt (src/data/card-images.test.js).
- Export: `imageShown`, `imageSource` (src/logging/logging.test.js).

## Offen

- **94 Bilder mit Gemini erzeugen** (Prompts liegen bereit). Bis dahin zeigen diese Karten den Platzhalter; `imageShown` macht sie in der Auswertung erkennbar.
- **Nutzungsbedingungen für Gemini-Bilder** klären und als `license` eintragen (keine rechtliche Beurteilung in dieser Doku).
- **Gemischte Bildquellen** (Unsplash und KI): Uneinheitliche Bilder können die Bewertung beeinflussen (Annahme 5). `imageSource` je Antwort erlaubt, das im Pilot auszuwerten; falls nötig, später alle Bilder mit Gemini erzeugen.
- Die Original-JPGs in public/images könnten entfallen, sobald niemand sie mehr als Quelle braucht (sie werden mit veröffentlicht, aber nicht geladen).
