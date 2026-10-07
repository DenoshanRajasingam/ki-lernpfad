# KI-Lernpfad

Eine statische Lernseite, die Schritt für Schritt in den Umgang mit KI einführt: sechs Stufen mit Aufgaben, Übungen, Quiz, Medien und Mini-Bauprojekten.

Live: https://denoshanrajasingam.github.io/ki-lernpfad/

## Ordnerstruktur

```
index.html            Markup der Seite
assets/app.css        Gestaltung (Material 3)
assets/app.js         Logik
content/*.json        Alle Inhalte
assets/quiz.js        Quiz-Tab
content/play/         Quizfragen je Stufe
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
| `starter.json` | Karten für den Lernweg «Ganz neu» (`id`, `title`, `body`, optional `prompt`), Sprungziel `start:<id>` |
| `media.json` | Videos, Podcasts, Kurse und Artikel (`id`, `lvl`, `type`, `title`, `by`, `len`, `url`) |
| `play/s1.json` … `play/s6.json`, `play/lines.json` | Quizfragen je Stufe (mindestens 50) und lustige Sprüche |
| `missions.json` | Eine Mission pro Stufe |
| `quiz.json` | Quizfragen je Selbstcheck (`q` Frage, `o` Antworten, `a` Index der richtigen Antwort, `x` Erklärung) |
| `practice.json` | Übungen mit Prompt |
| `builds.json` | Mini-App-Projekte |
| `prompts.json`, `terms.json`, `big.json`, `challenges.json`, `game.json` | Prompt-Treppe, Begriffe, Gesamtbild, Tages-Challenges, Spielregeln |

Für den Lernweg «Ganz neu» gibt es in `stages.json` drei optionale Felder: `starter` auf Stufenebene (zusätzliche Schritte vorne), `starter` auf Schrittebene (`false` blendet aus, ein Objekt überschreibt `txt`, `dur`, `min`, `go` oder `media`) und `gist` (das Wichtigste in einem Satz).

Ein Verweis `go` in einer Aufgabe zeigt auf eine Medien-, Übungs- oder Bau-ID oder auf einen festen Bereich (zum Beispiel `mindset` oder `terms:1`).

**IDs nie ändern.** Die Fortschritte der Nutzer hängen an den IDs. Wird eine ID umbenannt, gehen die erledigten Schritte verloren.

## Quizfragen

Jede Quizfrage hat eine eindeutige ID nach dem Schema `q<stufe>-<nnn>` (zum Beispiel `q1-042`). Die gemeinsamen Felder sind:

- `id`: Eindeutige ID, nie ändern
- `type`: Fragetyp (siehe unten)
- `topic`: Thema oder Stichwort (zum Beispiel `Prompt-Tipps`)
- `q`: Die Frage oder Aufgabe (für `gap`: mit `___` als Lücke)
- `x`: Erklärung oder Hilfe bei falscher Antwort

Die sieben Fragetypen:

- `mc`: Multiple Choice; Felder `o` (Array von Antworten) und `a` (Index der richtigen)
- `tf`: Wahr oder falsch; Feld `a` ist `true` oder `false`
- `gap`: Lückentext; Felder `o` (Array von Alternativen) und `a` (Index der richtigen)
- `order`: Reihenfolge; Feld `items` (Array in richtiger Reihenfolge), `a` ist Index 0
- `match`: Zuordnung; Feld `pairs` (Array von [links, rechts]) und `a` ist Index 0
- `prompt`: Prompt-Duell; Felder `o` (Array mit 2 Prompts) und `a` (Index des besseren)
- `spot`: Fehler finden; Feld `lines` (Array von Sätzen), `a` ist Index des falschen Satzes

Neue Fragen einfach am Ende der Datei anhängen. **Niemals IDs ändern** — der Nutzer-Fortschritt hängt daran!

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

## Copyright

© 2026 Denoshan Rajasingam. Alle Rechte vorbehalten.
