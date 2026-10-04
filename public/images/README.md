# Fotos für die Karten

Legt pro Karte ein Foto mit dem passenden Dateinamen in diesen Ordner. Fehlt eine Datei, zeigt die Karte automatisch einen Platzhalter.

| Datei | Karte | Motiv: Beispiele auf der Karte |
| --- | --- | --- |
| F01.jpg | Fleisch und Geflügel | Poulet, Rindfleisch, Schweinefleisch |
| F02.jpg | Fisch und Meeresfrüchte | Lachs, Garnelen, Muscheln |
| F03.jpg | Eier | Gekochtes Ei, Rührei, Omelett |
| F04.jpg | Milchprodukte | Joghurt, Quark, Käse |
| F05.jpg | Hülsenfrüchte | Linsen, Bohnen, Kichererbsen |
| F06.jpg | Brot | Weissbrot, Vollkornbrot, Knäckebrot |
| F07.jpg | Pasta | Weizenpasta, Vollkornpasta, Linsenpasta |
| F08.jpg | Reis und andere Getreide | Reis, Couscous, Quinoa |
| F09.jpg | Kartoffeln | Salzkartoffeln, Püree, Ofenkartoffeln |
| F10.jpg | Salat und Rohkost | Blattsalat, Gurke, rohe Karotte |
| F11.jpg | Gegartes Gemüse | Broccoli, Zucchini, gekochte Karotte |
| F12.jpg | Obst | Apfel, Erdbeere, Orange |
| F13.jpg | Nüsse und Samen | Mandeln, Walnüsse, Kürbiskerne |

## Einheitlicher Stil

Uneinheitliche Fotos können die Bewertung verzerren (Annahme 5 im Projektkern). Deshalb für alle Karten:

- Querformat 4:3, mindestens 1200 × 900 px, Dateigrösse unter 300 KB
- Lebensmittel gross im Bild, ruhiger heller Hintergrund, natürliches Licht
- Keine Texte, Logos, Marken oder Personen
- Die typischen Beispiele der Karte zeigen, nicht ein einzelnes Gericht

## Lizenz und Nachweis

Nur Fotos verwenden, deren Lizenz die Nutzung erlaubt, z. B. von Unsplash, Pexels oder Wikimedia Commons (dort bevorzugt CC0). Pro Foto den Nachweis in `src/data/catalog.json` eintragen:

```json
"image": {
  "file": "F01.jpg",
  "credit": { "author": "Name", "source": "Unsplash", "license": "Unsplash License", "url": "https://..." }
}
```

Die Nachweise erscheinen im Prototyp unter „Bildnachweise“ und gehören auch in den Bericht.
