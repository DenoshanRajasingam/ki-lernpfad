# Änderungsprotokoll

Die neueste Version steht oben. Daten im Format TT.MM.JJJJ.

## 2.2.0 (07.10.2026)

- Neu: Tab «Quiz» mit über 340 Rätseln und Aufgaben zu allen sechs Stufen
- Sieben Fragearten: Quizfrage, Wahr oder falsch, Lückentext, Reihenfolge, Zuordnen, Prompt-Duell und Fehler finden
- Solo mit drei Bananen-Leben, Combos, Highscore und lustigen Animationen
- Duell mit 2 bis 4 Personen am gleichen Gerät
- Meine Statistik im Profil: Quiz und Lernpfad auf einen Blick, dazu Quiz-Abzeichen
- Alle Versionen: die ganze Versionshistorie bei «Was ist neu»
- Copyright: © 2026 Denoshan Rajasingam
- Technik: assets/quiz.js, Fragen in content/play/s1–s6.json und lines.json, Validierung erweitert, .nojekyll für die Versionshistorie

## 2.1.0 (06.10.2026)

- Neu: Lernweg «Ganz neu» für alle, die noch nie mit KI gearbeitet haben
- Erste Schritte Klick für Klick: Was ist KI, drei Grundregeln, Konto anlegen, erste Frage
- Ruhige Startseite: Punkte, Abzeichen und Tages-Challenge kommen nach Stufe 1 dazu
- In jeder Stufe «Das Wichtigste in einem Satz» und Fachwörter mit Erklärung
- Neuer Startbildschirm: Einfach ausprobieren, Anmelden mit Benutzername und PIN, Profil erstellen auf Klick
- Kompakt, Standard und Tief bleiben unverändert, dein Fortschritt ist übernommen
- Technik: neue Datei content/starter.json, neue Felder starter und gist in content/stages.json, Validierung erweitert

## 2.0.0 (05.10.2026)

- Dein Lernweg: Wähle Kompakt, Standard oder Tief, dazu deine Lieblingsmedien und wo du meistens lernst
- Tagesplan findet jetzt auch für wenig Zeit etwas Passendes und teilt lange Schritte auf
- Neu in jeder Stufe: «Probier's aus» mit Don't, Do und Sätzen zum Nachbessern
- «Lieber anders?»: Viele Schritte gibt es als Video, Podcast oder zum Lesen
- Die Ziellinie zeigt, wie weit es noch bis zu deiner eigenen App ist
- Ohne Einstellungen bleibt alles wie gewohnt, dein Fortschritt ist übernommen
- Technik: Inhalte als JSON in content/, Versionierung mit version.json, Validierung per scripts/validate.mjs und GitHub Action

## 1.0.0 (04.10.2026)

- Lernpfad in sechs Stufen
- Profile mit Benutzername und PIN
- Verschlüsselter Fortschritt (AES-256)
- Mitnahme-Link für den Wechsel auf ein anderes Gerät
- Demo der Stufe 1
- Affen-Avatare
- Material-3-Design
- Effekte
