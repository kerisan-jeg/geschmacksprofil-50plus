# Addendum A16: Fehlende Kartenbilder aus öffentlichen Quellen

Stand 21.10.2026. Ergänzt [bilder-a15.md](bilder-a15.md). Gemini wird für Kartenbilder nicht mehr benötigt.

## Ergebnis

| | Karten |
|---|---|
| Karten ausser Gruppen | 154 |
| mit Foto | **127** (60 aus A15, **67 neu**) |
| ohne passendes Foto (Platzhalter, Liste unten) | **27** |
| Gruppen | 13, unverändert mit dem neutralen Teller |
| neue Fotos mit TODO zu shows/foods | 16 |

Alle Fotos stammen von Unsplash unter der Unsplash License; keine Unsplash+-Fotos. Pexels wurde nicht verwendet (siehe unten).

## Vorgehen

1. **Suche:** öffentliche Unsplash-Suchseiten (`unsplash.com/s/photos/<begriff>`), gedrosselt (eine Seite alle 3 Sekunden), je Karte ein englischer Begriff; für Lücken ein zweiter Begriff. Übernommen wurden nur Fotos mit `premium: false` und `plus: false` auf `images.unsplash.com`. Unsplashs eigene Such-Schnittstelle ohne Schlüssel ist inzwischen gesperrt („Authorization required“).
2. **Sichtung:** Kontaktbögen je Karte, danach jedes gewählte Foto vergrössert im 4:3-Ausschnitt der Karte geprüft. Verworfen wurden Fotos mit Händen oder Personen, Text, Logos, Preisschildern, einem zweiten Lebensmittel als Hauptmotiv oder einer anderen Sorte (z. B. Sesam auf dem Zopf, Schrift auf dem Brett beim Schweinsbraten, Kräuterquark statt Frischkäse).
3. **Inhalt:** `shows` und `foods` beschreiben, was tatsächlich zu sehen ist, nicht den Kartennamen. Beispiel: Auf dem Chili con Carne liegen Käse und Sauerrahm, die im Rezept nicht vorkommen; darum steht die Käse-Karte (F04.2) in `shows`, und wer Käse ausschliesst, sieht dort den Platzhalter. Auch bei Pizza, Spaghetti Bolognese, Lasagne und Enchiladas steht der sichtbare Käse in `shows`.
4. **Unsicheres** steht als `todo` im Bildnachweis und auf der Prüfseite (Liste unten).
5. **Format:** `python scripts/prepare-card-images.py stock` lädt das Original von images.unsplash.com (`imageUrl` im Nachweis), schneidet auf 4:3 zu und speichert WebP unter 150 KB in `public/cards/`. Sehr feine Motive werden etwas schmaler gespeichert (Bulgur), nie breiter als 1200 px. `check` prüft alle Bilder.
6. **Nachweis:** pro Foto in `src/data/image-credits.json` Fotograf, Profil, Original-URL, Lizenz, Veröffentlichungsdatum und Nachweis nach APA 7, wie bei den bestehenden 60. Die Titel in eckigen Klammern beschreiben den Bildinhalt auf Deutsch und dienen als alt-Text.

## Pexels

Nicht verwendet. Die Pexels-Suche lässt keinen automatischen Zugriff zu (Seite 403, Schnittstelle nur mit Schlüssel, 401). Für die 27 Karten ohne passendes Foto wäre Pexels der nächste Schritt; dafür braucht es einen Pexels-API-Schlüssel des Teams oder eine Suche von Hand.

## Prüfliste (TODO zu shows/foods)

