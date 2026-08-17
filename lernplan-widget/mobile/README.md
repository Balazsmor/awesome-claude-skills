# Lernplan fürs iPhone · Scriptable

`Lernplan.js` ist die Handy-Fassung. Sie zeigt denselben Tagesplan wie das
Mac-Widget, kennt dieselben Schulferien und Feiertage und liest dasselbe
Dateiformat.

## Einrichten

1. **[Scriptable](https://apps.apple.com/de/app/scriptable/id1405459188)** aus
   dem App Store laden (kostenlos).
2. In Scriptable auf **`+`** tippen, den Inhalt von `Lernplan.js` einfügen und
   das Skript **`Lernplan`** nennen. Der Name muss genau so lauten — der Tipp
   aufs Widget öffnet das Skript über seinen Namen.
3. Home-Bildschirm lange drücken → **`+`** → **Scriptable** → **mittlere
   Größe** wählen und platzieren.
4. Das neue Widget lange drücken → **Widget bearbeiten**:
   * *Script* → `Lernplan`
   * *When Interacting* → **Run Script**

Fertig. Ohne weitere Einstellungen läuft es mit den eingebauten Vorgaben.

## Die Größen

| Größe | wo | zeigt |
|---|---|---|
| **Mittel** | Home-Bildschirm | Kopf mit Quote, Fortschrittsbalken, **drei** Blöcke ab der aktuellen Uhrzeit, Streak, Countdown — dafür ist das Layout gemacht |
| **Rechteckig** | Sperrbildschirm | zwei Zeilen: Wochentag + Quote + Streak, der nächste Block, der Zähler |
| Klein | Home-Bildschirm | Quote groß, nächster Block, Streak |
| Groß | Home-Bildschirm | der ganze Tag mit Minutenangaben |

Auf dem Sperrbildschirm heißt die Größe in iOS wörtlich „Rechteckig": Sperr­bild­schirm
bearbeiten → Bereich unter der Uhr antippen → Scriptable → Lernplan.

## Abhaken

iOS-Widgets können keine Häkchen setzen — das erlaubt das System nicht. Ein
**Tipp aufs Widget** öffnet deshalb die Liste in Scriptable:

* Zeile antippen → Häkchen setzen oder wegnehmen
* **Kern abhaken** → Morgenroutine, Anki und Lesen auf einmal
* **Tag als frei / krank markieren** → schaltet weiter, solche Tage zählen nicht
* **Notiz** → kurz festhalten, was hakte
* **Widget-Vorschau** → zeigt, wie das mittlere Widget gerade aussieht

Gespeichert wird sofort. Das Widget zieht nach, sobald iOS es auffrischt —
das entscheidet das System, meist innerhalb weniger Minuten.

## Dateien

Im Scriptable-Ordner (iCloud Drive → Scriptable):

| Datei | Inhalt |
|---|---|
| `lernplan-widget.json` | Häkchen, Markierungen, Notizen |
| `lernplan-config.json` | deine Konfiguration (optional) |
| `lernplan-backup-JJJJ-MM-TT.json` | Kopie vor der ersten Änderung des Tages |

Die Konfiguration hat exakt dasselbe Format wie am Mac — `core`, `exams`,
`vacations`, `days`, `vacationDays`, `freeDay`, `durations`. Mac-spezifische
Schlüssel (`pos`, `width`, `show`, …) werden auf dem Handy ignoriert.

## Mit dem Mac denselben Stand teilen

Beide Fassungen benutzen dasselbe JSON. Damit ein Häkchen vom Handy auf dem Mac
auftaucht, müssen beide auf **dieselbe Datei** zeigen. Der Scriptable-Ordner
liegt in iCloud Drive, also ist er auch auf dem Mac da:

```
~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/
```

In `~/.lernplan-config.json` auf dem Mac eintragen:

```json
"statePath": "$HOME/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/lernplan-widget.json"
```

`$HOME` löst der Mac selbst auf. Danach schreiben beide in dieselbe Datei.
Dieselbe Konfiguration teilen sich beide, indem du `lernplan-config.json` in den
Scriptable-Ordner legst und die Mac-Datei zusätzlich behältst — der Mac liest
seine Konfiguration weiterhin aus `~/.lernplan-config.json`.

Zwei Dinge, die man dabei wissen sollte:

* **Keine echte Konfliktauflösung.** Wer zuletzt schreibt, gewinnt für diesen
  Tag. Wenn du gleichzeitig auf beiden Geräten abhakst, kann ein Haken
  verlorengehen. Für den Alltag — Handy unterwegs, Mac abends — reicht es.
* **iCloud braucht einen Moment.** Ein Häkchen vom Handy ist nicht in derselben
  Sekunde am Mac. Wenn eine Datei nicht geladen ist, lädt das Skript sie vorher
  aus iCloud nach.

Keinen Symlink benutzen: das Mac-Widget schreibt atomar über `mv`, das würde
den Symlink durch eine normale Datei ersetzen und die Verbindung kappen.
Deshalb `statePath`.

## Was fehlt gegenüber der Mac-Fassung

Bewusst weggelassen, weil auf einem Widget dieser Größe nicht sinnvoll:
Monats-Heatmap, Wochenleiste, Zeitbudget-Balken, Fokus-Timer, Nachtragen
vergangener Tage, CSV-Export. Die Zahlen dazu stehen weiterhin auf dem Mac —
das Handy ist zum Nachsehen und Abhaken da.

## Tests

Aus dem übergeordneten Ordner:

```sh
node test/mobile.test.mjs
```

Baut das Skript in einer nachgebauten Scriptable-Umgebung wirklich auf und liest
den fertigen Widget-Baum aus: Ferien- und Feiertagslogik, Quote, Streak,
Blockauswahl nach Uhrzeit, alle vier Größen, kaputte Dateien, und die Liste zum
Abhaken samt Speichern. Ersetzt kein echtes iPhone, fängt aber alles ab, was
nicht am Bildschirm hängt.
