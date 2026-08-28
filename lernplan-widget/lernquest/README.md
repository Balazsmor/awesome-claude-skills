# Lernquest · das Berichtsheft im Browser

Die Web-Fassung des Lernplans, veröffentlicht als Claude-Artefakt:
<https://claude.ai/code/artifact/21eb9372-5881-42f9-9f18-47b40ead4762>

Sie rechnet genauso wie das Übersicht-Widget — Feiertage aus der Osterformel,
Schulferien aus der Liste, Ferienpläne statt Schulpläne — und liest dasselbe
JSON-Format wie `~/.lernplan-widget.json`. Über den Abschnitt *Austausch mit dem
Widget* wandert der Stand in beide Richtungen.

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
Artefakt-eigen sind `q` (bestandene Stufenprüfungen), `g` (Noten), `zn` (Zielnote)
und `zw` (Wochenziel) — das Widget lässt sie beim Einlesen einfach fallen.

In `g` unterscheidet der Vorsatz die drei Sorten: ohne Vorsatz eine
Klassenarbeit, `ihk:` ein Block der Abschlussprüfung, `zg:` eine Zeugnisnote.
Die drei werden getrennt gerechnet — eine Zeugnisnote ist bereits ein Mittel und
darf den Schnitt der Klassenarbeiten nicht ein zweites Mal belasten.

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
node test.mjs        # 105 Prüfungen: Notenrechnung, Zeugnis mit BFK, Kalenderwoche,
                     # Blockzeiten, Fragenkatalog, Rückgängig, Fokus, Zusammenführen
node savetest.mjs    # 28: Wecker wird beim Start vorgelegt, nichts wird
                     # während Prüfung, Timer oder Wecker veröffentlicht
node test.mjs --ohne-fix   # zeigt den behobenen Fehler: der Tag sprang auf heute
```

Beide Läufe erwarten Chromium unter dem Pfad, der oben in der Datei steht —
für eine andere Maschine dort anpassen.