| Karte | Name | TODO |
|---|---|---|
| F02.3.2 | Jakobsmuscheln | Glänzende Sauce in den Schalen, möglicherweise Butter |
| F04.2.3 | Frischkäse | Dunkler Hintergrund; Kaffee und Zucker als Nebensache im Bild |
| F06.1.1 | Zopf | Hagelzucker oder Salzkörner obendrauf (beim Butterzopf unüblich) |
| F13.2.3 | Sesam | Sorte im Bild nicht eindeutig (laut Fotograf geröstete Sesamsamen); prüfen, ob als Sesam erkennbar |
| D02 | Spaghetti Bolognese | Hackfleisch: Fleischart im Bild nicht erkennbar (Rezept: Rind und Schwein) |
| D03 | Lasagne | Füllung im Bild nicht erkennbar (Rezept: Hackfleisch, Béchamel) |
| D09 | Bündner Gerstensuppe | Fleischart im Bild nicht erkennbar (Rezept: Bündnerfleisch und Speck); Rahm nicht sichtbar |
| D11 | Chili con Carne | Käse und Sauerrahm obendrauf, im Rezept nicht vorgesehen (darum Käse in shows); Fleischart im Bild nicht erkennbar |
| D12 | Wienerschnitzel mit Pommes frites | Fleischart im Bild nicht erkennbar (Rezept: Kalbfleisch; ähnlich sieht Schweins- oder Pouletschnitzel aus) |
| D14 | Gemüsewähe | Füllung grün, Gemüsesorte nicht erkennbar (Rezept: Lauch, Ei-Rahm-Guss) |
| D15 | Gemüsecurry mit Reis | Sauce könnte Kokosmilch oder Rahm enthalten |
| D16 | Poulet-Curry mit Reis | Sauce kann Rahm oder Joghurt enthalten |
| D18 | Minestrone | Bohnen im Bild nicht sichtbar; Bouillon unbekannt (Fleisch- oder Gemüsebouillon) |
| D19 | Pad Thai mit Crevetten | Crevetten im Ausschnitt kaum erkennbar; Ei und Fischsauce möglich |
| D21 | Enchiladas mit Poulet | Füllung nicht erkennbar; dunkle Sauce (Mole?) kann Nüsse, Sesam oder Schokolade enthalten |
| D22 | Ratatouille | Sauce unbekannt |

Zwei Fotos stammen aus der Suche nach einer anderen Karte, weil sie genau dieses Gericht zeigen: Wienerschnitzel (gefunden unter Geschnetzeltes) und Bündner Gerstensuppe (gefunden unter Minestrone: Suppe mit Gerste, Fleisch und Gemüse).

## Ohne passendes Bild (Platzhalter)

