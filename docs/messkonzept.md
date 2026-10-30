# Messkonzept: Kontrollkarten und Lernkurve

Stand 18.10.2026, Prototyp Version 0.8 (Regeln `demo-0.5`, Ablauf `staged-v1`). Vier Ebenen in vier Runden nach Ablaufgrafik des Dozenten und Teamvorgabe; Messverfahren als Teamvorschlag [V].
Quellenlabels wie im README: [A] Aufgabenstellung, [K] Aussagen von Tibor, [D] nurec-Dokumente, [V] eigene Entscheidung.

## 1. Worum es geht

Kernfrage 2 [A]: Mit wie wenigen Abfragen entsteht ein aussagekräftiges Geschmacksprofil?

Dafür müssen zwei Dinge getrennt werden:

| Begriff | Bedeutung | Beantwortet Kernfrage 2? |
| --- | --- | --- |
| **Profilvollständigkeit** | Zu wie vielen Karten gibt es eine Antwort oder eine Vermutung? | Nein. Sie steigt mit jeder Karte, auch wenn die Vermutungen falsch sind. |
| **Vorhersagegenauigkeit** | Wie oft stimmt die Vermutung der App mit der tatsächlichen Antwort überein? | Ja. |

Die App zeigt, wie nurec es verlangt (Anhang B2), den Profilstand „Profil aufgebaut“ in Prozent. Das ist ein Erfassungsgrad nach dem Entwurf 35/30/35, keine Trefferquote, und steht so auch in der App: „Zeigt, wie viel von deinem Geschmack erfasst ist, nicht wie genau Vorschläge sind.“ Die Vorhersagegenauigkeit misst allein die Auswertung der Kontrollkarten. Im Bericht beide Zahlen nie vermischen.

## 2. Aufbau der Messung

### Kontrollkarten

- **Wann gezogen:** nach „Stimmt so“ in der Zusammenfassung, vor der ersten Karte. Grundlage sind die festen Regeln aus Stufe 0.
- **Was:** pro Person 6 Untergruppen (Stufe 2), zufällig gezogen, höchstens eine pro Gruppe, solange Gruppen übrig sind. Gezogen wird nur, was nach Stufe 0 sichtbar ist.
- **Zufall:** Er wird aus der `sessionId` abgeleitet. Die Auswahl steht als Ereignis `HOLDOUT_DRAWN` im Protokoll und lässt sich nachrechnen.
- **Wann gezeigt:** am Ende von Runde 2, passend zur Untergruppenebene. Standardmässig teilen sieben normale Untergruppen und sechs Kontrollkarten die 13 Plätze dieser Runde. Bei weniger sinnvollen Nachfragen ist die Runde kürzer. Kleinere Testlimits begrenzen auch die Zahl gezogener Kontrollkarten. Runde 3 vertieft konkrete Lebensmittel; Runde 4 enthält ausschliesslich Gerichte. Jede Runde hat absolut höchstens 15 Karten, standardmässig 13.
- **Für die Testperson** sehen sie aus wie alle anderen Karten. Im Protokoll tragen sie `phase = "holdout"` und `selectionReason = "holdout_check"`.
- **In „Mein Profil“** erscheint die Vermutung zu einer Kontrollkarte erst, wenn die Karte beantwortet ist. Sonst könnte die Vermutung die Antwort beeinflussen.

**Warum zufällig und vorher gezogen:** Würde die App Karten wählen, zu denen sie schon eine Vermutung hat, prüfte sie vor allem die einfachen Fälle (Auswahlverzerrung). Karten, zu denen die App nichts vermutet, zählen deshalb als nicht getroffen. Wie oft das vorkommt, zeigt die Abdeckung.

**Warum 6:** ein Kompromiss zwischen Belastung (etwa eine Minute) und Genauigkeit. 30 Personen mit je etwa 5 bis 6 bewerteten Kontrollkarten ergeben rund 165 Urteile. Bei einer Trefferquote um 80 % liegt das 95-%-Intervall grob bei ± 6 bis 8 Prozentpunkten. Die Anzahl lässt sich mit `?holdout=N` ändern (0 bis 10).

