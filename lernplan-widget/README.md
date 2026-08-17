# Lernplan-Widget v6 · Übersicht

Ein Schreibtisch-Widget für [Übersicht](https://tracesof.net/uebersicht/), das den
Wochenplan einer dualen Ausbildung anzeigt, abhakbar macht und auswertet. Es kennt
Schulferien und Feiertage in Baden-Württemberg, rechnet die Prüfung herunter und
bestraft Erholung nicht.

```
lernplan-widget/
├── lernplan.jsx                    → in den Übersicht-Widgets-Ordner
├── lernplan-config.example.json    → nach ~/.lernplan-config.json kopieren
└── test/run.sh                     → Rechenlogik prüfen (nur Node nötig)
```

## Einrichten

1. **Ablegen** — Übersicht-Menüleistensymbol → *Open Widgets Folder* → `lernplan.jsx`
   hineinlegen.
2. **Klickbar machen** — Übersicht-Einstellungen → Interaktions-Shortcut festlegen,
   dazu Systemeinstellungen → Datenschutz & Sicherheit → Bedienungshilfen für
   Übersicht freigeben. Shortcut halten, dann heben sich die Zeilen hervor.
3. **Anpassen** — `lernplan-config.example.json` nach `~/.lernplan-config.json`
   kopieren und ändern. Alles dort gewinnt gegen die Defaults im Widget, ein
   Update überschreibt deine Einstellungen also nicht.

Mehr als das legt das Widget im Benutzerordner nicht an:

| Datei | Inhalt |
|---|---|
| `~/.lernplan-config.json` | deine Konfiguration (optional) |
| `~/.lernplan-widget.json` | Häkchen, Markierungen, Notizen, laufender Timer |
| `~/.lernplan-backups/` | tägliche Sicherung, 14 Stände rollierend |

## Was drin steckt

**Tag.** Der Plan des Tages als Liste, Klick setzt das Häkchen. Fixtermine
(Schule, Betrieb, Pizzeria) sind nur Kontext und nicht abhakbar. Ein Block, der
mehr als eine Stunde überfällig ist, bekommt ein `offen`.

**Minimal-Kern.** Drei Blöcke (`morgen`, `anki`, `lesen`) entscheiden über
„Tag gerettet" und über die Streak — das Sicherheitsnetz für schlechte Tage.
`Kern ✓` hakt sie in einem Klick ab.

**Fokus-Timer.** `▶` an einem Block startet einen Timer über dessen Dauer; die
Dauer kommt aus dem Namen (`Lesen 45′`), aus `min` oder aus `durations`. Der Timer
liegt in der Statusdatei, überlebt also jedes Neuladen, und meldet sich am Ende
per macOS-Mitteilung. Häkchen setzen beendet ihn.

**Zeitbudget.** Statt nur „3 von 5 Tasks" auch „1 h 30 von 3 h 45" — für den Tag,
für die Woche, für den Monat. Optional mit Wochenziel (`weeklyGoalMin`).

**Woche.** Mo–So als Balken, heute hervorgehoben, freie Tage ausgegraut.

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

Übersetzt `lernplan.jsx`, ersetzt das `uebersicht`-Modul durch einen Platzhalter
und prüft die reine Rechenlogik: Osterformel und Feiertage, Ferien- und
Wochenendlogik, Quoten, Streak über Krankheitstage hinweg, Zeitbudget, Timeline,
Timer, CSV, Migration alter Statusdateien und die Prüfung der Konfiguration.
Braucht nur Node und einmalig esbuild über `npx`.

## Änderungen gegenüber v5

Neu: Fokus-Timer, Jetzt-/Als-Nächstes-Streifen, Zeitbudget, Wochenleiste mit
Ziel, Monatsnavigation, Tagesnotizen, `krank` als eigene Markierung,
`Kern ✓`-Knopf, CSV-Export, automatische Sicherung, Konfigurationsprüfung,
Schlafenszeit-Hinweis, Vorschau auf den nächsten freien Tag.

Behoben und aufgeräumt:

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
