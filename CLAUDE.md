# Aika Enhanced — notes for working on this repository

A Millennium theme for Steam: the original Aika 0.1.8 (hatewxb/Aika, no license, so ask its author
before redistributing) plus parts of Steam Enhanced (NVHT, MIT, vendored in `vendor/steam-enhanced/`
from commit 7d8439c). Version is in `skin.json`; every release gets a `CHANGELOG.md` entry.

## Layout
- `skin.json` — Millennium conditions (settings) and patches. The first patch injects
  `vendor/steam-enhanced/client/loader.js` (Aika Enhanced's own loader: groups main / desktop /
  menu / app / any, each a list of files).
- Aika's own: `main.css`, `tokens.css`, `colors.css`, `sections/*.css`, `js/*.js`, `options/*.css`
  (a condition's option stylesheet).
- `js/friends-dock.js`, `sections/friends-dock.css` — the Friends Dock.
- `vendor/steam-enhanced/client/navigation/` — the navigation:
  - `nav-config.js` (`window.__aikaNavConfig`) is the configuration: schema, defaults (2.1.0's
    look), validation, presets, JSON import and export. It is stored in localStorage
    `aika-nav-config` and mirrored to Millennium as the condition `__aika_nav`.
  - `aika-nav.js` (`window.__aikaNav`) is the layout engine. Steam's own buttons are never moved
    in the DOM: they get data attributes and custom properties, and `sections/navigation.css` lays
    them out.
  - Rule: a value equal to its default writes nothing, so the defaults render pixel-identical to
    2.1.0. The `AIKA_21` test checks this.
- `vendor/steam-enhanced/client/settings/theme/` — the settings window:
  - `aika-settings.js` (the `SE.settings` adapter over Millennium's FFI);
  - `theme-settings.js` (Steam Enhanced's window; its `settings.customTabs` hook draws custom tabs);
  - `nav-editor.js` / `.css` (the Navigation tab).
- Patched Steam Enhanced files carry an "Aika Enhanced" comment. See `CHANGELOG.md` for the list.

## Store / Community pages
- Those pages are Steam's native browser view. It sits over the main window, so nothing in the
  window's DOM draws above it. Steam sizes the view to `.ContentFrame` when Steam lays the frame
  out (the page shown, the window resized), not whenever the frame's margin changes.
- So the dock's room (`margin-inline-end` on `.ContentFrame`) changes at once on those pages,
  with no easing (`html[data-aika-fdock-page]` in `sections/friends-dock.css`).
- Then `js/friends-dock.js relayoutBrowser()` sends a `resize` event so Steam lays its view out
  again. Never rely on `z-index` there.
- `window.__aikaFriendsDock.diagnose()` reports the boxes, for a check in Steam's DevTools.

## Performance rules (main window)
- Steam's DOM changes many times a second, so nothing may do layout or style reads on every
  mutation:
  - scope `SE.watch` subscribers (`scope:`) to where their nodes live;
  - cache what a pass measures, and re-read it on `resize`, settings events or a slow poll;
  - skip passes that would draw the same thing (see `aika-nav.js sync`'s `lastPass`,
    `friends-dock.js place`'s `lastWhere` / `measureTop`).
- `getComputedStyle(...).getPropertyValue` and `checkVisibility()` recalculate the whole window's
  style when it is dirty. Read the DOM instead where you can (inline style, a `<link>` present).
- Profilers used for 2.3 (harness, with simulated DOM churn) are described in `CHANGELOG.md` 2.3.0.

## Rules
- Real Steam data only; no fake buttons or decorative settings. If something is impossible, leave
  it out and say so.
- Never send account data anywhere, and never message real friends in tests.
- Don't touch the Friends Dock, the chat, the Millennium window, Downloads, the library, the store
  or the community when working on something else.
- Keep existing users' settings across updates: same folder name `Aika-Enhanced`, same condition
  names.
- Warn before closing or restarting Steam. Millennium's built-in theme update does not work, so
  ship a full zip (`Aika-Enhanced-vX.Y.Z.zip`, folder `Aika-Enhanced/` plus `install/`).

## Tests (Playwright against `tests/friends-dock/harness.html`, not real Steam)
```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /
node --test tests/friends-dock.e2e.cjs tests/navigation.e2e.cjs tests/nav-custom.e2e.cjs tests/store-dock.e2e.cjs
REACT_UMD=/path/node_modules node --test tests/friends-dock-2.e2e.cjs tests/nav-custom.e2e.cjs
AIKA_21=/path/to/v2.1.0-checkout node --test tests/nav-custom.e2e.cjs   # pixel parity of the defaults
```
The harness can't reach Steam's popup windows, its own menus, webpack modules or the embedded
chat. Don't claim those as tested.
