# 10 Zusammenfassung für das Team

Kurzfassung der Analyse vom 26.10.2026 (Commit `60bc8c5`, Regeln `demo-0.6`) zur Vorbereitung auf das Gespräch mit dem Dozenten, nachgeführt am 28.10.2026 (Regeln `demo-0.7`). Details und Belege in den Dokumenten 01 bis 09.

## Was sich am 28. und 29.10.2026 geändert hat (Teamentscheide)

- **Anmeldung nur mit dem Vornamen:** keine Handynummer, kein SMS-Code, kein Firebase. Der Vorname stand vom 28. bis 29.10. als `participantName` in Sitzung und Export; seit dem 30.10.2026 bleibt er auf dem Gerät (`PRIVACY.logParticipantName = false`), weil die Sitzungen jetzt zentral gesammelt werden.
- **Über dich:** Die Einwilligung ist ein Kästchen mit kleinem Text unter den Altersfeldern, weiterhin Pflicht.
- **Frage 1:** Die Speisevorschriften (Halal, Koscher) sind zugeklappt; erst öffnen, dann wählen.
- **Frage 2:** ohne „Ich bin mir nicht sicher, ob es weitere gibt“, ohne „ärztlich oder fachlich festgestellt“, ohne „Ganz meiden / Kleine Mengen gehen“. Laktose ist immer ein voller Ausschluss. „Vertrage ich nicht“ bleibt beim Wischen in allen vier Runden.
- **Frage 3:** ohne Marken und Herkunft.
- **Alltagsprofil** („Alltag ergänzen“) entfernt.
- **Runde 4 (Gerichte):** kein Kartenlimit mehr; alle erlaubten Gerichte, sortiert nach den Zutatenbewertungen (passendste zuerst). Der Geschmacksfilter vom 28.10. ist seit dem 29.10.2026 wieder weg, weil das Team im Test nur sieben Gerichte sah; „Runde beenden“ steht von der ersten Karte an unter den Antwortknöpfen, nach zehn Gerichten fragt die App „Weitere Gerichte ansehen“ oder „Runde beenden“.
- **Katalog (29.10.2026):** 42 neue Gerichte mit Unsplash-Fotos, neu 64 statt 22, darunter viele ohne Milch und Gluten (Laktose: 32 statt 7, vegan: 12 statt 4). Neue Küchen griechisch, spanisch, orientalisch, indisch, japanisch, amerikanisch. Alle neuen Gerichte sind Team-Ergänzungen [V] mit konservativen Tags und mit nurec zu prüfen (Liste in [bilder-a16.md](bilder-a16.md), Nachtrag 29.10.).
- **Bilder:** Egli und Chili con Carne haben neue Fotos ohne Rahm bzw. Käse, Mehrkornknäcke zeigt das Knäckebrot-Foto ohne Butter, Kerne und Samen ein Foto ohne Mandel: Diese Karten zeigten bei Laktose, Milcheiweiss, vegan bzw. Nussallergie den Platzhalter, weil das Foto Ausgeschlossenes zeigte. Alle Karten ausser den Gruppen haben ein Foto; Gruppenbilder bestehen weiterhin aus Teilen, von denen einzelne bei Ausschlüssen wegfallen können.

## Was am 30.10.2026 dazukam (Vorschlag vom 29.10.)

- **Zentrale Speicherung:** Die Sitzung geht nach der Einwilligung laufend an eine Datenbank des Teams (Supabase/PostgREST), auch bei Abbruch bleiben die Daten erhalten. Der öffentliche Schlüssel im Build kann nur schreiben, gelesen wird nur mit dem Team-Schlüssel über `npm run export:zentral`. **Offen:** Supabase-Projekt anlegen und die beiden Repository-Variablen setzen (Anleitung in [zentrale-speicherung.md](zentrale-speicherung.md)); bis dahin bleibt alles auf dem Gerät, und die App sagt das.
- **Kurze Befragung** nach dem Profil: Bedienung, Verständlichkeit der Antwortmöglichkeiten, Passung des Profils, Länge (je Auswahl) und „Was war unklar oder hat dir gefehlt?“ (frei). Erreichbar, sobald eine Runde abgeschlossen oder beendet ist.
- **Abschlussbestätigung** mit Teilnahmenummer; „Vielen Dank“ erst, wenn die Übertragung gelungen ist, sonst „Erneut senden“.
- **Texte:** Studieninformation auf dem Startbildschirm, Einwilligung nennt die Übermittlung an das Projektteam, „Was wird gespeichert?“ aufklappbar. „Deine Angaben bleiben auf diesem Gerät“ steht nur noch, wenn keine zentrale Speicherung eingerichtet ist. Der Vorname bleibt auf dem Handy; App-Daten und Befragung hängen über die Teilnahmenummer zusammen.
- **Nächster Schritt:** begleiteter Pilottest mit 5 bis 10 Personen ab 50, dabei prüfen, dass jede Sitzung in der Tabelle ankommt.


