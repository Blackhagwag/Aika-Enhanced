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

## Store / Community / profile pages
- Those pages are Steam's native browser view. It sits over the main window, so nothing in the
  window's DOM ever draws above it.
- Steam alone decides when to lay the view out again in `.ContentFrame`. 2.2 eased the room; 2.3
  made the room change at once and sent a `resize` nudge. Neither made the open dock visible in
  real Steam.
- Since 2.4, on a browser page:
  - the page's room stays the rail's in both states (`--aika-fdock-space` under
    `html[data-aika-fdock-page]`);
  - the open dock (and the Expand-on-hover peek) is drawn in one of Steam's popup windows over
    the page, through Steam Enhanced's popup layer (`SE.layer.panel`). It is the same mechanism
    as the dock's tooltips, menus and the built-in chat over those pages.
- The dock's own header and list move into that window (`layerShell > layerBox`) and back, with
  their listeners. One dock, one state. The library keeps the dock in the window.
- Steam can close popup windows on its own. `syncLayer()` then brings the parts home and reopens
  the window on the next pass.
- Never rely on `z-index` or the room there. `window.__aikaFriendsDock.diagnose()` reports the
  real geometry (rects, client, scroll and offset widths, the limiting properties, ancestors,
  where the open dock is drawn).
- Tests: `tests/store-dock.e2e.cjs` with `tests/friends-dock/popup-stub.js`, where an `<iframe>`
  per popup window stands in for Steam's popups, and a stand-in for the browser view.

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
REACT_UMD=/path/node_modules node --test tests/friends-dock-2.e2e.cjs tests/nav-custom.e2e.cjs tests/store-dock.e2e.cjs
AIKA_21=/path/to/v2.1.0-checkout node --test tests/nav-custom.e2e.cjs   # pixel parity of the defaults
```
The harness can't reach Steam's popup windows, its own menus, webpack modules or the embedded
chat. Don't claim those as tested.
