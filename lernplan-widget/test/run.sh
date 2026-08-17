#!/bin/sh
# ---------------------------------------------------------------------------
#  Prüft die Rechenlogik des Widgets — Kalender, Quoten, Streak, Zeitbudget,
#  Timer, Zustandsdatei. Läuft ohne Übersicht, nur mit Node.
#
#      sh test/run.sh
#
#  Sinnvoll nach jeder Änderung am Tagesplan: schon das Bündeln findet
#  Tippfehler, die Tests finden den Rest.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."

# JSX übersetzen und `uebersicht` durch einen Platzhalter ersetzen — die
# geprüften Funktionen sind rein und brauchen die App nicht.
npx --yes esbuild@0.23.1 lernplan.jsx \
  --bundle --format=esm \
  --jsx-factory=h --jsx-fragment=Fragment \
  --alias:uebersicht=./test/uebersicht-stub.mjs \
  --outfile=test/.bundle.mjs >/dev/null

node test/lernplan.test.mjs
