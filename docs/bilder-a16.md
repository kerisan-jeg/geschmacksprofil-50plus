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

## Nachtrag 21.10.2026: Bilder auf allen Karten

Wunsch des Teams nach A16: „überall Bilder“. Seither zeigt **jede der 167 Karten ein Foto**.

**Gruppen (Runde 1):** Die 13 Gruppen zeigen wieder Fotos statt des neutralen Tellers: je drei vorhandene Fotos, zusammengesetzt wie das frühere Bildraster (erstes gross links). Das ändert Verbesserung 4 aus dem Dozentenfeedback (Tibor: in Runde 1 keine Beispiele, auch nicht im Bild). Der Teller bleibt als Option: `GROUP_IMAGES = false` in src/config.js. Mit Tibor besprechen (siehe docs/dozentenfeedback-2026-10-19.md, „Noch offen“).

**Ausschlüsse:** Jedes der drei Fotos ist zusätzlich als Teilbild gespeichert (`public/cards/parts/{Gruppe}-{n}.webp`, je mit eigenen shows und foods). Zeigt ein Teil Ausgeschlossenes, setzt die App das Gruppenbild aus den erlaubten Teilen zusammen. Beispiel: Ohne Schweinefleisch zeigt „Fleisch und Geflügel“ nur Poulet und Rind. Nur wenn kein Teil erlaubt ist, erscheint der Platzhalter. Die Antwortzeit beginnt, wenn alle Teile geladen sind.

**Die 27 Karten ohne passendes Foto** haben nach einer zweiten Suche (49 weitere Begriffe) ein Foto. Wo es nicht genau die Karte zeigt, beschreibt der alt-Text ehrlich den Bildinhalt, und ein TODO nennt die Abweichung. „Ersatzbild“ heisst: Das Foto zeigt etwas Verwandtes, nicht die Karte selbst.

