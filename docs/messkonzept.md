# Messkonzept: Kontrollkarten und Lernkurve

Stand 15.10.2026, Prototyp Version 0.7. Vorschlag des Teams [V] zur Abstimmung im Team und mit Tibor.
Quellenlabels wie im README: [A] Aufgabenstellung, [K] Aussagen von Tibor, [D] nurec-Dokumente, [V] eigene Entscheidung.

## 1. Worum es geht

Kernfrage 2 [A]: Mit wie wenigen Abfragen entsteht ein aussagekräftiges Geschmacksprofil?

Dafür müssen zwei Dinge getrennt werden:

| Begriff | Bedeutung | Beantwortet Kernfrage 2? |
| --- | --- | --- |
| **Profilvollständigkeit** | Zu wie vielen Karten gibt es eine Antwort oder eine Vermutung? | Nein. Sie steigt mit jeder Karte, auch wenn die Vermutungen falsch sind. |
| **Vorhersagegenauigkeit** | Wie oft stimmt die Vermutung der App mit der tatsächlichen Antwort überein? | Ja. |

Die App zeigt Testpersonen keinen Prozentwert. Die Vollständigkeit wird nur intern ausgewertet.

## 2. Aufbau der Messung

### Kontrollkarten

- **Wann gezogen:** nach „Stimmt so“ in der Zusammenfassung, vor der ersten Karte. Grundlage sind die festen Regeln aus Stufe 0.
- **Was:** pro Person 6 Untergruppen (Stufe 2), zufällig gezogen, höchstens eine pro Gruppe, solange Gruppen übrig sind. Gezogen wird nur, was nach Stufe 0 sichtbar ist.
- **Zufall:** Er wird aus der `sessionId` abgeleitet. Die Auswahl steht als Ereignis `HOLDOUT_DRAWN` im Protokoll und lässt sich nachrechnen.
- **Wann gezeigt:** nie in der normalen Auswahl, sondern am Ende der letzten Runde. In Runde 4 bekommt die normale Auswahl dafür weniger Plätze: höchstens 34 normale Karten plus 6 Kontrollkarten, also 40 = 4 Runden × 10 Karten. Die Vorgabe des Dozenten (höchstens 4 Runden) bleibt eingehalten. Endet die Auswahl früher, folgen die Kontrollkarten direkt.
- **Für die Testperson** sehen sie aus wie alle anderen Karten. Im Protokoll tragen sie `phase = "holdout"` und `selectionReason = "holdout_check"`.
- **In „Mein Profil“** erscheint die Vermutung zu einer Kontrollkarte erst, wenn die Karte beantwortet ist. Sonst könnte die Vermutung die Antwort beeinflussen.

**Warum zufällig und vorher gezogen:** Würde die App Karten wählen, zu denen sie schon eine Vermutung hat, prüfte sie vor allem die einfachen Fälle (Auswahlverzerrung). Karten, zu denen die App nichts vermutet, zählen deshalb als nicht getroffen. Wie oft das vorkommt, zeigt die Abdeckung.

**Warum 6:** ein Kompromiss zwischen Belastung (etwa eine Minute) und Genauigkeit. 30 Personen mit je etwa 5 bis 6 bewerteten Kontrollkarten ergeben rund 165 Urteile. Bei einer Trefferquote um 80 % liegt das 95-%-Intervall grob bei ± 6 bis 8 Prozentpunkten. Die Anzahl lässt sich mit `?holdout=N` ändern (0 bis 10).

**Warum nur Stufe 2:** Die Gruppen (Stufe 1) braucht die App als Grundlage. Stufe 3 gibt es nur für Nüsse, Kerne und Käse.

### Lernkurve aus dem Protokoll

Die Vermutungen werden während des Tests nicht eingefroren, sondern nachträglich berechnet. Für jedes k nimmt das Auswertungsskript die ersten k Antworten der normalen Auswahl. Es berechnet daraus mit demselben Modell wie die App (`src/logic/preferences.js`) die Vermutungen für die Kontrollkarten und vergleicht sie mit den tatsächlichen Antworten.

So liefert jede Testperson die ganze Kurve (k = 0 bis 34) ohne zusätzliche Fragen. Voraussetzung: Das Modell ist deterministisch, und das Event-Log ist vollständig (A8).

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
- **Folge für die Lernkurve:** Im Standardmodell hängt die Vermutung für eine Kontrollkarte nur an ihrer Gruppe. Nach allen Gruppen, also in Runde 1 und zu Beginn von Runde 2 (k ≈ 13), steigt die Kurve deshalb kaum noch. Weitere Karten verbessern das Profil direkt (mehr eigene Bewertungen), nicht die Vermutungen für ungefragte Karten. Ob Geschwister mehr bringen, zeigt der Variantenvergleich. Beides ist ein mögliches Ergebnis für den Bericht.
- **Vorgehen:**
  1. Pilot mit 5 bis 10 Personen, um die Annahmen zu prüfen und bei Bedarf anzupassen.
  2. Werte und Kriterium festschreiben, mit neuer `RULE_VERSION` in `src/logic/engine.js`.
  3. Hauptstudie.

  Pilotdaten gehören nicht in die Hauptauswertung. Sonst würde das Modell an dieselben Daten angepasst, an denen es gemessen wird.

