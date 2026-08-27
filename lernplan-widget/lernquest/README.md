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
| **Karriereplan** | Die sechs Phasen des CFO-Plans, gesperrt bis Datum und Fachstufen stimmen |
| **Wochenkalender** | Sieben Knöpfe — jeder vergangene Tag ist einen Klick zum Nachtragen entfernt |

## Datei

`lernquest.html` ist ein HTML-**Fragment**, kein vollständiges Dokument: Titel,
Fonts, `<style id="app-style">`, `#root`, der Prüfungsdialog, der eingebettete
Zustand und `<script id="app">`. Die Artefakt-Ablage packt Kopf und Körper
darum. `test/wrap.mjs` tut dasselbe für den lokalen Blick ins Ergebnis.

Der Fragenkatalog (`QUIZ`) ist vorläufig und aus der offiziellen Prüfungsstruktur
gebaut, nicht aus eigenen Klausuren — zum Austauschen die fünf Listen ersetzen.

## Prüfen

```sh
cd lernplan-widget/lernquest/test
npm i playwright-core
node test.mjs        # 57 Prüfungen: Notenrechnung, Wochenkalender, Tagesspeicher
node savetest.mjs    # während einer Stufenprüfung wird nicht veröffentlicht
node test.mjs --ohne-fix   # zeigt den behobenen Fehler: der Tag sprang auf heute
```

Beide Läufe erwarten Chromium unter dem Pfad, der oben in der Datei steht —
für eine andere Maschine dort anpassen.
