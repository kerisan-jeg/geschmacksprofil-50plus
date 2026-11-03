# Einheitlicher Ablauf der Nutzerstudie

Stand 03.11.2026, Prototyp 0.14. Ergänzung zur [Begründung der Befragungsfragen](befragung-ziele-und-erkenntnisse.md). Zielgruppe gemäss Aufgabenstellung: mindestens 30 unterschiedliche Personen ab 50 Jahren.

## Vor jeder Teilnahme

1. Pilot, eigene Probe und Haupterhebung unterscheiden; App-Version, Testmodus (begleitet oder selbständig), Gerät und Datum dokumentieren. Eigene Proben anhand der Teilnahmenummer aus der Haupterhebung ausschliessen.
2. Für jede andere Person einen neuen Durchlauf beginnen. Bei gemeinsamem Gerät über die vorhandene Abmeldung und einen neuen Start vorgehen; fremde Antworten dürfen nicht fortgesetzt werden.
3. Studieninformation und Einwilligung durch die Person lesen und bestätigen lassen. Freiwilligkeit und die Möglichkeit eines früheren Endes erklären.

## Neutrale Testaufgabe

> Erstelle mit der App dein Geschmacksprofil. Bewerte die angezeigten Karten so, wie es für dich passt. Schau dir anschliessend dein Profil und auch den Bereich «Weitere Einblicke» an und beantworte die kurze Befragung. Wenn du früher aufhören möchtest, kannst du deine bisherigen Antworten trotzdem abschliessen.

Bei versendeten Links dieselbe Aufgabe zusammen mit dem Link mitteilen. Die App bietet im Profil einen Knopf zum Öffnen von «Weitere Einblicke». Wenn dort keine Vermutungen angezeigt werden oder die Person den Bereich nicht angesehen hat, gibt es dafür eigene Antworten in der Befragung.

## Begleitete Durchführung

- Zunächst selbständig bedienen lassen. Bei einer Frage oder einem Problem helfen, soweit die Person es benötigt; Anlass und Art der Hilfe festhalten. Keine Vorlieben vorgeben und Bewertungen nicht lenken.
- Festhalten, ob Wischen versucht wurde und welche Eingabeprobleme beobachtet wurden. Erfolgreich protokollierte Wischantworten allein sagen nichts darüber aus, wie viele Versuche nötig waren.
- Nach dem Betrachten von «Weitere Einblicke» neutral fragen: **„Was bedeuten diese Vermutungen deiner Meinung nach?“** Die Antwort möglichst wortgetreu notieren. Falls Hilfe oder eine Erklärung nötig ist, dokumentieren. Die Erklärung in eigenen Worten ist eine qualitative Ergänzung, keine automatisch bewertete Verständnisprüfung.
- Optional nach der Abschlussbefragung fragen: **„Gab es eine Vermutung, die für dich besonders gut oder gar nicht gepasst hat?“** Beispiel und Begründung notieren. Nicht nur Bestätigungen sammeln.
- Keine Karten oder Vermutungen als verpflichtende Zusatzbewertungen vorgeben. Freiwillige Bewertungen im Profil bleiben als solche erkennbar und sind kein unabhängiger Genauigkeitstest.
- Pausen, technische Probleme, Unterbrechungen und Gründe für ein früheres Ende festhalten. Die automatisch gemessene Zeit enthält Pausen.

Die qualitativen Nachfragen werden nicht automatisch gespeichert. Dafür eine Kopie von [beobachtungsbogen-vorlage.csv](beobachtungsbogen-vorlage.csv) im Ordner `auswertung` ausfüllen und über die Teilnahmenummer zuordnen. Falls ein Teil nicht beobachtet wurde, „nicht erhoben“ eintragen.

## Selbständige Teilnahme über einen Link

Die gleiche App mit derselben Befragung verwenden. Es gibt keine anwesende Testleitung, daher liegen keine verlässlichen Beobachtungen zu Hilfe, Fehlversuchen oder tatsächlichem Verständnis vor. Solche Angaben bleiben „nicht erhoben“. Selbstauskunft und Öffnungsprotokoll sind weiterhin verfügbar. Den Testmodus bei der Rekrutierung separat dokumentieren, ohne Namen in die Auswertungsdateien aufzunehmen.

## Nach der Teilnahme

1. Auf die erfolgreiche Übertragung achten. Die Abschlussseite zeigt die Teilnahmenummer und den Rundenstatus. Eine abgeschickte Befragung kann auch zu einem vorzeitig beendeten Durchlauf gehören.
2. Teilnahmenummer mit dem Beobachtungsbogen verbinden. Manuelle Notizen werden bislang nicht automatisch in den Studienbericht eingelesen.
3. `npm run studie` im Projektordner ausführen. Zuerst die Datenbasis in `auswertung/zusammenfassung.txt` prüfen, dann Abschlussstatus, Befragungsverteilungen und Kommentare ansehen.
4. Im Bericht Teilnehmerzahl, Alterseignung, Fragebogenfassung, Testmodus und unvollständige Durchläufe offenlegen. Wiederholungen derselben Person anhand eurer Rekrutierungsdokumentation erkennen; Sitzungen sind keine Garantie für unterschiedliche Personen.

Die Fragen zu Zeit, Anzahl Abfragen und Vorhersagequalität werden gemeinsam anhand der protokollierten Karten, verstrichenen Zeit, subjektiven Belastung und begrenzten Kontrollkartenanalyse beantwortet. Aus einer einzelnen Zufriedenheitsantwort lässt sich keine optimale Kartenzahl bestimmen.