| Karte | Name | Grund |
|---|---|---|
| F01.1.2 | Truthahn | Trute im Bild nicht von Poulet zu unterscheiden; übrige Fotos mit Festdekor, Händen oder Beilagen |
| F01.2.2 | Rindsgehacktes | Nur Burger-Patties, Steaks oder gebratenes Hackfleisch mit anderen Zutaten |
| F01.2.3 | Kalbfleisch | Kalb im Bild nicht erkennbar (nur Tiere, Steaks oder Text) |
| F01.3.2 | Schweinsbraten | Nur Braten mit Schrift auf dem Brett, Roastbeef oder Pulled Pork |
| F02.1.2 | Kabeljau | Nur Zeichnungen, lebende Fische, Forellen oder ein Verpackungsetikett |
| F02.1.3 | Egli | Nur ganze Fische anderer Arten, Fische mit Händen oder Gemälde |
| F02.1.4 | Thunfisch | Nur Dosen mit Markenlogos oder Thon-Salat auf Brot |
| F04.1.2 | Skyr | Keine Fotos (die Suche liefert Island-Landschaften) |
| F04.1.4 | Fruchtjoghurt | Nur Erdbeeren mit Rahm, Milch oder Granola; Fruchtjoghurt nicht erkennbar |
| F04.2.2 | Weichkäse | Nur Käseplatten mit anderen Sorten, Honig oder Preisschildern |
| F06.2.2 | Vollkorntoast | Nur Vollkornbrot, kein Toast erkennbar |
| F06.3.2 | Mehrkornknäcke | Fast nur Fotos eines Markenkontos mit Verpackung, sonst Pita |
| F07.2 | Vollkornpasta | Sorte im Bild nicht erkennbar (normale Pasta) |
| F07.2.1 | Vollkornspaghetti | Sorte im Bild nicht erkennbar (Spaghettigerichte ohne Hinweis auf Vollkorn) |
| F07.2.2 | Dinkelpasta | Sorte im Bild nicht erkennbar (normale Pasta, Brot oder Getreide) |
| F07.3 | Pasta aus Hülsenfrüchten | Sorte im Bild nicht erkennbar (Pastagerichte ohne Hinweis auf Hülsenfrüchte) |
| F07.3.1 | Linsenpasta | Sorte im Bild nicht erkennbar (Pastagerichte oder rote Linsen ohne Pasta) |
| F07.3.2 | Kichererbsenpasta | Sorte im Bild nicht erkennbar (Pastagerichte mit Kichererbsen daneben) |
| F10.1.2 | Nüsslisalat | Die Suche liefert Kopfsalat, Maissalat oder Autos (Ford Mach-E) |
| F10.1.3 | Rucola | Nur Rucola mit Spiegelei und Käse, auf Pizza oder als Pflanze |
| F13.1.7 | Paranüsse | Nur gemischte Nüsse; sonst Landschaften in Brasilien |
| D04 | Älplermagronen | Nur Mac and Cheese ohne Kartoffeln, Röstzwiebeln und Apfelmus |
| D05 | Rösti mit Spiegelei | Nur Frühstücksteller mit Speck, Waffeln oder Toast; Rösti mit Preisschild |
| D06 | Zürcher Geschnetzeltes mit Rösti | Nur Rahmsaucen mit Pasta oder Poulet, nie mit Rösti |
| D08 | Raclette mit Gschwellti | Nur Ofenkäse mit Händen oder Kartoffelgerichte ohne Raclette |
| D13 | Eglifilets mit Salzkartoffeln | Nur ganze Fische anderer Arten oder rohe Filets; Eglifilets mit Kartoffeln nicht gefunden |
| D17 | Birchermüesli | Nur Haferbrei, Granola-Gläser oder Overnight Oats mit anderen Früchten; Birchermüesli nicht erkennbar |

Die gleiche Liste steht maschinenlesbar in `src/data/image-credits.json` (`withoutPhoto`, mit den gesuchten Begriffen). Ein Test prüft, dass jede Karte ohne Bild dort steht.

## Prüfseite

`docs/bilder-review.html` zeigt alle 167 Karten als Raster mit Bild, Karten-ID, Name, alt-Text, shows, foods, Quelle (mit Link zum Foto) und TODOs, dazu die Prüfliste und die Liste ohne Bild; Filter „Nur TODO“ und „Nur ohne Bild“. Nur lokal für das Team, in der App nicht verlinkt (sie liegt in `docs/`, nicht in `public/`). Lokal im Browser öffnen; neu erzeugen mit `python scripts/prepare-card-images.py review`.

## Offen

- **27 Karten ohne Foto:** eigene Fotos, Pexels (Schlüssel) oder eine gezielte Suche von Hand. Besonders Schweizer Gerichte (Älplermagronen, Rösti, Zürcher Geschnetzeltes, Raclette, Eglifilets, Birchermüesli) finden sich auf Unsplash kaum in passender Form.
- **Prüfliste:** die 16 TODOs ansehen; wo nötig `shows` oder `foods` in `image-credits.json` ergänzen und `prepare-card-images.py stock` erneut ausführen.
- **Einheitlicher Stil:** Die Fotos stammen von vielen Fotografinnen und Fotografen, einige mit dunklem Hintergrund. Ob das die Bewertung beeinflusst (Annahme 5), im Pilot mit `imageSource` und `imageShown` beobachten.
