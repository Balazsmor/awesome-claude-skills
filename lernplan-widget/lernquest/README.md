# Lernquest · das Berichtsheft im Browser

Die Web-Fassung des Lernplans, veröffentlicht als Claude-Artefakt:
<https://claude.ai/code/artifact/21eb9372-5881-42f9-9f18-47b40ead4762>

**Sie ist inzwischen die gepflegte Fassung.** Das
[Übersicht-Widget](../README.md) und die
[Scriptable-Fassung](../mobile/README.md) bleiben liegen und funktionieren
weiter — neue Funktionen kommen aber nur noch hier an.

Sie rechnet genauso wie das Übersicht-Widget — Feiertage aus der Osterformel,
Schulferien aus der Liste, Ferienpläne statt Schulpläne — und liest dasselbe
JSON-Format wie `~/.lernplan-widget.json`. Über den Abschnitt *Austausch mit dem
Widget* wandert der Stand in beide Richtungen.

Vom Widget übernommen sind Tagesplan und Blockdauern, die Ferien- und
Feiertagsrechnung, Kalenderwoche und Wochenschwerpunkte, das Rückgängig-Fenster
von einer Minute, der Fokus-Timer samt Pause und Verlängerung, die Schlafenszeit
und — seit dieser Fassung — der Stundenplan als bearbeitbares JSON. Nicht
übernommen sind der CSV-Auszug und die Menüleistenanzeige; beides ergibt im
Browser wenig Sinn.

Was sie zusätzlich kann:

| | |
|---|---|
| **Punkte und Stufen** | Jede Minute zählt gewichtet: Deep Work ×1,6, Anki ×1,2, Wiederholen ×1,0, Routine ×0,8, Lesen ×0,7 |
| **Acht Attribute** | Fünf Prüfungsfächer und drei Grundwerte, gespeist aus den Blöcken, die auf sie einzahlen |
| **Stufenprüfungen** | Lernzeit macht prüfungsberechtigt, fünf Fragen vergeben die Stufe — ab Stufe 4 muss jede sitzen |
| **Noten** | Note *oder* IHK-Punkte eintragen, Schnitt je Fach, Prognose der Abschlussnote und die Restnote fürs Ziel |
| **Zeugnisnoten** | Eigene Gruppe mit Berufsfachlicher Kompetenz — BWL, WiSo und SUK stehen im Zeugnis zusammengefasst; daneben steht, was die eigenen Klassenarbeiten ergeben |
| **Jahresabschluss** | Zum Schuljahresende schlägt die Karte je Zeugnisfach den Schnitt der Arbeiten dieses Jahres vor; ein Klick trägt sie als Jahresnote zum 31. Juli ein |
| **Karriereplan** | Die sechs Phasen des CFO-Plans, gesperrt bis Datum und Fachstufen stimmen |
| **Wochenkalender** | Sieben Knöpfe — jeder vergangene Tag ist einen Klick zum Nachtragen entfernt |
| **Fokus-Timer** | `▶` je Block, läuft über die Blockdauer; der Weckton wird beim Start in der Audio-Uhr vorgelegt und klingelt auch im Hintergrund-Tab |
| **Jetzt-Marker** | Die Seite liest die Uhr: der laufende Block ist hervorgehoben, darüber steht, was als Nächstes ansteht |
| **Tagesnotiz und Schwerpunkte** | Eine Zeile je Tag, zwei Themen je Woche — dieselben Schlüssel, die auch das Mac-Widget schreibt |
| **Rückgängig** | Eine Minute lang lässt sich jeder Handgriff zurücknehmen, der etwas wegnimmt |
| **Monat** | Blätterbar und klickbar; ein Tag mit Notiz bekommt eine Ecke |
| **Schlafenszeit** | Ab 19:00 steht unter dem Tagesplan, wann Schluss sein müsste — rückwärts vom nächsten Weckruf, `sleepHours` aus dem Plan |
| **Eigener Stundenplan** | Zeiten, Blöcke, Ferien und Prüfungstermine lassen sich in der Seite selbst ändern — dieselben Schlüssel wie `lernplan-config.json` |
| **Frage-Werkstatt** | Baut aus dem eigenen Stand eine fertige Frage an Claude — Fach, Stufe, Schnitt, Wochen-Schwerpunkt, Prüfungsabstand — in fünf Sorten, kopierbar |

