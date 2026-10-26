# 10 Zusammenfassung für das Team

Kurzfassung der Analyse vom 26.10.2026 (Commit `60bc8c5`, Regeln `demo-0.6`) zur Vorbereitung auf das Gespräch mit dem Dozenten. Details und Belege in den Dokumenten 01 bis 09.

## Wie funktioniert unsere Anwendung eigentlich?

Alles läuft im Browser, ohne Server. Die Person beantwortet drei Fragen (Ernährungsform, Allergien, „Nie vorschlagen“), bestätigt die Regeln und wischt dann vier Runden: Gruppen, Untergruppen, einzelne Lebensmittel, Gerichte. Jede Antwort ist ein Ereignis in einem Protokoll; aus diesem Protokoll berechnet die App bei jedem Schritt neu, welche Karte als Nächstes kommt und wie das Profil aussieht. Nichts wird überschrieben, Rückgängig ist ein eigenes Ereignis. Die ganze Logik steht in `src/logic/` als reine Funktionen und ist mit 340 Tests abgedeckt.

## Wie beeinflusst eine Swipe-Entscheidung die folgenden Runden?

- **Runde 1** ist für alle gleich: alle erlaubten Gruppen in Katalogreihenfolge.
- **Runde 2** reagiert auf die Antwort zur Gruppe: „Kenne ich nicht“ → eine Klärungskarte (höchstens zwei); „Eher ungern“ → eine plausible Ausnahme (Hülsenfrüchte → Sojaprodukte), die übrigen Untergruppen nur, wenn ganz am Schluss Platz bleibt; „Eher gern“ oder „Sehr gern“ → zwei Kontrast-Untergruppen (Obst → Beeren und Zitrusfrüchte). Die sechs Kontrollkarten beenden Runde 2.
- **Runde 3** vertieft nur, was in Runde 2 bewertet wurde: bis zwei Lebensmittel je positiver Untergruppe, drei bei „Mag ich sehr“, zuerst Ausnahmen und Unterschiede, negative Zweige zuletzt. Nie gefragte Untergruppen werden nicht vertieft, sondern vermutet.
- **Runde 4** zeigt die erlaubten Gerichte, sortiert nach den bisherigen Zutatenvorlieben. Gerichtsantworten verändern nichts an den Zutaten.
- „Vertrage ich nicht“ schliesst die Karte in allen weiteren Runden aus. „Mag ich nicht“ schliesst nie aus.

## Warum werden die jeweiligen Karten ausgewählt?

Nach festen Rängen aus dem nurec-Konzept (Kapitel 6 und 11): Klärung vor Ausnahme vor Kontrast vor Vertiefung vor negativen Zweigen. Innerhalb eines Rangs wechseln sich die Gruppen ab. Harte Ausschlüsse gelten vor allem anderen. Jeder Grund steht als `selectionReason` im Protokoll; `node scripts/ablauf-beispiele.mjs` zeigt für drei Beispielpersonen jede Karte mit Grund.

## Wie kommt das fertige Geschmacksprofil zustande?

Vier getrennte Teile: (1) die direkten Antworten je Karte in vier Kategorien, (2) Vermutungen für unbewertete Karten aus der nächsten bewerteten Gruppe darüber, pro Stufe halbiert, nur als Richtung, (3) der Profilstand „Profil aufgebaut“ als Erfassungsgrad (35 Punkte Gruppen, 30 Zweige, 35 Lebensmittel), keine Trefferquote, (4) Dashboard-Listen: Favoriten nur aus konkreten Lebensmitteln, Gruppen, „eher ungern“ mit Ausnahmen, roh gegenüber gegart, Gerichte und Küchentendenz ab drei Gerichten.

## Was haben wir erfolgreich getestet?

314 bestehende Tests und 26 neue (T01 bis T23) laufen grün: normale Nutzung, eine Allergie, mehrere Ausschlüsse, vegetarisch und vegan, halal, überwiegend positiv, negativ und unbekannt, verschiedene Antworten über Runden, stark eingeschränkte Gerichte, Wiederholbarkeit, Profilkonsistenz, keine Karten übrig, „Vertrage ich nicht“, Rückgängig, Kontrollkarten, Anzahl Gerichte, drei vollständige Ablaufbeispiele. Der Build läuft. Nicht getestet: echte Nutzung durch Personen ab 50, echte Geräte, echte SMS.

## Warum erscheinen oft nur etwa sieben Gerichte?

Es gibt keine feste Sieben. Das Limit ist 13, der Katalog hat 22 Gerichte, aber 15 davon sind mit Laktose und Milcheiweiss getaggt (vorsichtig, auch Butter und Rahm). Wer Laktose oder Milcheiweiss angibt, sieht genau sieben. Gluten acht, vegan vier. Empfehlung: vor der Studie nichts ändern; zehn Gerichte wären für Eingeschränkte nicht erreichbar und für Uneingeschränkte eine Kürzung.

## Welche Probleme müssen wir vor der Befragung lösen?

1. **B1:** „Vertrage ich nicht“ beim Wischen wirkt über die Karte, nicht über das Allergen-Tag. Nach „Vertrage ich nicht“ bei Eiern bleiben Zopf, Lasagne und Schnitzel möglich. Entscheid: Tags mit ausschliessen (kleine Änderung) oder Text und Anweisung anpassen.
2. **B3:** Runde 2 hat sieben normale Plätze; elf Gruppen bräuchten bis zu 22 Kontrastkarten. Welche Gruppen vertieft werden, hängt deshalb von der Katalogreihenfolge ab. Entscheid: so lassen und als Grenze beschreiben, oder Kontrollkarten auf vier senken, oder Limit anpassen.
3. **Konfiguration einfrieren:** eine URL, ein Git-Tag, `APP_VERSION` und `RULE_VERSION` im Protokoll, keine Deployments während der Studie; Gruppenbilder mit dem Dozenten klären; Registrierung aus oder SMS simuliert.
4. **Einwilligung:** Ausschlüsse sind Gesundheitsdaten; Text und Speicherung klären.
5. Geräte vor jeder Person zurücksetzen, Export-Ablauf üben, ein manueller Durchlauf mit der eingefrorenen Version.

Danach Pilot mit 5 bis 10 Personen, dann die Hauptstudie ohne weitere funktionale Änderungen.

## Sätze, die wir dem Dozenten sagen können

- „Die Auswahl ist deterministisch und nachvollziehbar; jeder Grund steht im Protokoll, und wir können jede Sitzung nachspielen.“
- „Eine negative Bewertung schliesst nie aus; Allergien und Ernährungsform stehen über jedem Geschmack und wirken in allen Runden.“
- „Der Engpass ist Runde 2 mit sieben normalen Plätzen; wir haben das gemessen und entscheiden bewusst, wie wir damit umgehen.“
- „Die sieben Gerichte sind eine Folge der vorsichtigen Allergen-Tags, keine Programmgrenze.“
- „Der Prozentwert im Profil ist ein Erfassungsgrad; die Genauigkeit messen wir über die Kontrollkarten.“
