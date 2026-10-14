# Fotos für die Karten

Die 13 Familienkarten (Stufe 1) zeigen echte Food-Fotos. Fehlt ein Foto oder lädt es nicht, zeigt die Karte den gestalteten Platzhalter: die eigene Illustration aus `public/illustrations` auf der Kartenfarbe. Ein kaputtes Bild erscheint nie.

## Wo was steht

- Dateien: hier in `public/images`, pro Karte zwei Grössen: `F01.jpg` (1200 × 900) und `F01-480.jpg` (480 × 360, für Vorschaubilder).
- Nachweise: `src/data/image-credits.json`, ein Eintrag pro Karte mit Fotograf, Quelle, Lizenz, Link, Veröffentlichungsdatum und fertigem Nachweis nach APA 7 (`apa`). Daraus entsteht auch „Bildnachweise“ unten in „Mein Profil“.
- Ein Test (`src/data/image-credits.test.js`) prüft, dass jede Datei existiert und jeder Nachweis vollständig ist.

## Einheitlicher Stil

Uneinheitliche Bilder können die Bewertung verzerren (Annahme 5 im Projektkern). Deshalb gilt für alle Fotos:

- Querformat 4:3, Lebensmittel gross im Bild, von oben (Flat Lay) oder leicht schräg
- ruhiger heller Hintergrund, natürliches Licht, warme neutrale Farben
- keine Texte, Logos, Marken, Verpackungen oder Personen
- die typischen Beispiele der Karte zeigen, nicht ein einzelnes Gericht
- Bildausschnitt: Der Fokuspunkt (`focusX`, `focusY` in `image-credits.json`) bestimmt, welcher Teil bei engen Karten sichtbar bleibt

## Lizenz

Nur Fotos unter der Unsplash License (https://unsplash.com/license), keine Unsplash+-Bilder (andere, kostenpflichtige Lizenz). Die Lizenz erlaubt die freie Nutzung und Bearbeitung ohne Namensnennung; wir nennen die Fotografinnen und Fotografen trotzdem, im Prototyp und im Bericht.

## Ein Foto ersetzen

1. Neues Foto (Unsplash License) als `Fxx.jpg` und `Fxx-480.jpg` im gleichen Stil ablegen.
2. Eintrag in `src/data/image-credits.json` anpassen (alle Felder, inkl. `apa`).
3. `npm test` ausführen.