## Datei

`lernquest.html` ist ein HTML-**Fragment**, kein vollständiges Dokument: Titel,
Fonts, `<style id="app-style">`, `#root`, der Prüfungsdialog, der eingebettete
Zustand und `<script id="app">`. Die Artefakt-Ablage packt Kopf und Körper
darum. `test/wrap.mjs` tut dasselbe für den lokalen Blick ins Ergebnis.

Der Fragenkatalog (`QUIZ`) ist vorläufig und aus der offiziellen Prüfungsstruktur
gebaut, nicht aus eigenen Klausuren — zum Austauschen die fünf Listen ersetzen.
115 Fragen, mindestens acht je Fach und Zielstufe; ein zweiter Versuch zieht
zuerst das, was gerade nicht dran war.

Der Zustand teilt sich mit `~/.lernplan-widget.json` alle Schlüssel: `d` Häkchen,
`f` Markierungen, `n` Tagesnotizen, `w` Wochen-Schwerpunkte, `t` laufender Timer.
Artefakt-eigen sind `q` (bestandene Stufenprüfungen), `g` (Noten), `zn` (Zielnote),
`zw` (Wochenziel) und `p` (eigener Stundenplan) — das Widget lässt sie beim
Einlesen einfach fallen.

**Der eigene Stundenplan** liegt unter `p` und enthält **nur, was vom eingebauten
Plan abweicht**; beim Laden wird er darübergelegt. So erreichen spätere
Verbesserungen am Grundplan die Seite trotzdem, statt von einer vollständigen
Kopie überdeckt zu werden. Ein Wochentag wird dabei ganz ersetzt, nicht
blockweise gemischt — sonst wüsste niemand, welche Fassung eines Blocks gilt.
Vor dem Übernehmen wird geprüft: unbekannte Wochentage, doppelte Block-Kennungen,
unbekanntes `kind`, kaputte Datumsangaben. Findet sich etwas, bleibt der alte
Plan stehen und der Kasten sagt, was klemmt.

In `g` unterscheidet der Vorsatz die drei Sorten: ohne Vorsatz eine
Klassenarbeit, `ihk:` ein Block der Abschlussprüfung, `zg:` eine Zeugnisnote.
Die drei werden getrennt gerechnet — eine Zeugnisnote ist bereits ein Mittel und
darf den Schnitt der Klassenarbeiten nicht ein zweites Mal belasten.

