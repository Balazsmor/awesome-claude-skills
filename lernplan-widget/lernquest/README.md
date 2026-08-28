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
| **Karriereplan** | Die sechs Phasen des CFO-Plans, gesperrt bis Datum und Fachstufen stimmen |
| **Wochenkalender** | Sieben Knöpfe — jeder vergangene Tag ist einen Klick zum Nachtragen entfernt |
| **Fokus-Timer** | `▶` je Block, läuft über die Blockdauer; der Weckton wird beim Start in der Audio-Uhr vorgelegt und klingelt auch im Hintergrund-Tab |
| **Jetzt-Marker** | Die Seite liest die Uhr: der laufende Block ist hervorgehoben, darüber steht, was als Nächstes ansteht |
| **Tagesnotiz und Schwerpunkte** | Eine Zeile je Tag, zwei Themen je Woche — dieselben Schlüssel, die auch das Mac-Widget schreibt |
| **Rückgängig** | Eine Minute lang lässt sich jeder Handgriff zurücknehmen, der etwas wegnimmt |
| **Monat** | Blätterbar und klickbar; ein Tag mit Notiz bekommt eine Ecke |
| **Schlafenszeit** | Ab 19:00 steht unter dem Tagesplan, wann Schluss sein müsste — rückwärts vom nächsten Weckruf, `sleepHours` aus dem Plan |
| **Eigener Stundenplan** | Zeiten, Blöcke, Ferien und Prüfungstermine lassen sich in der Seite selbst ändern — dieselben Schlüssel wie `lernplan-config.json` |

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

**Zeugnisnoten rechnen je Schuljahr.** Das Schuljahr kommt aus dem Datum, August
bis Juli: `2026-07-29` gehört zu 2025/26. Jedes Jahr bekommt einen eigenen Block
mit eigenem Schnitt, das jüngste oben; Deutsch 2026 wird also nicht still mit
Deutsch 2027 gemittelt. Auch die Gegenprobe der Berufsfachlichen Kompetenz zieht
nur Klassenarbeiten **desselben** Schuljahres heran. Ein Fach, das ich nicht
vorgesehen habe, trägt man unter *Weiteres Fach* ein; sein Name wird zur Kennung
(`zg:x:religion`), zwei Zusatzfächer stehen daher als zwei Zeilen da.

**Punkte sind ein Konto, kein Fenster.** Gezählt wird ab dem ersten Eintrag.
Vorher lagen 400 Tage davor — ab dem 401. wäre der Anfang wieder herausgefallen
und die XP mitten in der Ausbildung gesunken, die Gesamtstufe mit ihr und der
Karriereplan hinterher. Die verbliebene Schranke von fünf Jahren fängt nur Unsinn
aus einem eingelesenen Fremdstand ab.

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
node test.mjs        # 160 Prüfungen: Notenrechnung, Zeugnis je Schuljahr, XP-Konto,
                     # Kalenderwoche, Blockzeiten, Fragenkatalog, Rückgängig, Fokus,
                     # Zusammenführen, Schlafenszeit, eigener Stundenplan,
                     # abgelaufener Timer
node savetest.mjs    # 28: Wecker wird beim Start vorgelegt, nichts wird
                     # während Prüfung, Timer oder Wecker veröffentlicht

# Die beiden Regressionswächter — sie bauen die Datei mit dem alten Fehler:
node test.mjs --ohne-fix      # der Tag sprang beim Veröffentlichen auf heute
node test.mjs --ohne-xp-fix   # Einträge vor heute − 400 Tagen fielen aus der Wertung
```

Beide Läufe erwarten Chromium unter dem Pfad, der oben in der Datei steht —
für eine andere Maschine dort anpassen.
