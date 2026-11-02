# KI-Lernpfad

Spielerische Lernseite (GitHub Pages, privat betrieben) mit sechs Stufen bis zur eigenen App.

## Aufbau

- `index.html` mit `assets/app.js`, `assets/quiz.js` und `assets/app.css`
- `content/*.json`: alle Inhalte (Stufen, Medien, Prompts, Quiz, Einsteiger-Weg); Quizfragen in `content/play/`
- `version.json` und `CHANGELOG.md`: Version und Änderungsprotokoll
- `scripts/validate.mjs`: Inhaltsprüfung, läuft auch als GitHub Action (`.github/workflows/validate.yml`)
- `.nojekyll`: nötig, damit die Versionshistorie das `CHANGELOG.md` lesen kann

## Release-Ablauf

1. Inhalte ändern
2. `node scripts/validate.mjs` ausführen, muss grün sein
3. `version.json` und `CHANGELOG.md` nachführen
4. Committen und Tag `vX.Y.Z` setzen
5. Push inklusive Tags

## Regeln

- Schritt-IDs in `content/stages.json` nie ändern, die verschlüsselten Fortschritte hängen daran.
- Profile und Fortschritt bleiben lokal im Browser und sind verschlüsselt (PBKDF2 und AES-GCM).
- Alles Neue additiv umsetzen, das Standardverhalten bleibt unverändert.
- Nur deutsche Texte und Quellen, in Schweizer Hochdeutsch.
- Datumsformat im `CHANGELOG.md`: TT.MM.JJJJ (DD.MM.YYYY).
- Werkzeugneutral bleiben (ChatGPT, Claude, Gemini); einzige Ausnahme ist der Einsteiger-Weg, der ChatGPT als Start empfiehlt.