**Die IHK-Gewichte stehen in der Verordnung**, nicht in einer Schätzung: § 14
IndKflAusbV, in Kraft seit dem 1. August 2024 — Teil 1 („Leistungserstellung,
Logistik, Beschaffung und Buchhaltung") 25 %, „Marketing, Vertrieb,
Personalwesen und kaufmännische Steuerung und Kontrolle" 35 %, „Fachaufgabe im
Einsatzgebiet" 30 %, „Wirtschafts- und Sozialkunde" 10 %. Zusammen 100 % — das
ist zugleich die Gegenprobe, und der Prüflauf rechnet sie nach. Innerhalb der
Fachaufgabe zählen Dokumentation 10 %, Präsentation 20 % und das fallbezogene
Fachgespräch 70 %; das Fachgespräch ist damit 21 % der Endnote.

Zwei Namen standen bis zuletzt in der Fassung von 2002. „Geschäftsprozesse" gibt
es nicht mehr — kein Etikettenwechsel, denn Marketing, Vertrieb, Personalwesen
und die kaufmännische Steuerung und Kontrolle sitzen in diesem Bereich. Die
Kennungen `t1`, `gp`, `wi`, `fa` blieben trotzdem: an ihnen hängen eingetragene
Noten.

**Ein guter Schnitt allein besteht nicht.** Nach der Verordnung müssen vier
Bedingungen zugleich gelten: Gesamtergebnis aus Teil 1 und Teil 2 mindestens
ausreichend, Teil 2 für sich mindestens ausreichend, mindestens zwei der drei
Teil-2-Bereiche mindestens ausreichend, und kein Teil-2-Bereich ungenügend. Man
kann rechnerisch bei 2,5 landen und trotzdem durchfallen — die Karte zeigt das
jetzt statt es zu verschweigen. Je Bedingung drei Zustände: *steht fest*,
*verletzt*, *hängt an den offenen Blöcken*. Solange nichts eingetragen ist,
steht ein Satz da und keine Liste aus vier „offen".

**Zeugnisnoten rechnen je Schuljahr.** Das Schuljahr kommt aus dem Datum, August
bis Juli: `2026-07-29` gehört zu 2025/26. Jedes Jahr bekommt einen eigenen Block
mit eigenem Schnitt, das jüngste oben; Deutsch 2026 wird also nicht still mit
Deutsch 2027 gemittelt. Auch die Gegenprobe der Berufsfachlichen Kompetenz zieht
nur Klassenarbeiten **desselben** Schuljahres heran. Ein Fach, das ich nicht
vorgesehen habe, trägt man unter *Weiteres Fach* ein; sein Name wird zur Kennung
(`zg:x:religion`), zwei Zusatzfächer stehen daher als zwei Zeilen da. Eine
Zeugnisnote zählt immer einfach — die Gewicht-Auswahl weicht deshalb einem
Hinweis, statt die Eingabe hinterher still zu überschreiben.

**Der Jahresabschluss schlägt vor, er trägt nicht ein.** Sobald das laufende
Schuljahr Klassenarbeiten hat und noch keine Zeugnisnote trägt, steht über den
Jahresblöcken ein Feld je Zeugnisfach, vorbelegt mit dem Schnitt der Arbeiten
dieses Jahres — ab Juni als Zeugniszeit, davor als Vorschau. *Als Jahresnote
eintragen* schreibt daraus gewöhnliche `zg:`-Einträge zum 31. Juli; die
Klassenarbeiten bleiben, wo sie sind. Die Zahl im Feld ist ein Anhaltspunkt:
die Zeugnisnote setzt die Lehrkraft, und mündliche Mitarbeit geht mit ein.

**Zwei Zeugnisse, zwei Rechnungen.** Am Ende der Ausbildung gibt es ein
Berufsschulzeugnis und ein IHK-Zeugnis. Die IHK-Note entsteht allein aus den
vier Prüfungsbereichen; Schulnoten gehen dort nicht ein, die Berufsschulnote
wird auf dem IHK-Zeugnis nur auf Antrag als eigene Zeile ausgewiesen. Die
Abschlussnote der Berufsschule rechnet die Seite bewusst **nicht** aus: dafür
müsste ihre Gewichtung an der Berufsschulordnung geprüft sein, und dieser
Rechtstext war aus der Arbeitsumgebung nicht erreichbar. Lieber keine Zahl als
eine ungeprüfte.

**Punkte sind ein Konto, kein Fenster.** Gezählt wird ab dem ersten Eintrag.
Vorher lagen 400 Tage davor — ab dem 401. wäre der Anfang wieder herausgefallen
und die XP mitten in der Ausbildung gesunken, die Gesamtstufe mit ihr und der
Karriereplan hinterher. Die verbliebene Schranke von fünf Jahren fängt nur Unsinn
aus einem eingelesenen Fremdstand ab.

**Die Frage-Werkstatt schickt nichts weg.** Ein Artefakt kann Claude nicht
selbst fragen: die Laufzeit-Fähigkeiten, die eine veröffentlichte Seite
bekommen kann, sind `artifact`, `downloads`, `mcp` und `self` — eine
Modell-Anfrage ist nicht darunter. Ein Chat-Fenster, das nichts antwortet, wäre
schlimmer als keins. Stattdessen nimmt die Karte das Mühsame ab: den
Zusammenhang. Fach, geprüfte Stufe, Notenschnitt samt letzter Arbeit,
Wochen-Schwerpunkte, Stoffzuschnitt und Prüfungsabstand stehen ohnehin in der
Seite und gehen als Text in die Frage; fünf Sorten (erklären, Aufgaben, prüfen,
Denkfehler, abfragen) geben die Bitte und die Erwartung an die Antwort vor. Der
Text ist änderbar, *Neu bauen* stellt den Vorschlag wieder her. Der Entwurf
liegt in `sessionStorage`, nicht im Zustand — er ist ein Schmierzettel, und
jede Veröffentlichung lädt die Ansicht neu.

**Die Schriften halten die Anzeige nicht auf.** Der Verweis im Kopf steht als
`media="print"`; erst wenn die Seite steht, schaltet das Skript ihn auf `all`.
Ein Stylesheet im Kopf blockiert sonst das Zeichnen: hängt der Schriften-Dienst,
blieb die Seite gemessene dreizehn Sekunden leer, statt der 0,14 s bis zum
fertigen Tagesplan. Jetzt steht der Plan sofort da — zuerst in der Ersatzschrift
des Systems, dann wird umgeschaltet. Kommt die Datei nie an, bleibt es bei der
Ersatzschrift; lesbar ist beides.

**Der gedrückte Knopf bleibt unter dem Finger.** `render()` baut die Seite neu,
und ein freier Tag hat einen viel kürzeren Plan — der Knopf *frei setzen* sprang
dabei rund achtzig Pixel weg, sodass beim zweiten Druck etwas anderes dort lag.
`ankern()` merkt sich, wo das Element stand, und scrollt danach zurück. Dasselbe
beim Abstempeln, wo die Anleitung des Blocks verschwindet.

**Ein längst abgelaufener Timer** wird beim Laden fallen gelassen: Wer die Seite
am nächsten Morgen öffnet, soll nicht erst den Wecker von gestern Abend
wegklicken müssen, ehe wieder gesichert wird. Die Grenze liegt bei einer halben
Stunde — was frisch abgelaufen ist, meldet sich noch, denn dort ist die Meldung
ja richtig.

**Der Weckton** entsteht beim Tippen auf `▶`, nicht beim Ablauf: Dort darf ein
`AudioContext` überhaupt erst starten, und die Töne werden gleich auf die Endzeit
gelegt. Die Audio-Uhr läuft im Audio-Thread und wird von einem Tab im Hintergrund
nicht gebremst — `setInterval` schon. Solange ein Timer läuft oder der Wecker
klingelt, veröffentlicht die Seite nicht: eine Veröffentlichung lädt alle offenen
Ansichten neu und würfe den vorgelegten Ton weg.

**Das Wochenziel** wirkt an genau zwei Stellen: der Anzeige *Diese Woche* und dem
Abzeichen *Wochenmeister*. Es beeinflusst weder XP noch Stufen — es ist eine
Ziellinie, kein Hebel.

## Prüfen

```sh
cd lernplan-widget/lernquest/test
npm i playwright-core
node test.mjs        # 248 Prüfungen: Notenrechnung, Zeugnis je Schuljahr, XP-Konto,
                     # Kalenderwoche, Blockzeiten, Fragenkatalog, Rückgängig, Fokus,
                     # Zusammenführen, Schlafenszeit, eigener Stundenplan,
                     # abgelaufener Timer, Schriftladen, Scroll-Anker,
                     # Frage-Werkstatt, IHK-Gewichte, Bestehensregel,
                     # Jahresabschluss, Trennung von Schul- und IHK-Note
node savetest.mjs    # 28: Wecker wird beim Start vorgelegt, nichts wird
                     # während Prüfung, Timer oder Wecker veröffentlicht

# Die beiden Regressionswächter — sie bauen die Datei mit dem alten Fehler:
node test.mjs --ohne-fix      # der Tag sprang beim Veröffentlichen auf heute
node test.mjs --ohne-xp-fix   # Einträge vor heute − 400 Tagen fielen aus der Wertung
```

Beide Läufe erwarten Chromium unter dem Pfad, der oben in der Datei steht —
für eine andere Maschine dort anpassen.
