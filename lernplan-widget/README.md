# Lernplan-Widget v7.2 · Übersicht

Ein Schreibtisch-Widget für [Übersicht](https://tracesof.net/uebersicht/), das den
Wochenplan einer dualen Ausbildung anzeigt, abhakbar macht und auswertet. Es kennt
Schulferien und Feiertage in Baden-Württemberg, rechnet die Prüfung herunter und
bestraft Erholung nicht.

```
lernplan-widget/
├── lernplan.jsx                    → in den Übersicht-Widgets-Ordner
├── lernplan-config.example.json    → nach ~/.lernplan-config.json kopieren
├── mobile/Lernplan.js              → iPhone-Fassung für Scriptable
└── test/run.sh                     → alles prüfen (nur Node nötig)
```

Fürs iPhone gibt es eine eigene Fassung: [`mobile/`](mobile/README.md) —
mittleres Widget auf dem Home-Bildschirm, rechteckiges auf dem Sperrbildschirm,
Abhaken per Tipp. Sie liest dasselbe Dateiformat; mit `statePath` teilen sich
beide denselben Stand über iCloud Drive.

## Einrichten

1. **Ablegen** — Übersicht-Menüleistensymbol → *Open Widgets Folder* → `lernplan.jsx`
   hineinlegen. Es läuft sofort, eine Konfigurationsdatei ist nicht nötig.
2. **Klickbar machen** — Übersicht-Einstellungen → Interaktions-Shortcut festlegen,
   dazu Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen für
   Übersicht freigeben. Shortcut halten, dann heben sich die Zeilen hervor.
3. **Anpassen** — beim ersten Start bietet das Widget selbst an, die
   Konfiguration anzulegen; ein zweiter Knopf öffnet sie im Texteditor.
   Wer lieber von Hand anfängt, kopiert `lernplan-config.example.json` nach
   `~/.lernplan-config.json`. Alles dort gewinnt gegen die Defaults im Widget,
   ein Update überschreibt deine Einstellungen also nicht.

Der Knopf `?` im Kopf blendet jederzeit eine Kurzhilfe ein, die alle Klickziele
aufzählt — das ist der schnellste Einstieg.

Mehr als das legt das Widget im Benutzerordner nicht an:

| Datei | Inhalt |
|---|---|
| `~/.lernplan-config.json` | deine Konfiguration (optional) |
| `~/.lernplan-widget.json` | Häkchen, Markierungen, Notizen, laufender Timer |
| `~/.lernplan-backups/` | tägliche Sicherung, 14 Stände rollierend |

## Bedienung auf einen Blick

| Klick auf | passiert |
|---|---|
| Zeile im Tagesplan | Häkchen setzen oder wegnehmen |
| `▶` in der Zeile | Fokus-Timer über die Blockdauer starten |
| `Kern ✓` | Morgenroutine, Anki und Lesen auf einmal abhaken |
| `frei setzen` | weiterschalten: frei → krank → normal |
| `?` | Kurzhilfe ein- und ausblenden |
| `⌃ kompakt` | Woche und Monat ausblenden — halbe Höhe |
| Notizzeile | Tagesnotiz schreiben |
| `Fokus der Woche` | zwei Schwerpunkte für die Woche festlegen |
| Tag im Monatsgitter | Tag zum Nachtragen öffnen |
| `‹` `›` | durch die Monate blättern |
| `↩ Rückgängig` | den letzten Klick zurücknehmen (60 Sekunden lang) |

Klicken funktioniert nur, solange der Übersicht-Interaktions-Shortcut gedrückt
ist. Kompaktmodus und Hilfe merkt sich das Widget über Neustarts hinweg.

## Was drin steckt

**Tag.** Der Plan des Tages als Liste, Klick setzt das Häkchen. Fixtermine
(Schule, Betrieb, Pizzeria) sind nur Kontext und nicht abhakbar. Ein Block, der
mehr als eine Stunde überfällig ist, bekommt ein `offen`. Sind alle wertbaren
Blöcke erledigt, steht dort `Feierabend`.

**Minimal-Kern.** Drei Blöcke (`morgen`, `anki`, `lesen`) entscheiden über
„Tag gerettet" und über die Streak — das Sicherheitsnetz für schlechte Tage.
`Kern ✓` hakt sie in einem Klick ab.

**Fokus-Timer.** `▶` an einem Block startet einen Timer über dessen Dauer; die
Dauer kommt aus dem Namen (`Lesen 45′`), aus `min` oder aus `durations`. Der Timer
liegt in der Statusdatei, überlebt also jedes Neuladen, und meldet sich am Ende
per macOS-Mitteilung. Häkchen setzen beendet ihn. `+10′` verlängert ihn,
`Pause` beendet den Block und startet stattdessen eine kurze Pause, die sich
ebenfalls meldet.

**Schwerpunkte der Woche.** Zwei Themen, die in der Sonntagsplanung festgelegt
werden und die ganze Woche über dem Tagesplan stehen. Der Schlüssel ist die
ISO-Kalenderwoche, der Jahreswechsel mitten in der Woche macht also nichts.

**Rückgängig.** Der letzte Klick — Häkchen, Kern, Markierung, Notiz — lässt sich
60 Sekunden lang zurücknehmen. Bewusst nur im Speicher: nach einem Neustart will
niemand mehr einen Klick von vorgestern rückgängig machen.

**Zeitbudget.** Statt nur „3 von 5 Tasks" auch „1 h 30 von 3 h 45" — für den Tag,
für die Woche, für den Monat. Optional mit Wochenziel (`weeklyGoalMin`).

**Woche.** Mo–So als Balken, heute hervorgehoben, freie Tage ausgegraut. Daneben
der Vergleich mit der Vorwoche — gemessen am gleichen Wochentag, damit Montag
nicht gegen eine volle Woche antritt.

**Nachtragen.** Wurde am Vortag nichts eingetragen, weist der Fuß darauf hin und
öffnet den Tag auf Klick.

**Monat.** Heatmap mit ‹ › zum Blättern. Klick auf einen Tag öffnet ihn zum
Nachtragen, ein Punkt in der Ecke markiert Tage mit Notiz. Dazu Streak,
Kern-Tage, Lernzeit und die schwächste Gewohnheit des Monats.

**Frei und krank.** Der Knopf im Kopf schaltet weiter: `frei` → `krank` →
normal. Solche Tage zählen nicht in die Quote und brechen die Streak nicht —
Feiertage und selbst markierte Tage überbrücken sie.

**Notizen.** Klick auf die Notizzeile öffnet ein Eingabefeld (`osascript`).
Gedacht als Fehlerprotokoll: was hakte heute. Landet im CSV-Export.

**Prüfung.** Countdown auf den nächsten Termin, dazu die ehrlichere Zahl:
wie viele echte Lerntage und Deep-Work-Blöcke bis dahin überhaupt noch anstehen.

**Kalender.** Feiertage in Baden-Württemberg werden aus der Osterformel
berechnet, Schulferien kommen aus der Konfiguration. In den Ferien greift
`vacationDays` — Tage, die dort fehlen, fallen automatisch auf `days` zurück.
Läuft die Ferienliste aus, sagt das Widget Bescheid, statt still wieder
Schultage anzuzeigen.

**Sicherung.** Einmal täglich automatisch nach `~/.lernplan-backups`, 14 Stände.
`Sicherung` legt zusätzlich eine Kopie mit Zeitstempel an, `CSV` schreibt den
gerade angezeigten Monat als Semikolon-CSV in den Benutzerordner.

## Konfiguration

Die wichtigsten Schlüssel, alle optional:

| Schlüssel | Bedeutung |
|---|---|
| `width`, `scale` | Größe (320–900 px, 0.6–2.0) |
| `show` | Abschnitte einzeln abschalten, z. B. `{"week": false}` |
| `core` | Block-IDs des Minimal-Kerns |
| `weeklyGoalMin` | Wochenziel in Minuten, `0` schaltet es ab |
| `sleepHours` | für den Schlafenszeit-Hinweis am Abend |
| `overdueAfterMin` | ab wann ein Block als `offen` gilt |
| `autoBackup` | tägliche Sicherung an/aus |
| `breakMin`, `extendMin` | Länge der Pause und Schrittweite von `+10′` |
| `statePath` | anderer Ort für die Zustandsdatei, z. B. iCloud Drive fürs iPhone |
| `durations` | Standarddauer je Art, wenn im Namen keine steht |
| `exams` | `[{ "date": "2027-02-25", "label": "IHK Teil 1" }]` |
| `vacations` | `[["von", "bis", "Name"], …]` |
| `days`, `vacationDays` | Tagespläne, einzelne Tage genügen |
| `freeDay` | Plan für Feiertage, Urlaub und Krankheit |

Ein Block: `{ "id": "lesen", "t": "18:00", "nm": "Lesen 45′", "kind": "lese", "track": true }`

* `kind` — `morg` `anki` `deep` `wdh` `lese` `frei` `fix` (steuert die Farbe)
* `track: true` — abhakbar und zählt in die Quote
* `opt: true` — abhakbar, zählt aber nicht
* `min` — Dauer in Minuten, sonst aus dem Namen oder aus `durations`
* `t` — `"17:15"`, `"ab 19"`, `"opt."` oder `"—"`

Die `id` muss innerhalb eines Tages eindeutig sein, sonst hängen zwei Häkchen
aneinander. Das Widget prüft das beim Laden und meldet es, zusammen mit kaputten
Datumsangaben und Kern-Einträgen, zu denen es keinen Block gibt.

Nicht in der Konfiguration: `pos`. Übersicht liest die Position einmal beim
Laden aus `lernplan.jsx`, bevor es die Konfigurationsdatei überhaupt gibt — die
steht deshalb weiterhin oben in den `DEFAULTS`.

## Tests

```sh
sh test/run.sh
```

Fünf Durchgänge, zusammen 391 Zusicherungen, alle brauchen nur Node und
einmalig esbuild über `npx`:

* **JSX wie bei Übersicht** — übersetzt `lernplan.jsx` mit genau den
  Einstellungen der App (Pragma `html`, *kein* Fragment-Pragma) und prüft, dass
  im Ergebnis kein `React` mehr vorkommt. Ohne diesen Durchgang fällt ein
  einzelnes `<>…</>` erst beim Laden auf dem Mac auf.

* **Rechenlogik** — Osterformel und Feiertage, Ferien- und Wochenendlogik,
  Kalenderwochen über den Jahreswechsel, Quoten, Streak über Krankheitstage
  hinweg, Zeitbudget, Timeline, Timer, CSV, Migration alter Statusdateien und
  die Prüfung der Konfiguration.
* **Shell** — führt jeden Aufruf aus `SH` gegen ein Wegwerf-`$HOME` wirklich
  aus: atomares Schreiben, Rettung einer defekten Datei, Anlegen der
  Konfiguration samt Überschreibschutz, Rotation der Sicherungen, CSV. Inklusive
  Anführungszeichen, Zeilenumbrüchen und `$(…)` im Text.
* **iOS** — baut `mobile/Lernplan.js` in einer nachgebauten Scriptable-Umgebung
  wirklich auf und liest den fertigen Widget-Baum aus, für alle vier Größen.
* **Kontrast & Klickflächen** — rechnet jede Farbe des Stylesheets gegen den
  ungünstigsten Untergrund und prüft die Mindestgröße der Bedienelemente. Die
  Werte werden aus `lernplan.jsx` gelesen, nicht im Test gepflegt: wer eine
  Farbe ändert, merkt es hier.

## Lesbarkeit und Klickflächen

Das Widget hält WCAG 2.2 AA, soweit es für eine Schreibtischfläche sinnvoll ist:

* **Text 4,5:1, Bedienelemente 3:1.** Der Haken dabei: die Karte ist
  halbtransparent, der wirkliche Untergrund ist also dein Hintergrundbild.
  Gerechnet wird deshalb gegen den ungünstigsten Fall — ein weißes Bild — und
  gegen die aufgehellten Flächen darüber. Die Kartendeckkraft liegt bei 0,93,
  damit die Spanne überhaupt beherrschbar bleibt.
* **Klickflächen mindestens 24 × 24 px.** Das ist nicht nur Norm: Man trifft
  diese Ziele mit gedrücktem Interaktions-Shortcut, und 14 px hohe Chips waren
  dafür zu klein.
* **„Bewegung reduzieren"** aus den Systemeinstellungen schaltet die
  Überblendungen ab.

Was bewusst fehlt: ARIA-Rollen, Tastaturbedienung und Fokusringe. Ein
Übersicht-Widget liegt in der Schreibtischebene, bekommt keinen Tastaturfokus
und wird von Bildschirmlesern nicht erreicht — dort Rollen hineinzuschreiben,
sähe nach Barrierefreiheit aus, ohne welche zu sein.

## Eine Falle beim Ändern

Übersicht übersetzt `.jsx`-Widgets mit `@babel/preset-react` und dem Pragma
**`html`** — global steht `window.html = React.createElement`. Ein `React` gibt
es im Widget nicht.

Für Fragmente (`<>…</>`) setzt Babel aber unabhängig davon `React.Fragment`
ein. Ein einziges Fragment im Code, und das Widget lädt gar nicht mehr:

```
ReferenceError: Can't find variable: React
```

Also **keine Fragmente** — stattdessen ein echtes Element oder die Bedingung
weiter nach innen ziehen. `sh test/run.sh` prüft das mit.

## Änderungen

**v7.2 — Absturz behoben.** Zwei `<>…</>` im „Jetzt / Gleich"-Streifen (neu in
v7) verhinderten, dass das Widget überhaupt lud. Ersetzt durch ein normales
Element; neuer Testdurchgang, der genau diesen Fall abfängt.