## Wie funktioniert unsere Anwendung eigentlich?

Alles läuft im Browser; einen eigenen Server gibt es nicht, nur die Datenbank, an die die Sitzung seit dem 30.10.2026 übertragen wird. Die Person beantwortet drei Fragen (Ernährungsform, Allergien, „Nie vorschlagen“), bestätigt die Regeln und wischt dann vier Runden: Gruppen, Untergruppen, einzelne Lebensmittel, Gerichte. Jede Antwort ist ein Ereignis in einem Protokoll; aus diesem Protokoll berechnet die App bei jedem Schritt neu, welche Karte als Nächstes kommt und wie das Profil aussieht. Nichts wird überschrieben, Rückgängig ist ein eigenes Ereignis. Die ganze Logik steht in `src/logic/` als reine Funktionen und ist mit 340 Tests abgedeckt.

## Wie beeinflusst eine Swipe-Entscheidung die folgenden Runden?

- **Runde 1** ist für alle gleich: alle erlaubten Gruppen in Katalogreihenfolge.
- **Runde 2** reagiert auf die Antwort zur Gruppe: „Kenne ich nicht“ → eine Klärungskarte (höchstens zwei); „Eher ungern“ → eine plausible Ausnahme (Hülsenfrüchte → Sojaprodukte), die übrigen Untergruppen nur, wenn ganz am Schluss Platz bleibt; „Eher gern“ oder „Sehr gern“ → zwei Kontrast-Untergruppen (Obst → Beeren und Zitrusfrüchte). Die sechs Kontrollkarten beenden Runde 2.
- **Runde 3** vertieft nur, was in Runde 2 bewertet wurde: bis zwei Lebensmittel je positiver Untergruppe, drei bei „Mag ich sehr“, zuerst Ausnahmen und Unterschiede, negative Zweige zuletzt. Nie gefragte Untergruppen werden nicht vertieft, sondern vermutet.
- **Runde 4** wählt die 13 passendsten erlaubten Gerichte aus dem gesamten Katalog (64 Gerichte) anhand der Zutatenbewertungen aus Runde 1 bis 3. Konkrete Angaben haben Vorrang vor Untergruppen und Gruppen. Sie teilt dasselbe Kartenlimit wie die Vorrunden und endet automatisch beim Limit oder wenn weniger erlaubte Gerichte übrig sind (Korrektur 29.10.2026, `demo-0.9`). „Runde beenden“ steht von Anfang an bereit; die Nachfrage nach zehn Gerichten entfällt. Gerichtsantworten verändern nichts an den Zutaten.
- „Vertrage ich nicht“ schliesst die Karte in allen weiteren Runden aus. „Mag ich nicht“ schliesst nie aus.

## Warum werden die jeweiligen Karten ausgewählt?

Nach festen Rängen aus dem nurec-Konzept (Kapitel 6 und 11): Klärung vor Ausnahme vor Kontrast vor Vertiefung vor negativen Zweigen. Innerhalb eines Rangs wechseln sich die Gruppen ab. Harte Ausschlüsse gelten vor allem anderen. Jeder Grund steht als `selectionReason` im Protokoll; `node scripts/ablauf-beispiele.mjs` zeigt für drei Beispielpersonen jede Karte mit Grund.

## Wie kommt das fertige Geschmacksprofil zustande?