## 7. Adaptive Auswahl (Kurzfassung)

Die Regeln stammen aus nurec v0.2, Kap. 4 und 6 [D]. Die Rangfolge ist ein eigener Entscheid [V]; Details stehen in `src/logic/selection.js`.

| Rang | Karten | Grund im Protokoll |
| --- | --- | --- |
| 1 | „Kenne ich nicht“ bei einer Gruppe: sofort ein Kind derselben Gruppe, höchstens zwei | `stage2_after_unfamiliar` |
| 2 | Gruppen, die noch nicht gefragt wurden | `stage1_family` |
| 3 | Gruppe „Mag ich sehr“: alle Untergruppen (Favoriten) | `stage2_favorite` |
| 4 | Untergruppe „Mag ich sehr“: ihre Sorten (Stufe 3) | `stage3_favorite` |
| 5 | Gruppe „Mag ich nicht“: eine Ausnahme nachtesten | `stage2_exception` |
| 6 | Gruppe „Mag ich“: Untergruppen unterscheiden; nach einer gefundenen Ausnahme die übrigen Untergruppen | `stage2_differentiate`, `stage2_after_exception`, `stage2_after_intolerant` |
| 7 | Untergruppe „Mag ich“: ihre Sorten | `stage3_detail` |

Was keine Regel trifft, wird nicht gefragt, sondern vermutet. Innerhalb eines Rangs wechseln sich die Gruppen ab.

## 8. Pilottest (5 bis 10 Personen ab 50), Vorschlag [V]

**Ziele:** Bedienbarkeit, Dauer, Verständnis der Antworten und Begriffe, Funktionsfähigkeit der Logik.

**Ablauf je Person:**

1. Testgerät vorbereiten: `?admin=1` öffnen, „Neue Testperson starten“ drücken und eine Teilnehmer-Nr. vergeben (T01, T02, …). Wer kein eigenes Handy nutzt, bekommt `?sms=sim`.
2. Einführung in einem Satz. Die Wischrichtungen nicht erklären, damit sich die Verständlichkeit prüfen lässt. Die Person bitten, laut zu denken.
3. Die Person macht alles bis zum Abschluss der letzten Runde. Die Testleitung beobachtet und notiert.
4. Kurzinterview:
   - Waren „Kenne ich nicht“, „Mag ich nicht“ und „Vertrage ich nicht“ klar?
   - Passten die Bilder?
   - War es zu lang?
   - War die Zusammenfassung hilfreich?
   - Stimmen die Vermutungen in „Mein Profil“?
5. Am Ende des Tages in `?admin=1` „Export JSON (alles)“ wählen und die Datei sicher ablegen, nie ins Repo.

**Beobachtungsbogen:** Start und Ende, wo Hilfe nötig war, Verwechslungen (z. B. „Mag ich nicht“ statt „Vertrage ich nicht“), Abbruch, Kommentare.

**Aus den Daten:**

- Dauer je Abschnitt (`trace`)
- Antwortzeiten, Rückgängig, `inputMethod`
- Anteil „Kenne ich nicht“
- Trefferquote der Kontrollkarten, im Pilot nur als Plausibilitätsprüfung (zu wenige Personen)

**Mögliche Anpassungen nach dem Pilot** (im Team entscheiden):

- Dauert es zu lange, Kartenlimit oder Anzahl Kontrollkarten senken.
- Kommt „Kenne ich nicht“ oft vor, Begriffe oder Bilder prüfen.
- Stimmen die Vermutungen oft nicht, die Variante mit Geschwistern prüfen.

## 9. Offene Abgrenzungen

- **Gerichte (Stufe 4):** Falls Mahlzeiten verbindlich zur Aufgabenstellung gehören, mit Tibor klären, ob Stufe 4 für die Studie nötig ist oder als Ausblick genügt. Diese Messung deckt nur Lebensmittelgruppen ab.
- **Eigenleistung und KI:** Die adaptive Auswahl, das Präferenzmodell und die Auswertung wurden mit Claude Code (KI) umgesetzt, im Auftrag des Teams (15.10.2026). Mit Tibor klären, wie das in der Arbeit deklariert wird. Die fachlichen Entscheide (Regeln, Annahmen, Kriterium) bleiben Teamentscheide.
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
- **Ermüdung:** Die Kontrollkarten kommen am Ende. Ermüdung kann die Antworten verändern; die Antwortzeiten der Kontrollkarten mit denen davor vergleichen.
- **Keine Wiederholung:** Auch die „wahre“ Antwort schwankt. Wie stark, ist unbekannt (Test-Retest). Das begrenzt die erreichbare Trefferquote. Eine Möglichkeit: Ein Teil der Pilotpersonen beantwortet eine Woche später dieselben Kontrollkarten nochmals (nicht umgesetzt).
- **Adaptive Reihenfolge:** Die k-te Karte ist nicht bei allen Personen dieselbe. Die Kurve beschreibt Auswahl und Modell zusammen.
- **Simulation ist kein Ergebnis:** Die Tests rechnen mit simulierten Personen, nur um die Rechnung zu prüfen.
