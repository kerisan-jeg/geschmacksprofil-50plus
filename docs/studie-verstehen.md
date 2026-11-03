# Was wir mit der App untersuchen – verständlich erklärt

**Ergänzung vom 03.11.2026:** Die Befragung berücksichtigt ab Version 0.14 zusätzlich die Sichtung, Nachvollziehbarkeit und Passung der Vermutungen unter «Weitere Einblicke». Die aktuelle Übersicht aller Fragen mit ihrem Erkenntniszweck steht in [befragung-ziele-und-erkenntnisse.md](befragung-ziele-und-erkenntnisse.md); die einheitliche Durchführung in [testablauf-nutzerstudie.md](testablauf-nutzerstudie.md). Die folgenden Erläuterungen zur früheren Fassung bleiben als fachlicher Hintergrund erhalten.

Stand: 02.11.2026. Grundlage: die vom Team mitgeteilte Aufgabenstellung und Prüfung des Codes. Die erweiterte Befragung, getrennte Abschlussmerkmale und der automatische Studienbericht sind ab Version 0.13 umgesetzt. Die Bedienungsanleitung steht in [studienauswertung.md](studienauswertung.md). Dieses Dokument erklärt die fachliche Bedeutung; Beobachtungsablauf und Studienbedingungen sind zusätzlich im Team festzulegen.

## 1. Was die Aufgabenstellung verlangt

Ihr entwickelt einen Prototyp zur einfachen, schnellen und zuverlässigen Erfassung von Geschmacksvorlieben. Mindestens **30 Personen ab 50 Jahren** sollen ihn testen. Aus ihrer Nutzung und Rückmeldung leitet ihr Gestaltungsempfehlungen ab.

Daraus ergeben sich diese Untersuchungsbereiche. Die Formulierungen sind eine Arbeitsübersetzung eurer Ziele in prüfbare Fragen:

| Bereich | Frage in Alltagssprache | Woran ihr eine Antwort erkennen könnt |
|---|---|---|
| Bedienbarkeit und Wischen | Versteht die Person, wie sie bewerten soll, und kommt sie zurecht? | Beobachtung, benötigte Hilfe, verwendete Wischgesten/Knöpfe und eigene Einschätzung |
| Aufwand | Geht es zügig, und fühlt es sich überschaubar oder anstrengend an? | Klar definierte Dauer, Anzahl Karten, empfundene Anstrengung, Länge und Wiederholungen |
| Verständlichkeit und Passung des Profils | Kann die Person ihr Profil verstehen, und erkennt sie ihre Vorlieben darin wieder? | Profil ansehen lassen, konkrete Rückmeldungen und Schlussbefragung |
| Effiziente Erfassung | Was weiss die App nach wenigen Antworten, und wie gut stimmen ihre Vermutungen? | Kontrollkarten und Lernkurve als zusätzliche technische Prüfung |