Vier getrennte Teile: (1) die direkten Antworten je Karte in vier Kategorien, (2) Vermutungen für unbewertete Karten aus der nächsten bewerteten Gruppe darüber, pro Stufe halbiert, nur als Richtung, (3) der Profilstand „Profil aufgebaut“ als Erfassungsgrad (35 Punkte Gruppen, 30 Zweige, 35 Lebensmittel), keine Trefferquote, (4) Dashboard-Listen: Favoriten nur aus konkreten Lebensmitteln, Gruppen, „eher ungern“ mit Ausnahmen, roh gegenüber gegart, Gerichte und Küchentendenz ab drei Gerichten.

## Was haben wir erfolgreich getestet?

318 Tests (Stand 29.10.2026, darunter die 26 Studienszenarien T01 bis T23) laufen grün: normale Nutzung, eine Allergie, mehrere Ausschlüsse, vegetarisch und vegan, halal, überwiegend positiv, negativ und unbekannt, verschiedene Antworten über Runden, stark eingeschränkte Gerichte, Wiederholbarkeit, Profilkonsistenz, keine Karten übrig, „Vertrage ich nicht“, Rückgängig, Kontrollkarten, Anzahl Gerichte, drei vollständige Ablaufbeispiele. Der Build läuft. Nicht getestet: echte Nutzung durch Personen ab 50, echte Geräte.

## Warum erscheinen oft nur etwa sieben Gerichte?

Es gab keine feste Sieben: Bis zum 28.10.2026 hatte der Katalog 22 Gerichte, 15 davon mit Laktose und Milcheiweiss getaggt (vorsichtig, auch Butter und Rahm); wer Laktose oder Milcheiweiss angab, sah genau sieben. Seit dem 29.10.2026 hat der Katalog 64 Gerichte: ohne Einschränkung 64 erlaubt, bei Laktose oder Milcheiweiss 32, Gluten 29, vegetarisch 32, vegan 12. Seit der Korrektur `demo-0.9` wählt Runde 4 daraus höchstens 13, bei vegan daher höchstens 12. Ausschlüsse bleiben vorrangig.

## Welche Probleme müssen wir vor der Befragung lösen?

1. **B1:** „Vertrage ich nicht“ beim Wischen wirkt über die Karte, nicht über das Allergen-Tag. Nach „Vertrage ich nicht“ bei Eiern bleiben Zopf, Lasagne und Schnitzel möglich. Entscheid: Tags mit ausschliessen (kleine Änderung) oder Text und Anweisung anpassen.
2. **B3:** Runde 2 hat sieben normale Plätze; elf Gruppen bräuchten bis zu 22 Kontrastkarten. Welche Gruppen vertieft werden, hängt deshalb von der Katalogreihenfolge ab. Entscheid: so lassen und als Grenze beschreiben, oder Kontrollkarten auf vier senken, oder Limit anpassen.
3. **Konfiguration einfrieren:** eine URL, ein Git-Tag, `APP_VERSION` und `RULE_VERSION` im Protokoll, keine Deployments während der Studie; Gruppenbilder mit dem Dozenten klären; Anmeldung nur mit Vornamen (seit dem 28.10.2026 ohne SMS).
4. **Einwilligung:** Ausschlüsse sind Gesundheitsdaten; Text und Speicherung klären.
5. Geräte vor jeder Person zurücksetzen, Export-Ablauf üben, ein manueller Durchlauf mit der eingefrorenen Version.

Danach Pilot mit 5 bis 10 Personen, dann die Hauptstudie ohne weitere funktionale Änderungen.

## Sätze, die wir dem Dozenten sagen können

- „Die Auswahl ist deterministisch und nachvollziehbar; jeder Grund steht im Protokoll, und wir können jede Sitzung nachspielen.“
- „Eine negative Bewertung schliesst nie aus; Allergien und Ernährungsform stehen über jedem Geschmack und wirken in allen Runden.“
- „Der Engpass ist Runde 2 mit sieben normalen Plätzen; wir haben das gemessen und entscheiden bewusst, wie wir damit umgehen.“
- „Die sieben Gerichte sind eine Folge der vorsichtigen Allergen-Tags, keine Programmgrenze.“
- „Der Prozentwert im Profil ist ein Erfassungsgrad; die Genauigkeit messen wir über die Kontrollkarten.“
