# Allergieauswahl und Profilübersicht, 24.10.2026

Die bestehende Navigation bleibt erhalten: Das Dashboard ist Teil von „Mein Profil“ (Variante A).

## Sechs Vorschläge und vollständige Suche

`allergens.json` markiert genau sechs Kategorien mit `common`: Gluten, Laktose, Milcheiweiss, Nüsse inklusive Erdnüsse, Eier und Soja. Das ist eine kompakte Projektauswahl, keine statistische Rangfolge der häufigsten Allergien. Die vorhandene Nussgruppe bleibt aus Gründen der Daten- und Bedienkonsistenz erhalten; Erdnüsse und einzelne Schalenfrüchte haben weiterhin eigene IDs und können einzeln gewählt werden.

Laktoseintoleranz und Milcheiweissallergie bleiben getrennt. Die fachliche Unterscheidung wurde mit [aha! Allergiezentrum Schweiz](https://www.aha.ch/allergiezentrum-schweiz/allergien-intoleranzen/nahrungsmittelallergien/milchallergie) abgeglichen. Die Auswahl dient dem Erfassen bereits bekannter Einschränkungen.

`AllergenPicker` verwendet dieselben IDs und Auswahlfunktionen für Kacheln und Suchtreffer. Fisch, Krebstiere und alle weiteren vorhandenen Allergene bleiben im Suchindex. Gesuchte Auswahlen erzeugen Chips, keine zusätzlichen Kacheln. Die Funktion zum Erweitern der Kachelliste entfällt vollständig. Bereits durch andere Angaben abgedeckte Kacheln bleiben deaktiviert sichtbar; bereits ausgewählte Einträge bleiben entfernbar.

Suche, Mehrfachauswahl, Synonyme, Tippfehlervorschläge und manuelle Notizen verwenden die vorhandenen Komponenten. Nicht zugeordneter Freitext behält `freeText: true` und den Status „prüfen“. Ein sichtbarer Hinweis erklärt vor und nach der Eingabe, dass dies keinen verlässlich geprüften Ausschluss darstellt. Die bisherige Berücksichtigung passender Namen und bekannter Zutaten bleibt erhalten; daraus entsteht keine Zusicherung vollständiger Allergenprüfung.

## Dashboard und Details

`buildDashboard` liefert zusätzlich `responses` und `summary`. Die Auswertung verwendet eindeutige Karten-IDs aus Swipe-Antworten und im Profil bestätigten Vermutungen, jeweils mit der letzten direkten Antwort. Entfernte Bewertungen, nicht bestätigte Vermutungen und `INTOLERANT` zählen nicht in die vier Antwortkategorien. Die Überschrift lautet deshalb „Karten mit Antwort“, nicht „Lebensmittel bewertet“: Gruppen und unbekannte Karten sind darin enthalten.

Die vier Kategorien folgen der bestehenden Semantik:

- `PREFER`: „Mag ich sehr“, eine ausdrücklich stärkere Vorliebe, kein relativer Paarvergleich.
- `LIKE`: „Mag ich“.
- `DISLIKE`: „Mag ich nicht“, weiterhin kein harter Ausschluss. Positive Ausnahmen bleiben erkennbar.
- `UNFAMILIAR`: „Kenne ich nicht“, inklusive unbekannter Gerichte, keine negative Geschmacksbewertung.

Die Länge jedes Balkens entspricht der Anzahl der Kategorie geteilt durch die Gesamtzahl dieser vier Kategorien. Absolute Anzahlen bleiben lesbar; Farbe ist nicht der einzige Informationsträger. Bei null Antworten sind alle Balken leer. Es gibt keine erfundenen Geschmacksdimensionen oder statistischen Schlussfolgerungen. Gruppen, Lebensmittel und Gerichte werden mit vorhandenen Katalogfunktionen unterschieden und in den Detailzeilen beschriftet.

Native `details`/`summary` in `ProfileDisclosure` halten alle Listen standardmässig geschlossen. Enter und Leertaste funktionieren ohne eigene Tastatursteuerung. Die vorhandenen Bewertungsdialoge bleiben zugänglich. Vermutungen, offene Gruppen, Zubereitungsunterschiede und Küchentendenzen stehen unter „Weitere Einblicke“. Ausschlüsse und Alltag haben eigene aufklappbare Bereiche; Ernährungsform und Anzahl der Ausschlüsse beziehungsweise ungeprüften Notizen sind schon in der geschlossenen Übersicht sichtbar.

Swipe-Auswahl, Geschmacksmodell, Profilfortschritt, Ereignisprotokoll und Speicherformat bleiben unverändert. Keine neue Projektabhängigkeit oder Diagrammbibliothek: Die Balken verwenden CSS und vorhandene Designtokens.

## Prüfung

`npm test` prüft die gesamte vorhandene Testsuite sowie ergänzte Komponenten- und Logiktests: sechs Kacheln, kombinierte Auswahl, Suchauswahl, entfernbare Chips, Wiederherstellung, Sicherheitsfilter, ungeprüfte Notizen, geschlossene Details, leere Kategorien, aktuelle Zähler, unbekannte Gerichte sowie Änderung und Entfernung einer Bewertung. `npm run build` prüft den Produktions-Build.

Das vorhandene `scripts/check-mobile.py` wurde an die neuen Bedienelemente angepasst. Der vollständige Ablauf bleibt bei 360 × 640 an einem überlagerten Antwortknopf im Swipe-Bildschirm hängen; dieser Bildschirm wurde in dieser Änderung nicht angepasst. Die betroffenen Ansichten werden zusätzlich unabhängig davon auf 360 × 640, 430 × 932, 1280 × 900 und auf 360 × 640 mit 130 % Schrift geprüft, einschliesslich Touchflächen, Kontrasten, Überlauf, Tastaturbedienung, Navigation und Neuladen.

Diese gezielte Prüfung ist mit `python scripts/check-profile.py` reproduzierbar, während `npm run preview` läuft. Sie nutzt dieselben Messungen wie `check-mobile.py` und synthetische Daten in einem isolierten Browserprofil. Voraussetzungen: Python Playwright und Chromium; alternativ `GP_BROWSER_CHANNEL=chrome` für einen installierten Chrome. Ergebnis: 40 Ansichtsprüfungen ohne Befund, zusätzlich erfolgreiche Funktionsprüfungen für Auswahl, Navigation, Neuladen, Bewertungsänderung und Bestätigung einer Vermutung. Die vollständige automatisierte Testsuite umfasst 314 erfolgreiche Tests. Der Produktions-Build ist erfolgreich; Vite meldet weiterhin die bereits vorhandene Deprecation-Warnung zu `advancedChunks`.