**Warum Stufe 2:** Die Gruppen aus Runde 1 bilden die Grundlage für eine unabhängige Prüfung an zurückgehaltenen Untergruppen. Stufe 3 vertieft danach konkrete Lebensmittel, ohne die bereits erhobene Kontrollmessung rückwirkend zu verändern.

### Lernkurve aus dem Protokoll

Die Vermutungen werden während des Tests nicht eingefroren, sondern nachträglich berechnet. Für jedes k nimmt das Auswertungsskript die ersten k Antworten der normalen Auswahl. Es berechnet daraus mit demselben Modell wie die App (`src/logic/preferences.js`) die Vermutungen für die Kontrollkarten und vergleicht sie mit den tatsächlichen Antworten.

Die Kurve umfasst ausschliesslich normale Antworten vor der ersten beantworteten Kontrollkarte: standardmässig bis zu 13 Familien plus sieben Untergruppen, also k = 0 bis 20. Spätere Lebensmittelantworten zählen weiterhin zum Profil und zu den Pilotkennzahlen, werden jedoch nicht als Vorwissen für schon beantwortete Kontrollkarten verwendet. Das Modell bleibt deterministisch und das Event-Log vollständig (A8). Bei alten Sitzungen mit Kontrollen am Ende umfasst die Kurve weiterhin alle vorherigen normalen Antworten.

## 3. Kennzahlen

| Kennzahl | Definition | Rolle |
| --- | --- | --- |
| **Trefferquote** | Richtige Richtung geteilt durch bewertete Kontrollkarten. Richtig heisst: „Mag ich“ oder „Mag ich sehr“ vermutet und so beantwortet, oder „Mag ich nicht“ vermutet und so beantwortet. Ohne Vermutung zählt die Karte als nicht getroffen. | Hauptkennzahl |
| Abdeckung | Anteil der bewerteten Kontrollkarten, zu denen es eine Vermutung gibt | ergänzend |
| Treffer bei Vermutung | richtig geteilt durch Kontrollkarten mit Vermutung | ergänzend |
| Vollständigkeit | sichtbare Karten mit Antwort oder Vermutung geteilt durch alle sichtbaren Karten | nur zur Abgrenzung |
| „Kenne ich nicht“ bei Kontrollkarten | Anzahl, separat gezählt | Verständnis, Bekanntheit |
| Dauer, Antwortzeit, Rückgängig | aus dem Protokoll (`trace`, `responseTimeMs`, `UNDO`) | Bedienbarkeit |

- „Kenne ich nicht“ und „Vertrage ich nicht“ bei einer Kontrollkarte sind keine Bewertung. Sie gehen nicht in die Trefferquote ein.
- Alle Werte werden zuerst je Person berechnet und dann gemittelt. Jede Person zählt gleich viel.
- Die Unsicherheit wird als 95-%-Bootstrap-Intervall über Personen angegeben, mit 2000 Wiederholungen und fester Zufallsfolge.

## 4. Vergleichswerte

Eine Trefferquote von 80 % sagt allein wenig. Das Skript berechnet deshalb zwei Vergleichswerte:

- **„Immer Mag ich“:** Die meisten Menschen mögen die meisten Lebensmittel. Diese Quote erreicht man ganz ohne App.
- **„Andere Personen“:** der Mittelwert der anderen Testpersonen für dieselbe Karte, jeweils ohne die Person selbst (leave-one-out). Ist das Modell nicht besser, bringt die persönliche Anpassung nichts.

Die Differenzen zum Modell werden paarweise je Person berechnet, mit Intervall.

**Feste Reihenfolge** (`?selection=fixed`, Version 0.6) als dritter Vergleich: Damit lassen sich die beiden Auswahlverfahren vergleichen. Das Skript wertet sie getrennt aus. Mit 30 Personen geht das nur grob, weil zwei Gruppen von je 15 Personen breite Intervalle ergeben. Der Vergleich eignet sich deshalb eher als Plausibilitätsprüfung im Pilot oder als Zusatz.

## 5. Kriterium „aussagekräftig“

**Vor der Hauptstudie festlegen, nicht nach Ansicht der Daten.**

