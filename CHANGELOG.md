# Changelog

## 0.1.8-enhanced.1 — 2026-11-25

First release of Aika Enhanced: Aika 0.1.8 (hatewxb/Aika@2620365) with the Friends Dock.

### Added
- **Friends Dock** — a friends column at the right of the library, collapsed (rail of
  faces) or expanded (names, games, groups In game / Online / Offline, online count,
  optional grouping by game). Real friends from Steam's Friends store, live status
  updates with per-row diffing, chat on click, menu with Send message / View profile /
  View game in Library, tooltips in the rail, expand on hover, small-window fold,
  remembered state. Behaviour adapted from Steam Enhanced's Friends dock (NVHT, MIT).
- `js/friends-dock.js`, `sections/friends-dock.css`.
- A **Friends Dock** settings tab (12 settings) and `options/fdock-*.css` condition files.
- `install/install.ps1`, `install/install.sh` — installers with backup.
- `tests/friends-dock.e2e.cjs` + `tests/friends-dock/` — browser tests and harness.
- `LICENSES/` — authors and licenses; `docs/friends-dock/` — screenshots.

### Changed (from Aika 0.1.8)
- `skin.json` — name, author, description, version, tags, GitHub repository, the new tab.
- `metadata.json` — points to this repository.
- `main.css` — imports `sections/friends-dock.css`.
- `tokens.css`, `colors.css` — a "Friends Dock" block (sizes, timings, layers; one color
  derived from existing tokens). No existing token changed.
- `js/main.js` — imports `js/friends-dock.js`.
- `js/live-settings.js` — applies the dock's dropdown settings at once; accepts the editor
  title "Aika Enhanced"; the katakana font URL is resolved from the script's own address
  instead of the hard-coded `themes/Aika` folder (it broke under any other folder name).
- `js/settings-l10n.js` — Russian names and descriptions of the dock settings.
- `README.md` — rewritten for Aika Enhanced. The README screenshots folder of Aika is not
  included (66 MB, not used by the theme).

Nothing else of Aika is changed; with the dock off the window is pixel-identical to Aika
in the test harness.
