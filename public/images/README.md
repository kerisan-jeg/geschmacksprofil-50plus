# Fotos für die Karten

> **Seit Addendum A15 (21.10.2026):** Die App zeigt die Bilder aus `public/cards/{cardId}.webp` (4:3, höchstens 1200 px, höchstens 150 KB), eingetragen als `image` im Katalog. Die JPGs hier sind die Originale der Unsplash-Fotos und die Quelle für `python scripts/prepare-card-images.py stock`. Gruppen zeigen das neutrale Symbol, kein Bildraster mehr. Details: [`docs/bilder-a15.md`](../../docs/bilder-a15.md). Der folgende Text beschreibt den Stand vor A15.

Die Karten zeigen echte Food-Fotos: jede der 13 Gruppen (Stufe 1) ihre drei Beispiele als Bildraster (`collages` in `src/data/image-credits.json`, in der Reihenfolge der Beispiele), jede Untergruppe (Stufe 2) ein eigenes Foto. Fehlt ein Foto oder lädt es nicht, zeigt die Karte den gestalteten Platzhalter: die eigene Illustration aus `public/illustrations` auf der Kartenfarbe (Untergruppen übernehmen die ihrer Gruppe). Ein kaputtes Bild erscheint nie.

Jedes Foto nennt, was darauf zu sehen ist: `shows` (die genauesten Karten, z. B. `F13.1.3` Mandeln) und `foods` (deutlich sichtbare Lebensmittel). Hat die Person davon etwas ausgeschlossen, wird das Foto nicht gezeigt. Beim Ersetzen eines Fotos beide Felder mitpflegen.

## Wo was steht

- Dateien: hier in `public/images`, pro Foto zwei Grössen: z. B. `F01.2.jpg` (1200 × 900) und `F01.2-480.jpg` (480 × 360, für Vorschaubilder und Bildraster). Fotos, die nur im Bildraster einer Gruppe vorkommen, heissen nach der Gruppe (`F03-a.jpg` usw.).
- Nachweise: `src/data/image-credits.json`, ein Eintrag pro Foto mit Fotograf, Quelle, Lizenz, Link, Veröffentlichungsdatum und fertigem Nachweis nach APA 7 (`apa`). Daraus entsteht auch „Bildnachweise“ unten in „Mein Profil“.
- Ein Test (`src/data/image-credits.test.js`) prüft, dass jede Datei existiert und jeder Nachweis vollständig ist.

## Einheitlicher Stil

Uneinheitliche Bilder können die Bewertung verzerren (Annahme 5 im Projektkern). Deshalb gilt für alle Fotos:

- Querformat 4:3, Lebensmittel gross im Bild, von oben (Flat Lay) oder leicht schräg
- ruhiger heller Hintergrund, natürliches Licht, warme neutrale Farben
- keine Texte, Logos, Marken, Verpackungen oder Personen
- die typischen Beispiele der Karte zeigen, nicht ein einzelnes Gericht; bei Gruppen je Beispiel ein Foto (Bildraster)
- noch offen: Fotos für Vollkornpasta (`F07.2`) und Pasta aus Hülsenfrüchten (`F07.3`), bis dahin die Illustration
- Bildausschnitt: Der Fokuspunkt (`focusX`, `focusY` in `image-credits.json`) bestimmt, welcher Teil bei engen Karten sichtbar bleibt

## Lizenz

Nur Fotos unter der Unsplash License (https://unsplash.com/license), keine Unsplash+-Bilder (andere, kostenpflichtige Lizenz). Die Lizenz erlaubt die freie Nutzung und Bearbeitung ohne Namensnennung; wir nennen die Fotografinnen und Fotografen trotzdem, im Prototyp und im Bericht.

## Ein Foto ersetzen

1. Neues Foto (Unsplash License) als `<Schlüssel>.jpg` und `<Schlüssel>-480.jpg` im gleichen Stil ablegen.
2. Eintrag in `src/data/image-credits.json` anpassen (alle Felder, inkl. `apa`, `shows` und `foods`).
3. `npm test` ausführen.