Vorschlag [V]: Aussagekräftig ist das Profil ab dem kleinsten k, bei dem die Untergrenze des 95-%-Intervalls der Differenz zu beiden Vergleichswerten über 0 liegt. Dafür braucht es mindestens 5 Personen. Das Skript gibt dieses k aus.

Das Team kann zusätzlich eine Mindest-Trefferquote festlegen, z. B. 75 %. Das ist ein Teamentscheid.

## 6. Annahmen im Modell

- **Zahlen:** Mag ich nicht −1, Mag ich +1, Mag ich sehr +2. Eine Untergruppe erbt die Bewertung ihrer Gruppe mit dem Faktor 0.5. Geschwister zählen nicht mit. Das alles sind Annahmen [V], ohne Beleg für die Zielgruppe 50+ (`PREFERENCE_MODEL` in `src/config.js`).
- **Was diese Zahlen bewirken:** Ohne Geschwister hängt die Richtung einer Vermutung nur am Vorzeichen der nächsten bewerteten Gruppe. Faktor und Gewichte ändern die Trefferquote also nicht; das prüft ein Test in `src/logic/preferences.test.js`, und das Skript zeigt es im Variantenvergleich. Die Zahlen bestimmen nur die Reihenfolge der Vermutungen in „Mein Profil“ (stärkste zuerst) und wirken in der Variante mit Geschwistern.
- **„Mag ich sehr“ wird nie vermutet.** Nach nurec v0.2, Kap. 4 [D] macht eine Gruppe „Mag ich sehr“ nicht jedes Mitglied zum Favoriten.
- **Folge für die Lernkurve:** Im Standardmodell hängt die Vermutung für eine Kontrollkarte nur an ihrer Gruppe. Nach den bis zu 13 Gruppen aus Runde 1 steigt die Kurve deshalb kaum noch. Weitere Karten verbessern das Profil direkt. Ob Geschwister mehr bringen, zeigt der Variantenvergleich; ausgewertet wird nur Vorwissen vor der ersten Kontrollantwort.
- **Vorgehen:**
  1. Pilot mit 5 bis 10 Personen, um die Annahmen zu prüfen und bei Bedarf anzupassen.
  2. Werte und Kriterium festschreiben, mit neuer `RULE_VERSION` in `src/logic/engine.js`.
  3. Hauptstudie.

  Pilotdaten gehören nicht in die Hauptauswertung. Sonst würde das Modell an dieselben Daten angepasst, an denen es gemessen wird.

## 7. Adaptive Auswahl (Kurzfassung)

Die Regeln stammen aus nurec v0.2, Kap. 5, 6 und 11 [D]. Die Rangfolge und die Anschlusskarten ohne Beispiel im Konzept sind eigene Entscheide [V]; Details stehen in `src/logic/selection.js` und im README unter „Kartenauswahl“.

| Rang | Karten | Grund im Protokoll |
| --- | --- | --- |
| 1 | „Kenne ich nicht“: auf der nächsten Ebene ein Kind, höchstens zwei innerhalb dieser Vertiefungsrunde | `stage2_after_unfamiliar`, `stage3_after_unfamiliar` |
| 2 | Gruppen, die noch nicht gefragt wurden | `stage1_family` |
| 3 | Gruppe „Mag ich nicht“: die plausible Ausnahme | `stage2_exception` |
| 4 | Gruppe „Mag ich“ oder „Mag ich sehr“: zwei Untergruppen als Kontrast | `stage2_contrast` |
| 5 | Ausnahme gefällt oder Kontrast verschieden: konkrete Lebensmittel | `stage3_exception_detail`, `stage3_difference` |
| 6 | Untergruppe „Mag ich sehr“: konkrete Favoriten | `stage3_favorite` |
| 7 | Kontrast verschieden: die übrigen Untergruppen | `stage2_difference`, `stage2_after_intolerant` |

Was keine Regel trifft, wird nicht gefragt, sondern vermutet. Fällt ein Kontrast gleich aus, gilt der Zweig als geklärt. Das ist der Kern von Kernfrage 2: Die Auswahl fragt nur, wo eine Antwort neue Information verspricht. Die Pilot-Kennzahl „redundant“ (Abschnitt 8) zeigt, wie oft eine Antwort nur bestätigt, was die App schon vermutet hat.