Bedienbarkeit lässt sich durch erfolgreiches Bearbeiten einer Aufgabe, Zeitaufwand und Rückmeldung untersuchen. Diese Kombination beschreibt auch [NIST im Überblick zu Usability-Tests](https://www.nist.gov/programs-projects/usability-testing). Die konkrete Auswahl für euer Projekt ist ein eigener Vorschlag.

**Die Aufgabenstellung verlangt 30 oder mehr geeignete Testpersonen.** Die Zahl „mindestens 5“ in der bisherigen Software ist lediglich eine Einstellung des vorgeschlagenen statistischen Kriteriums. Sie ersetzt diese Vorgabe nicht. Interne Einrichtungstests sind keine Daten dieser Zielgruppenstudie.

## 2. Was bei einer Person passiert

**Person nutzt App → App protokolliert → Supabase speichert → Export lädt herunter → Auswertung erstellt Tabellen.**

1. Die Person beginnt eine eigene Sitzung und gibt Alter, Einwilligung und Angaben zu ihrer Ernährung an. Ausschlüsse und Unverträglichkeiten steuern, welche Karten gezeigt werden.
2. Sie beantwortet Karten: zunächst Gruppen, dann Untergruppen, einzelne Lebensmittel und gegebenenfalls Gerichte. Standardmässig gibt es höchstens vier Runden mit jeweils bis zu 13 Karten. Einschränkungen und frühzeitiges Beenden können zu kürzeren Abläufen führen.
3. Eine Bewertung kann durch Wischen oder über einen Knopf erfolgen. Beides wird als Antwort gespeichert; die Eingabemethode wird zusätzlich protokolliert.
4. Die App bildet daraus das Profil: direkte Antworten sowie getrennt gekennzeichnete Vermutungen zu nicht bewerteten Karten.
5. Die Person sieht ihr Profil an und beantwortet die Schlussbefragung. „Vielen Dank“ bestätigt bei eingerichteter zentraler Speicherung die Übertragung.

Alle Angaben gehören über eine zufällige **Teilnahmenummer** zusammen. Eine Sitzung ist ein technischer Durchlauf, nicht automatisch eine andere Person: Eine Person kann mehrere Probeläufe erzeugen. Bei einem gemeinsam genutzten Gerät müsst ihr vor jeder neuen Person über `?admin=1` auf „Neue Testperson starten“ gehen. Die vorherigen Sitzungen bleiben für den Export erhalten.

## 3. Was eine Kartenantwort bedeutet

Beispiel: Eine Person sieht „Beeren“ und bewertet die Karte mit „Mag ich sehr“. Das Protokoll hält fest, welche Karte es war, welche Antwort erfolgte, in welcher Runde und Reihenfolge, zu welchem Zeitpunkt und mit welcher Eingabemethode.

| Antwort | Bedeutung für das Profil | Was sie für die Forschung aussagt |
|---|---|---|
| Eher gern / Mag ich | Positive Vorliebe | Die Person äussert eine Vorliebe für diese Karte. |
| Sehr gern / Mag ich sehr | Besonders positive Vorliebe | Stärkere Zustimmung; kein Nachweis, dass automatisch jedes verwandte Lebensmittel gefällt. |
| Eher ungern / Mag ich nicht | Negative Vorliebe | Eine Abneigung; keine Allergie und kein gesundheitlicher Ausschluss. |
| Kenne ich nicht | Keine Geschmacksbewertung möglich | Das Lebensmittel oder die Gruppe ist unbekannt. Das bedeutet nicht automatisch, dass die Bedienung unverständlich war. |
| Vertrage ich nicht | Ausschluss statt Geschmacksbewertung | Ein anderer Grund als „schmeckt mir nicht“; nicht als negative Geschmacksantwort in die Trefferquote rechnen. |
| Rückgängig | Korrektur einer Eingabe | Muss beim Zählen gültiger Antworten berücksichtigt werden. Es ist nicht automatisch ein Bedienfehler. |

Die Wortwahl unterscheidet sich zwischen Runde 1 und den folgenden Runden. Die App speichert auch den tatsächlich angezeigten Begriff.

Der Ereignisexport enthält **eine Zeile pro Ereignis**, nicht pro Person. Eine Person kann daher viele Zeilen erzeugen. Die Befragungswerte werden dort in jeder Ereigniszeile wiederholt. Ein einfacher Durchschnitt über diese CSV-Zeilen würde Personen mit mehr Ereignissen stärker gewichten.

## 4. Was die frühere Schlussbefragung bis Version 0.12 misst

| Aktuelle Frage | Gespeicherter Name | Antwortbereich | Bedeutung |
|---|---|---|---|
| Wie einfach war die Anwendung zu bedienen? | `ease` | 1 sehr schwierig bis 5 sehr einfach | Wahrgenommene allgemeine Bedienbarkeit |
| Wie verständlich waren die Antwortmöglichkeiten? | `clarity` | 1 gar nicht bis 5 sehr verständlich | Einschätzung der Antwortmöglichkeiten; die Frage nennt das Wischen nicht ausdrücklich |
| Wie gut beschreibt das Profil deinen Geschmack? | `fit` | 1 gar nicht bis 5 sehr gut | Persönlich empfundene Passung des Profils |
| Wie empfandest du die Länge? | `length` | 1 zu kurz, 2 gerade richtig, 3 zu lang | Angemessenheit der Länge; 3 ist hier nicht „besser“ als 2 |
| Was war unklar oder hat dir gefehlt? | `remarks` | Freiwilliger Text | Hinweise auf konkrete Probleme und Wünsche |

Jede Frage wird **einmal pro Teilnahme** ausgewertet, beispielsweise durch die Anzahl der Antworten je Kategorie. Fehlende Befragungen werden als fehlend ausgewiesen und nicht als schlechte Bewertung eingetragen. Freitext wird gelesen, nach Themen geordnet und durch passende anonymisierte Beispiele erläutert.

Aus den vier unterschiedlichen Fragen solltet ihr keinen gemeinsamen „Qualitätswert“ zusammenrechnen. Im Projekt ist keine Validierung dieser Kombination als standardisierte Gesamtskala dokumentiert.

Die Passungsfrage sagt: „Die Person erkennt sich im Profil wieder.“ Die Kontrollkarten prüfen eine andere Sache: „Die App hat bestimmte geäusserte Vorlieben richtig vorhergesagt.“ Beide Ergebnisse können unterschiedlich ausfallen.

## 5. Was Kontrollkarten und die Trefferquote bedeuten

Die App möchte nicht alle Lebensmittel einzeln abfragen. Aus „Obst mag ich“ kann sie etwa ableiten, dass eine Untergruppe ebenfalls gefallen könnte. Das ist eine Vermutung, die falsch sein kann.

Darum werden zu Beginn standardmässig sechs Untergruppen als Kontrollkarten ausgewählt. Sie werden von der normalen Auswahl zurückgehalten und am Ende von Runde 2 beantwortet. Sie sehen wie normale Karten aus. Die Auswertung rekonstruiert, was die App aus den vorherigen normalen Antworten vermutet hätte, und vergleicht das mit den tatsächlichen Kontrollantworten.

Beispiel: Sechs Kontrollkarten werden mit einer Geschmacksantwort bewertet. Vier Vermutungen passen zur geäusserten Vorliebe. Die Trefferquote beträgt dann **4 / 6 = 67 %**.

Dabei gelten Einschränkungen:

- „Mag ich“ und „Mag ich sehr“ werden für diese Prüfung zur positiven Richtung zusammengefasst. Die Stärke der Vorliebe wird damit nicht exakt vorhergesagt.
- Eine fehlende Vermutung zählt in dieser Hauptquote als nicht getroffen. Die „Abdeckung“ zeigt ergänzend, für wie viele Kontrollkarten überhaupt eine Vermutung möglich war.
- „Kenne ich nicht“ und „Vertrage ich nicht“ sind keine Geschmacksurteile und werden dafür nicht als falsch gezählt. Die Anzahl verwertbarer Kontrollkarten muss mitberichtet werden.
- Richtig heisst hier: passend zur Antwort dieser Person zu diesem Zeitpunkt. Die Prüfung betrifft keine medizinische Richtigkeit oder gesundheitliche Eignung.

Der Vergleich „immer Mag ich“ zeigt, wie viel man bereits durch pauschal positive Vermutungen treffen würde. Eine hohe Trefferquote allein beweist daher noch keinen Nutzen der persönlichen Anpassung. „Andere Personen“ ist ein weiterer Vergleich aus Antworten anderer Sitzungen; fehlen dafür Bewertungen, darf ein angezeigter Wert von 0 % nicht als Beleg für eine schlechte Vergleichsmethode gelesen werden.

## 6. Was die Lernkurve kann und wo ihre Grenze liegt

Die Lernkurve fragt: „Wie gut wären die Kontrollvorhersagen nach den ersten 5, 10 oder 13 normalen Kartenantworten gewesen?“ Die Zahl `k` steht für diese normalen Antworten. Sie zählt nicht alle Klicks, Vorabfragen, Kontrollantworten oder die Schlussbefragung mit.

**Aktuell stammen die Kontrollen nur aus Runde 2.** Für die Lernkurve zählt nur Wissen vor der ersten Kontrollantwort. Spätere Antworten aus Runde 3 und Gerichte aus Runde 4 werden nicht rückwirkend als Vorwissen verwendet. Die aktuelle Quote bestätigt daher nicht die Qualität aller Lebensmittel- und Gerichtsvorlieben im fertigen Profil.

Beim jetzigen Standardmodell stammen Vermutungen für Untergruppen aus deren übergeordneten Gruppen. Weitere Untergruppenantworten verändern diese Vermutungen ohne eingeschalteten Geschwistereinfluss oft nicht. Eine flache Kurve nach Runde 1 kann deshalb durch das Modell entstehen. Sie beweist nicht, dass spätere Runden für das gesamte Profil überflüssig sind.

Sechs Kontrollkarten belegen sechs der höchstens 13 Plätze in Runde 2. Es bleiben höchstens sieben normale Untergruppenfragen. Das ist ein bewusster Messaufwand und muss gegen die gewünschte kurze Erfassung abgewogen werden.

Der Profilstand in Prozent beschreibt wiederum einen Erfassungsgrad. „Profil zu 90 % aufgebaut“ bedeutet nicht „90 % der Vorlieben richtig vorhergesagt“.

## 7. Was die Software ab Version 0.13 auswertet

| Thema | Aktueller Stand |
|---|---|
| Karten, Antworten, Eingabemethode, Korrekturen | Gespeichert und im Studienbericht sowie in `teilnahmen.csv` je Sitzung aufbereitet. |
| Kontrollkarten, Lernkurve, Modellvarianten | Als technische Zusatzanalyse erhalten; die Hauptzusammenfassung behandelt Bedienung, Aufwand und Befragung. |
| Schlussbefragung | Automatisch einmal je Sitzung in `befragung.csv` und als Verteilung in `befragung-zusammenfassung.csv`, getrennt nach Fragefassung. |
| Benötigte Hilfe, Fehlversuche beim Wischen, beobachtete Verständnisprobleme | Werden nicht zuverlässig aus dem Antwortprotokoll erkannt. Dafür braucht ihr ein Beobachtungsprotokoll. |
| Wahrgenommene Anstrengung und Wiederholung | In der neuen Fassung ausdrücklich gefragt; bei älteren Befragungen als nicht erhoben ausgewiesen. |
| Abschluss und Abbruch | Befragung, Runden und deren zeitliche Reihenfolge werden unter `data.completion` und im Bericht getrennt ausgewiesen. Die vereinbarte Testaufgabe ist zusätzlich im Team zu definieren. |
| Dauer | Der neue Hauptbericht definiert Profil-, Gesamt- und Rundenzeiten einschliesslich Kontrollkarten/Gerichten. Die frühere Teilkennzahl bleibt im technischen Bericht mit eindeutiger Bezeichnung. |

Auch `finished = true` in Supabase bedeutet nur: Die Befragung wurde abgeschickt. Die App erlaubt diese bereits nach einem Rundenabschluss. Daraus folgt nicht, dass alle vier Runden durchlaufen wurden.

„Abbrüche: 0“ im jetzigen Bericht zählt bestimmte protokollierte Abbrüche mit offener Karte. Es erfasst nicht automatisch jede Person, die die App schliesst oder nicht bis zum vereinbarten Ziel kommt.

## 8. Umgesetzte Schlussbefragung ab Version 0.13

Für eure Aufgabenstellung sind ab Version 0.13 diese sechs geschlossenen Fragen und ein freiwilliger Text umgesetzt. Die Fragefassung wird als `study-v2` gespeichert:

| Frage | Zweck | Vorgeschlagene Antworten |
|---|---|---|
| Wie einfach war die App insgesamt zu bedienen? | Allgemeine Bedienbarkeit | Sehr schwierig bis sehr einfach, fünf Stufen |
| Wie verständlich war für dich das Bewerten durch Wischen? | Ausdrücklicher Bezug zur Swipe-Mechanik | Gar nicht bis sehr verständlich, fünf Stufen; zusätzlich „Nicht ausprobiert / kann ich nicht beurteilen“ |
| Wie anstrengend war es, die Fragen und Karten zu beantworten? | Empfundener Aufwand | Gar nicht bis sehr anstrengend, fünf Stufen |
| Wie häufig kamen dir Fragen oder Karten unnötig ähnlich oder wiederholt vor? | Empfundene Wiederholung | Nie, selten, manchmal, oft, sehr oft |
| Wie gut beschreibt das angezeigte Profil deinen Geschmack? | Wahrgenommene Profilpassung | Gar nicht bis sehr gut, fünf Stufen |
| Wie empfandest du die Länge? | Angemessenheit der Länge | Zu kurz, gerade richtig, zu lang |
| Was war unklar oder würdest du verbessern? | Erklärung und Gestaltungshinweise | Freiwilliger Text |

Die letzte Zeile ist die offene Zusatzfrage. „Nicht ausprobiert“ ist bei der Wischfrage eine eigene Kategorie und keine mittlere oder schlechte Bewertung. Wer ausschliesslich Knöpfe verwendet, hat die App genutzt, aber nicht automatisch die Wischfunktion beurteilt.

Diese Fragen bleiben projektspezifische Einzelbewertungen. Sie sind nicht als standardisierter Gesamtfragebogen zu bezeichnen. Falls eure Betreuung ein bestimmtes validiertes Instrument verlangt, muss das vor der Erhebung geklärt werden.

## 9. Was ihr während eines Tests beobachten solltet

Zusätzlich zur App genügt ein kurzer Bogen pro Teilnahmenummer:

- Testphase: interner Probelauf, Pilot oder Haupterhebung; verwendete Version und Gerät.
- Konnte die Person ohne Erklärung mit dem Bewerten beginnen?
- Nutzt sie Wischen, Knöpfe oder beides? Falls sie Wischen versucht: Gelingen die beabsichtigten Bewertungen?
- Wo war Hilfe nötig? Wortlaut des Problems und Art der Hilfe notieren.
- Was versteht sie unter „Kenne ich nicht“, „Mag ich nicht“ und „Vertrage ich nicht“?
- Kann sie aus dem Profil ihre Vorlieben herauslesen? Was findet sie passend oder unpassend?
- Welche Pausen, Unterbrechungen oder technischen Schwierigkeiten gab es?
- Wurde die vereinbarte Testaufgabe erreicht? Falls nicht: Bis wohin und aus welchem bekannten Grund?

Ein Knopfdruck ist nicht automatisch ein Fehlversuch beim Wischen. Eine lange Zeit ist nicht automatisch ein Verständnisproblem. Das Protokoll und die Beobachtung ergänzen sich.

Gebt allen dieselbe neutrale Einleitung, beispielsweise: „Wir testen die App. Nutze sie bitte so, wie es für dich naheliegend ist. Uns interessiert, was verständlich ist und wo Schwierigkeiten entstehen.“ Wenn ihr die Intuitivität des ersten Kontakts untersuchen wollt, erklärt nicht vorher jeder Person die richtige Wischbewegung. Legt eine einheitliche Hilferegel fest und dokumentiert geleistete Hilfe. Ein solcher gleichbleibender Ablauf mit Beobachtung entspricht dem Vorgehen im [GOV.UK-Leitfaden für moderierte Usability-Tests](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing).

## 10. Welche Ergebnisse am Ende in die Arbeit gehören

Der Hauptbericht sollte die Aufgabenstellung in dieser Reihenfolge beantworten:

1. **Wer und unter welchen Bedingungen?** Anzahl geeigneter Personen, Altersgruppen, Geräte, Version, Aufgabe und Hilferegel. Pro Person eine Teilnahme; wiederholte Durchläufe kenntlich machen.
2. **Bedienung und Wischen:** Anzahl ohne Hilfe erfolgreicher Teilnahmen, beobachtete Probleme, Wisch-/Knopfnutzung und zugehörige Rückmeldungen.
3. **Aufwand:** Verteilung der Anzahl bewerteter Karten, klar definierte Dauer, Anstrengung, Länge und Wiederholung. Pausen und Hilfe berücksichtigen.
4. **Profil:** Verteilung der Passungsbewertungen, Verständnis des Profils und konkrete Gründe für Zustimmung oder Kritik.
5. **Technische Zusatzprüfung:** Anzahl verwertbarer Kontrollkarten, Trefferquote und Vergleichswerte sowie die Grenze der Messung an Untergruppen in Runde 2.
6. **Gestaltungsempfehlungen:** Je Empfehlung zeigen, welcher Befund sie trägt. Beispiel als erfundene Illustration: Wenn mehrere Personen die Aufwärtsgeste nicht entdecken und Hilfe benötigen, wäre eine bessere Einführung oder sichtbare Bedienhilfe begründet. Eine solche Empfehlung folgt nicht allein aus einer niedrigen Kontrolltrefferquote.

Ergebnisse sollten vorzugsweise mit Anzahlen und verständlichen Anteilen berichtet werden, jeweils mit der Zahl der Personen, die die betreffende Frage tatsächlich beantwortet haben. Eine Stichprobe von 30 Personen erfüllt die Projektvorgabe, belegt aber nicht automatisch eine Gültigkeit für alle Personen ab 50.

## 11. Was vor der eigentlichen Erhebung festzulegen ist

1. **Eine konkrete Testaufgabe:** beispielsweise die vorgesehenen Runden durchlaufen, das Profil ansehen und die Befragung abschicken. Definiert, wie freiwilliges früheres Beenden und kürzere erlaubte Abläufe behandelt werden.
2. **Die endgültigen Befragungsfragen und die Beobachtung:** besonders direkter Swipe-Bezug, Anstrengung und Wiederholung.
3. **Den neuen Standardbericht im Probelauf prüfen:** `npm run studie` erzeugt eine Zeile pro Teilnahme, Befragung pro Person, Abschlussstatus, Eingabemethoden und definierte Zeiten; technische Tests werden automatisch ausgeschlossen.
4. **Die Aussage der Kontrollmessung:** Was genau soll sie nachweisen und was bedeutet im Bericht „aussagekräftiges Profil“? Ein Software-Schwellwert ist noch keine fachlich begründete Definition.
5. **Ein Probelauf des gesamten Studienablaufs:** einschliesslich Beobachtung, Export und Bericht. Danach eine feste Version für die eigentliche Erhebung verwenden und mindestens 30 geeignete Personen einbeziehen.

Die bestehende Datenspeicherung ist eine brauchbare Grundlage. Die wichtigsten Anpassungen betreffen jetzt die Passung von Befragung und Bericht zur Aufgabenstellung. Eine blosse Änderung der Modellgewichte aufgrund des bisherigen eigenen Probelaufs wäre dafür keine ausreichende Lösung.

## 12. Technische Fundstellen zur Nachprüfung

| Aussage | Quelle im Projekt |
|---|---|
| Aktuelle vier Auswahlfragen und offene Frage | `src/labels.js`, `SURVEY`; Speicherung in `src/logging/logger.js`, `setSurvey` |
| Daten je Antwort und Sitzung | `src/logging/logger.js`; CSV-Spalten in `src/logging/export.js` |
| Kontrollkarten: Ziehung und Anzahl | `src/logic/holdout.js`; `HOLDOUT_CARDS` in `src/config.js` |
| Begrenzung auf frühere Antworten, Zählungen und Vergleichswerte | `src/analysis/evaluation.js`, `prepareSession`, `scoreAfter`, `learningCurve`, `othersBaseline` |
| Aktuell automatisch erzeugte Analyse-Dateien | `scripts/evaluate.mjs` |
| Aufzeichnung der Runden und Abschicken der Befragung | `src/App.jsx`, `round_start`, `round_end`, `handleSurveySubmit` |
| Befragung bereits nach Rundenabschluss möglich | `src/app/model.js`, `canStartSurvey` |
| Supabase-Abschlussmerkmal | `src/sync/sync.js`, `sessionRow`: `finished` folgt `survey.submittedAt` |

Die älteren Dokumente im Projekt enthalten teilweise überholte Angaben, etwa zur rein lokalen Speicherung oder früheren Registrierungsfeldern. Für die hier beschriebenen Tatsachen wurde der aktuelle Code geprüft.