| Karte | Name | Bild | TODO |
|---|---|---|---|
| F01.1.2 | Truthahn | Ganzer gebratener Truthahn auf einem Bratrost | Ganzer Truthahn statt Trutenbrust |
| F01.2.2 | Rindsgehacktes | Rohe Hackfleisch-Burger mit Salz und Pfeffer auf einem Holzbrett | Fleischart im Bild nicht sicher erkennbar (vermutlich Rind) |
| F01.2.3 | Kalbfleisch | Rohe, marinierte Plätzli auf einem Holzbrett, daneben kleine Peperoni und Chili | Fleischart im Bild nicht erkennbar (Kalb, Schwein oder Pute); Peperoni und Chili als Dekoration |
| F01.3.2 | Schweinsbraten | Knusprig gebratene Schweinebauchscheiben auf einem weissen Teller | Schweinebauch statt klassischem Schweinsbraten |
| F02.1.2 | Kabeljau | Rohe weisse Fischfilets auf Eis | Fischart im Bild nicht sicher erkennbar (weisser Fisch, vermutlich Kabeljau) |
| F02.1.3 | Egli | Zwei rohe Fischfilets auf einem dunklen Brett, daneben Schälchen mit Rahm, Kräutern und Salz | Fischart nicht erkennbar (eher Plattfisch als Egli); Schälchen links vermutlich Rahm |
| F02.1.4 | Thunfisch | Ein rohes Stück Thunfisch auf einem Holzbrett | Roher Thunfisch statt Thon aus der Dose |
| F04.1.2 | Skyr | Dicker weisser Joghurt mit Minze in einer Schale | Skyr im Bild nicht von griechischem Joghurt zu unterscheiden |
| F04.1.4 | Fruchtjoghurt | Himbeerjoghurt mit frischen Himbeeren in einer Schale | – |
| F04.2.2 | Weichkäse | Ein Stück Weichkäse mit weisser Rinde auf einem Holzbrett | Im Hintergrund unscharf weitere Käse, Trauben und Trockenfrüchte |
| F06.2.2 | Vollkorntoast | Vier Scheiben Vollkorntoast mit Körnern auf einem Holzbrett | Körner auf der Rinde, Sorte unbekannt (Sesam möglich) |
| F06.3.2 | Mehrkornknäcke | Mehrkorn-Knäckebrot mit Saaten auf einem Holzbrett, ein Stück mit Aufstrich | Aufstrich auf einem Stück (Butter oder Frischkäse?); Saaten unbekannt |
| F07.2 | Vollkornpasta | Vollkornpenne mit Peperoni und Oliven in einer weissen Schale | Gericht mit Peperoni, Oliven und Sauce; Sorte nicht sicher (dunkle Penne) |
| F07.2.1 | Vollkornspaghetti | Trockene dunkle Spaghetti, Nahaufnahme | Sorte nicht sicher (dunkle Spaghetti, vermutlich Vollkorn) |
| F07.2.2 | Dinkelpasta | Helle Nudelnester zum Trocknen | Ersatzbild: Sorte nicht erkennbar (Dinkel nicht sichtbar) |
| F07.3 | Pasta aus Hülsenfrüchten | Trockene Farfalle mit weissen Bohnen, Knoblauch, Zwiebel und Rüebli | Ersatzbild: normale Farfalle mit weissen Bohnen daneben |
| F07.3.1 | Linsenpasta | Rote Linsen, formatfüllend | Ersatzbild: rote Linsen, keine Linsenpasta |
| F07.3.2 | Kichererbsenpasta | Pasta mit Kichererbsen und Salat auf einem Teller | Ersatzbild: Pasta mit Kichererbsen daneben |
| F10.1.2 | Nüsslisalat | Ein Bund Nüsslisalat in einer weissen Schale | Sorte nicht sicher (Nüsslisalat oder Kopfsalat) |
| F10.1.3 | Rucola | Frische Rucolablätter | – |
| F13.1.7 | Paranüsse | Gemischte Nüsse mit Paranüssen, Baumnüssen, Mandeln, Haselnüssen und Pekannüssen | Ersatzbild: gemischte Nüsse statt nur Paranüsse |
| D04 | Älplermagronen | Muschelnudeln mit Käsesauce in einem Topf | Ersatzbild: Kartoffeln, Röstzwiebeln und Apfelmus fehlen |
| D05 | Rösti mit Spiegelei | Gestapelte Rösti auf einem weissen Teller | Spiegelei fehlt |
| D06 | Zürcher Geschnetzeltes mit Rösti | Fleischstreifen in Rahm-Pilzsauce mit Bandnudeln und Sauerrahm | Mit Bandnudeln statt Rösti; Fleischart nicht erkennbar |
| D08 | Raclette mit Gschwellti | Überbackene Kartoffel mit geschmolzenem Käse | Ersatzbild: Raclette-Käse, Gschwellti und Essiggurken nicht erkennbar |
| D13 | Eglifilets mit Salzkartoffeln | Zwei gebratene Fischfilets in der Pfanne | Fischart nicht erkennbar; Kartoffeln fehlen |
| D17 | Birchermüesli | Haferbrei mit Apfelstücken und Gewürz in einer weissen Schale | Haferbrei statt Birchermüesli; Joghurt und Nüsse nicht sichtbar |

Damit gibt es 42 Bilder mit TODO (16 aus A16, 25 aus der Nachsuche, dazu das Gruppenbild Kartoffeln: Püree kann Milch enthalten). Milchprodukte im Bild (Rahm, Butter, Sauerrahm) stehen als `F04` in shows: Ist alles Milchige ausgeschlossen, fällt das Bild weg. Sichtbare Zutaten anderer Karten (z. B. Peperoni, Bohnen, Bandnudeln mit Ei) stehen ebenso in shows.

Die Liste „ohne passendes Bild“ (`withoutPhoto`) ist leer.

## Offen

- **Ersatzbilder ersetzen:** Für die 27 Karten aus der Nachsuche (v. a. Schweizer Gerichte und Spezialpasta) wären eigene Fotos oder Pexels (Schlüssel) besser.
- **Prüfliste:** die 42 TODOs ansehen; wo nötig `shows` oder `foods` in `image-credits.json` ergänzen und `prepare-card-images.py stock` erneut ausführen.
- **Einheitlicher Stil:** Die Fotos stammen von vielen Fotografinnen und Fotografen, einige mit dunklem Hintergrund. Ob das die Bewertung beeinflusst (Annahme 5), im Pilot mit `imageSource` und `imageShown` beobachten.