Die Stufen sind den Runden fest zugeordnet: Familien → Untergruppen → konkrete Lebensmittel → Gerichte. In Runde 3 werden auch positiv bewertete Untergruppen gezielt konkretisiert (höchstens zwei Lebensmittel, bei „Mag ich sehr“ drei; `stage3_detail`). Eine Runde wird nicht mit gröberen oder redundanten Karten aufgefüllt. Gerichte bilden Runde 4 und gehen nicht in die Lernkurve ein; Bewertungen bleiben von Zutaten getrennt. Frühzeitiges Aufhören bleibt nach jeder Runde möglich.

## 8. Pilottest (5 bis 10 Personen ab 50), Vorschlag [V]

**Ziele:** Bedienbarkeit, Dauer, Verständnis der Antworten und Begriffe, Funktionsfähigkeit der Logik.

**Ablauf je Person:**

1. Testgerät vorbereiten: `?admin=1` öffnen, „Neue Testperson starten“ drücken und eine Teilnehmer-Nr. vergeben (T01, T02, …). Wer kein eigenes Handy nutzt, bekommt `?sms=sim`.
2. Einführung in einem Satz. Die Wischrichtungen nicht erklären, damit sich die Verständlichkeit prüfen lässt. Die Person bitten, laut zu denken.
3. Die Person macht alles bis zum Abschluss der letzten Runde. Die Testleitung beobachtet und notiert.
4. Kurzinterview (die ersten vier Punkte fragt seit dem 30.10.2026 die App selbst in der kurzen Befragung nach dem Profil: Bedienung, Verständlichkeit, Passung, Länge, offene Anmerkung; im Export als `survey`):
   - Waren „Kenne ich nicht“, „Mag ich nicht“ und „Vertrage ich nicht“ klar?
   - Passten die Bilder?
   - War es zu lang?
   - War die Zusammenfassung hilfreich?
   - Stimmen die Vermutungen in „Mein Profil“?
5. Am Ende des Tages `npm run export:zentral` ausführen (alle Geräte, siehe `docs/zentrale-speicherung.md`) oder je Gerät in `?admin=1` „Export JSON (alles)“ wählen; die Datei sicher ablegen, nie ins Repo.

**Beobachtungsbogen:** Start und Ende, wo Hilfe nötig war, Verwechslungen (z. B. „Mag ich nicht“ statt „Vertrage ich nicht“), Abbruch, Kommentare.

**Aus den Daten** (nurec v0.2, Kap. 10 „Im Pilot messen“; das Auswertungsskript gibt sie als „Pilot-Kennzahlen“ aus, je Person in `sitzungen.csv`):

| Kennzahl | Bedeutung | Spalte |
| --- | --- | --- |
| Dauer einer Runde | erste bis letzte Antwort einer Runde, Median | `medianRoundMs` |
| Abbrüche | „Runde beenden“, während eine Karte zu sehen war (`QUESTION_ABORTED`) | `aborted` |
| Anteil „Kenne ich nicht“ | in der normalen Auswahl | `unfamiliarShare` |
| Erkannte Nachfrage | Klärungskarten nach „Kenne ich nicht“ und wie viele davon eine Geschmacksantwort bekamen | `clarifications`, `clarified` |
| Redundante Karten | Antworten, die nur bestätigen, was die App vorher schon vermutet hat | `redundant` (von `guessed`) |
| Neue und widersprüchliche Hinweise | Antworten gegen die Vermutung vorher, z. B. eine gefundene Ausnahme | `contradictions` (von `guessed`) |
| Gerichte | freiwillig bewertete Gerichte | `dishes` |

Dazu Dauer je Abschnitt (`trace`), Antwortzeiten, Rückgängig, `inputMethod` und die Trefferquote der Kontrollkarten (im Pilot nur als Plausibilitätsprüfung, zu wenige Personen). Verständlichkeit von Produkten und Gerichten sowie der Wortlaut von „Mag ich“ ohne Neutralantwort (Kap. 4) gehören ins Kurzinterview.

