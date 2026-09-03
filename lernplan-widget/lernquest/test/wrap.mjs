// Baut aus dem Artefakt-Fragment ein vollständiges Dokument — genau so, wie
// die Artifact-Ablage es beim Veröffentlichen tut.
import { readFileSync, writeFileSync } from "node:fs";
const frag = readFileSync("lernquest.html", "utf8");
writeFileSync("preview.html",
`<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0}</style></head><body>
${frag}
</body></html>`);
console.log("preview.html gebaut");