**v7.1 — Lesbarkeit.** Kontrast und Klickflächen nach WCAG 2.2 AA, siehe oben.
Alle Textfarben, die die Grenze rissen, haben eigene Textvarianten bekommen
(`--deep-tx`, `--frei-tx`, `--sick-tx`, `--done-tx`); als Rahmen bleibt die
kräftige Farbe. Neuer Testdurchgang, der das nachrechnet.

**v7 — Bedienung.** `?`-Kurzhilfe, Kompaktmodus, Rückgängig für den letzten
Klick, Einrichtungshilfe beim ersten Start, Wochenschwerpunkte, Pause und
`+10′` am Timer, Nachtrags-Erinnerung, `Feierabend`, Wochenvergleich, Knopf zum
Öffnen der Konfiguration. Innen: alle Shell-Aufrufe liegen jetzt gesammelt in
`SH` und werden von den Tests wirklich ausgeführt; Dateinamen gehen durch
`safeName`.

**v6 — Funktion.** Fokus-Timer, Jetzt-/Als-Nächstes-Streifen, Zeitbudget,
Wochenleiste mit Ziel, Monatsnavigation, Tagesnotizen, `krank` als eigene
Markierung, `Kern ✓`, CSV-Export, automatische Sicherung, Konfigurationsprüfung,
Schlafenszeit-Hinweis, Vorschau auf den nächsten freien Tag. Dazu behoben:

