# KI-Lernpfad

Eine statische Lernseite, die Schritt für Schritt in den Umgang mit KI einführt: sechs Stufen mit Aufgaben, Übungen, Quiz, Medien und Mini-Bauprojekten.

Live: https://denoshanrajasingam.github.io/ki-lernpfad/

## Ordnerstruktur

```
index.html            Markup der Seite
assets/app.css        Gestaltung (Material 3)
assets/app.js         Logik
content/*.json        Alle Inhalte
version.json          Aktuelle Version mit Datum und Neuigkeiten
CHANGELOG.md          Änderungsprotokoll
scripts/validate.mjs  Prüfskript für Inhalte und Version
.github/workflows/    Automatische Prüfung bei Push und Pull Request
```

## Inhalte bearbeiten

Alle Texte und Daten liegen in `content/`:

| Datei | Inhalt |
| --- | --- |
| `stages.json` | Die sechs Stufen mit Aufgaben (`tasks`), freiwilliger Vertiefung (`deep`) und Selbstchecks (`checks`) |
| `media.json` | Videos, Podcasts, Kurse und Artikel (`id`, `lvl`, `type`, `title`, `by`, `len`, `url`) |
| `missions.json` | Eine Mission pro Stufe |
| `quiz.json` | Quizfragen je Selbstcheck (`q` Frage, `o` Antworten, `a` Index der richtigen Antwort, `x` Erklärung) |
| `practice.json` | Übungen mit Prompt |
| `builds.json` | Mini-App-Projekte |
| `prompts.json`, `terms.json`, `big.json`, `challenges.json`, `game.json` | Prompt-Treppe, Begriffe, Gesamtbild, Tages-Challenges, Spielregeln |

Ein Verweis `go` in einer Aufgabe zeigt auf eine Medien-, Übungs- oder Bau-ID oder auf einen festen Bereich (zum Beispiel `mindset` oder `terms:1`).

**IDs nie ändern.** Die Fortschritte der Nutzer hängen an den IDs. Wird eine ID umbenannt, gehen die erledigten Schritte verloren.

## Lokal testen

Die Seite lädt ihre Inhalte per `fetch`. Sie funktioniert deshalb nicht per `file://`, sondern nur über einen Webserver:

```
python -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Release-Ablauf

1. Inhalte ändern.
2. `node scripts/validate.mjs` ausführen und alle Fehler beheben.
3. In `version.json` Version, Datum und Neuigkeiten (`notes`) anpassen.
4. In `CHANGELOG.md` oben einen neuen Abschnitt mit derselben Version ergänzen.
5. Committen.
6. Tag setzen und pushen: `git tag vX.Y.Z`, danach `git push` und `git push --tags`.
7. GitHub Pages aktualisiert die Seite automatisch. Nutzer sehen einmal den Dialog «Was ist neu».

## Versionsnummer

Es gilt SemVer (X.Y.Z):

- **Major**: grosse Umbauten
- **Minor**: neue Inhalte oder Funktionen
- **Patch**: Korrekturen

## Datenschutz

Alles bleibt lokal im Browser. Es gibt keinen Server und kein Tracking. Der Fortschritt wird mit der PIN verschlüsselt (AES-256) gespeichert.
