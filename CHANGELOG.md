# Changelog

Format: one `## X.Y.Z — date — title` section per release (MAJOR = big changes, MINOR = new
features, PATCH = fixes), each with **New** / **Fixed** lists. Work in progress goes under
`## Unreleased`; `tools/release.ps1` turns it into the release heading.

## Unreleased

Updates through Millennium. No change to the theme's look or settings.

### New
- Aika Enhanced is updated from Millennium → Updates: the `github` block of `skin.json` names this
  repository exactly (`Blackhagwag/Aika-Enhanced`, case included — Millennium matches it as written).
- Manual installs (`install/install.ps1`, `install/install.sh`) write `metadata.json`, so
  Millennium can tell which version is installed.
- Release tooling: `tools/release.ps1` (version sync, tag, `main`), GitHub Actions checks on every
  push and a GitHub Release with a ready archive for every version tag.
- `tools/backup-local.ps1` / `tools/restore-local.ps1`: back up and roll back the installed theme
  and its settings.
- Listing images (`header_image`, `splash_image`) from this repository.

### Fixed
- `metadata.json` is no longer part of the repository (Millennium writes it on install/update; a
  committed copy pointed at an old commit).
- Development files (tests, tools, notes) are left out of the archive Millennium downloads.

## 2.0.0 — 2026-11-25

The dock everywhere, its chat inside it, and Steam Enhanced's Millennium Settings — in Aika's look.
The 1.x dock (its look, sizes, colours, motion, settings, data) is unchanged; a backup of it is the
git tag `v0.1.8-enhanced.1` (branch `backup/aika-enhanced-0.1.8-enhanced.1`).

### Global Friends Dock
- On Store, Community (profiles, Workshop, inventory, Market, discussions) and the other pages of
  the main window, not only the library. One dock, one state: those pages are Steam's native
  browser view laid out in the content frame, so the frame narrows (as Steam Enhanced does) and
  Steam fits the page beside the dock. Expanded/collapsed, scroll position, the open chat go along.
- The tooltip and the friend menu over a browser page go into Steam's popup windows (Steam
  Enhanced's popup layer), with Aika's styles.
- New settings: *Dock: in the library / in the store / in the community / on other pages*.

### Built-in chat (Steam Enhanced's)
- A click on a friend opens the chat beside the dock — Steam Enhanced's engine, unchanged: Steam's
  own Friends & Chat tree mounted in the dock, Steam's chat routing, the chat in a Steam popup
  window over browser pages, minimize to a chip, follow page changes. Everything inside is Steam's
  chat (history, new messages, sending, timestamps, pictures, stickers, emoticons, invites, typing,
  message menus, several conversations as tabs).
- The chat wears Aika's own chat style (sections/friends.css, rescoped onto it) inside an Aika
  floating panel; Steam Enhanced's frame layout keeps its geometry.
- Unread counts on the faces, a pulse when a message arrives, the open conversation highlighted as
  the game list's selected row, a button and a menu item to move a conversation to Steam's window.
- New *Chat* settings tab: *Built-in chat*, *Chat window button*, *Unread badges*, *Message alerts*,
  *Scroll to new messages*, *Keep the open chat* (kept across folds, pages and restarts).
- If Steam's chat cannot be embedded (a Steam update), a click quietly opens Steam's chat window.

### Millennium Settings and theme settings (Steam Enhanced's)
- Steam Enhanced's Millennium Settings design, whole: the window as a popup of its own, the sidebar,
  General's status card, Themes as cards with a pager, the inline Quick CSS editor, Plugins with stat
  tiles, filter, cards and a save bar, Updates, Logs as a table, Brew Hub, the library manager.
  Scoped to Millennium's window: Steam Settings and Game Properties keep Aika's look.
- Steam Enhanced's theme settings window with every Aika Enhanced setting: the presets as swatch
  tiles, Custom colours with its editor, every tab (the dock's and the chat's included), search,
  sliders. Saved where Millennium saves them (Core_ChangeCondition / Core_ChangeColor) and applied
  at once. Opened from the dock's header and from Millennium's theme editor ("All Aika Enhanced
  settings"); Millennium's own editor keeps working.
- All of it in Aika's palette through one token bridge (vendor/steam-enhanced/core/tokens.css end).

### Files
- Added: `vendor/steam-enhanced/` (Steam Enhanced parts + `client/loader.js`, `aika-dock.js`,
  `aika-main.js`, `aika-settings.js`, `friends-dock-aika*.css`, `aika-foundation.css`),
  `options/fdock-page-*-off.css`, `options/fdock-{chat,popout,unread,alerts,autoscroll,keepchat}-off.css`,
  `tools/build-fdock-chat-css.cjs`, `tools/scope-settings-css.cjs`, `tests/friends-dock-2.e2e.cjs`,
  `tests/friends-dock/millennium-stub.js`, `tests/friends-dock/millennium.html`.
- Changed: `js/friends-dock.js`, `sections/friends-dock.css`, `sections/millennium.css` (stands back
  for Steam Enhanced's design), `tokens.css` (+ a sliders icon), `skin.json` (2.0.0, the loader
  patch, 10 settings, the Chat tab), `js/live-settings.js`, `js/settings-l10n.js`, docs.
- Patched Steam Enhanced files (each marked "Aika Enhanced"): `core/tokens.css` (palette bridge),
  `core/runtime.js` (skin.json path), `client/settings/dialog/main.js` (Millennium's window only),
  `client/settings/*.css` (scoped, by the tool), `client/settings/theme/theme-settings.js` (title,
  tabs, sliders, words), `theme-settings.css` (slider), `client/friends/dock/chat-popup.js`
  (the extra button travels with the chat).

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