* Fehlt ein Wochentag in der Konfiguration, stürzte der Kopf ab (`cfg.days[dk].label`
  ohne Rückfall) — geht jetzt über `labelOf`.
* `"ab 19"` war keine erkennbare Uhrzeit, solche Blöcke wurden nie als „jetzt"
  markiert.
* Feiertage wurden pro Kalenderzelle neu aus der Osterformel gerechnet, die
  Monatsauswertung lief dreimal durch denselben Monat — jetzt gecacht und in
  einem Durchgang.
* Die Konfigurationsdatei wurde alle 60 Sekunden neu zusammengeführt, auch wenn
  sie unverändert war.
* Eine unlesbare Statusdatei wurde beim ersten Klick kommentarlos überschrieben;
  sie wandert jetzt vorher als `.broken` zur Seite.
* Ein Fehler beim Aufbau nahm das ganze Widget vom Schreibtisch — jetzt fängt
  eine Fehlerbremse ihn ab und zeigt die Meldung.

## Bewusst nicht drin

* **Helles Erscheinungsbild.** Die Farbflächen sitzen als `rgba(255,255,255,…)`
  im Stylesheet; ein sauberes helles Thema hieße, die halbe CSS auf Variablen
  umzustellen. Lohnt erst, wenn es wirklich gebraucht wird.
* **`pos` in der Konfiguration.** Übersicht liest `className` einmal beim Laden
  aus, bevor die Konfigurationsdatei existiert. Dynamisch ginge nur über eine
  fest positionierte innere Karte — die würde das Verschieben per Maus in
  Übersicht kaputt machen.