**Mögliche Anpassungen nach dem Pilot** (im Team entscheiden):

- Dauert es zu lange, Kartenlimit oder Anzahl Kontrollkarten senken.
- Kommt „Kenne ich nicht“ oft vor, Begriffe oder Bilder prüfen.
- Stimmen die Vermutungen oft nicht, die Variante mit Geschwistern prüfen.

## 9. Offene Abgrenzungen

- **Gerichte (Stufe 4):** bilden gemäss Teamvorgabe Runde 4 (64 Gerichte im Katalog seit dem 29.10.2026; seit Regelversion `demo-0.9` standardmässig nur die 13 passendsten erlaubten Gerichte). Auswahl und Reihenfolge nutzen Zutatenvorlieben aus Runde 1 bis 3, ihre Bewertungen bleiben eigenständig. Es gibt keine Runde ausserhalb der vier Stufen. Die Messung der Vorhersage deckt nur Lebensmittel ab.
- **Eigenleistung und KI:** Die adaptive Auswahl, das Präferenzmodell, Stufe 3 und 4, das Dashboard, das Alltagsprofil (am 28.10.2026 wieder entfernt) und die Auswertung wurden mit Claude Code (KI) umgesetzt, im Auftrag des Teams (15.10.2026). Mit Tibor klären, wie das in der Arbeit deklariert wird. Die fachlichen Entscheide (Regeln, Annahmen, Kriterium) bleiben Teamentscheide.
- **Einwilligung (Frage F4):** Die Kontrollkarten ändern nichts an den Daten, die gespeichert werden. Die Einwilligung muss aber die Auswertung abdecken.

## 10. Auswertung durchführen

```bash
npm run auswertung -- pfad/zum/export.json [weitere Dateien oder Ordner] --out auswertung --exclude T00
```

- Eingabe: ein oder mehrere JSON-Exporte, auch von mehreren Geräten. Doppelte Sitzungen zählen einmal.
- `--exclude` überspringt Teilnehmer-Nrn., z. B. Testläufe des Teams.
- `--min` legt die Mindestzahl Personen für das Kriterium fest (Standard 5).
- Ausgabe im Ordner `auswertung/` (steht in `.gitignore`):
  - `zusammenfassung.txt`
  - `lernkurve.csv` (je k und Auswahlverfahren)
  - `kontrollkarten.csv` (jede Kontrollkarte mit Vermutung und Treffer)
  - `sitzungen.csv` (Dauer, Antwortzeit, Kontrollkarten je Person)
  - `varianten.csv` (Annahmen im Vergleich)
- Die Exporte enthalten nur `sessionId` und Teilnehmer-Nr., nie Vorname oder Telefonnummer. Die Ausschlüsse sind trotzdem Gesundheitsdaten (F4): Die Dateien nicht teilen und nicht ins Repo legen.
- Nur Sitzungen mit beantworteten Kontrollkarten gehen in die Kurve ein. Die Ansicht für die Testleitung zeigt je Sitzung „Kontrollkarten: x von 6 beantwortet“.

## 11. Grenzen

- **30 Personen** ergeben grobe Intervalle. Unterschiede von wenigen Prozentpunkten lassen sich nicht nachweisen.
- **Nur 6 Kontrollkarten pro Person, nur Stufe 2.**
- **Ermüdung:** Die Kontrollkarten kommen am Ende von Runde 2. Ihre Antwortzeiten mit denen der normalen Untergruppen vergleichen.
- **Keine Wiederholung:** Auch die „wahre“ Antwort schwankt. Wie stark, ist unbekannt (Test-Retest). Das begrenzt die erreichbare Trefferquote. Eine Möglichkeit: Ein Teil der Pilotpersonen beantwortet eine Woche später dieselben Kontrollkarten nochmals (nicht umgesetzt).
- **Adaptive Reihenfolge:** Die k-te Karte ist nicht bei allen Personen dieselbe. Die Kurve beschreibt Auswahl und Modell zusammen.
- **Simulation ist kein Ergebnis:** Die Tests rechnen mit simulierten Personen, nur um die Rechnung zu prüfen.
