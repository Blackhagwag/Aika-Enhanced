# Changelog

## 2.4.0 — 2026-11-26

The Friends Dock opens for real on Store, Community and profile pages, not only in the library.
2.3.0's fix did not do it in Steam; this replaces that approach. The 2.3.0 state is the git tag
`v2.3.0`.

### The cause (from the code; Steam's own DOM was not reachable here)
- **The dock lives in the main window, in every section.** It is one `<aside class="aika-fdock">`,
  `position: fixed` at the window's right edge. It has no parent that limits its width: the
  limiting properties (`width`, `min-width`, `max-width`, `overflow`, `contain`, `transform`) are
  the same in the library and on the store. Its open width, 264 px, is real on every page.
- **What differs is what lies over it.**
  - The library is part of the main window's DOM.
  - Store, Community and profile pages are Steam's native browser view: a separate surface that
    Steam lays over the main window, in the box of `.ContentFrame`. Nothing in the window's DOM
    is ever drawn above it, whatever its `z-index`.
- **How the dock made room, and why it failed.**
  - The dock made room by narrowing `.ContentFrame`: 52 px when folded, 264 px when open. That
    only helps if Steam lays its view out again when the frame narrows, and Steam decides that
    on its own.
  - When the dock opened on a browser page, it widened under the page. The page kept its width
    and covered everything past the rail. The button changed state, the dock was 264 px wide,
    and only its first 52 px could be seen.
  - 2.2 eased the room. 2.3 made it change at once and sent a `resize` nudge. In Steam the view
    still did not follow. The mechanism itself depended on the library's structure: there,
    narrowing the frame really moves the content.

### What changed: one mechanism that doesn't depend on the page
- **Browser pages.**
  - On a Store, Community, profile or other browser page, the open dock (and the Expand-on-hover
    peek) is drawn in one of Steam's popup windows over the page. It sits at the window's right
    edge, under the header, at the dock's full width and down to the window's foot.
  - These are the windows Steam Enhanced's popup layer (`SE.layer.panel`) already uses for the
    dock's tooltips and menus and for the built-in chat over those pages. Steam's popups are
    windows of their own, above the browser view.
  - While it is open, the page keeps the rail's room, so nothing waits on Steam relaying its view.
- **It is the same dock, not a second one.**
  - Its header and list (rows, listeners, live updates, scroll position) move into that window
    and back.
  - There is one state (open / rail), one set of sizes and one set of settings for every page.
  - The library keeps the dock in the window exactly as before, with its easing.
- **The look is the dock's.**
  - The window gets Aika's stylesheets and the main window's current colours (preset, custom
    colours, repainted when they change).
  - The dock opens sliding out of the rail and folds back into it, with its own easing. It
    animates by transform, inside a still shell the window measures.
- **Behaviour.**
  - Its menu opens at the row clicked, over the page; chat clicks and the settings button work
    as in the window.
  - Leaving the peek folds it back.
  - The open dock's window follows the right edge when the window is resized.
  - If Steam takes the window down on its own (another menu opening), the dock's parts come
    home and the window opens again on the next pass, within a second.
  - If no popup window can open at all, the dock falls back to 2.3's way: it opens in the window
    with the open dock's room, and Steam is asked once to lay its view out.
- **No new watchers or timers.** It runs inside the dock's existing placement pass and its
  existing one-second tick, with no MutationObserver and no new interval.
- **Diagnostics:** `window.__aikaFriendsDock.diagnose()`, run by hand in Steam's DevTools. It is
  never logged on its own. It reports, for the dock, the open dock's window, the list, the
  content frame, Steam's browser wrapper and the dock's ancestors:
  - `getBoundingClientRect`, `clientWidth`, `scrollWidth`, `offsetWidth`;
  - `position`, `width`, `min-width`, `max-width`, `flex-shrink`, `overflow`, `transform`,
    `z-index`, `contain`, `margin-right`;
  - where the open dock is drawn.

### Checked in the test harness (not in Steam)
- **Stand-ins.** A stand-in for Steam's browser view, laid out only when it appears and on
  `resize`. A stand-in for Steam's popup windows (`tests/friends-dock/popup-stub.js`): one
  `<iframe>` per window, a document of its own, stacked above the view.
- **Pages.** Each page was checked folded, open, folded, open again:
  - store: home, a game's page, search, a category, a sale page;
  - community: home, discussions, the Workshop, a game's hub;
  - profiles: your own, another person's, achievements, screenshots;
  - library: home, a game.
- **What each check looks at.**
  - The open dock is seen across its whole width at the window's right edge, not under the page.
  - Rows and names are uncut, with no horizontal scroll.
  - The page keeps its width.
  - There is one dock, one header and at most one open-dock window.
- **Transitions:** Library → Store → Community → Profile → Store → Library → Profile. The state
  is kept, with no second dock and no copied header.
- **Also checked:**
  - three window sizes;
  - Steam closing the window;
  - the peek over a page;
  - the menu from the open dock's window, with the same colours and font as in the window.
- 2.3.0 fails these with the reported symptom ("open — drawn in a window over the page").
- The library, the top bar and left sidebar, a Store page with no popup windows and Expand on
  hover look as in 2.3.0, pixel for pixel: one antialiased pixel at the avatar ring differs.
- Performance matches 2.3.0 within noise (theme callbacks ~6–7 ms/s under simulated DOM churn).
- A 60-step session left listeners, observers and DOM nodes where they started; the 7 listeners
  of the open dock's window are registered once.

### Not checked
- Everything above against Steam's real browser view and real popup windows: no Steam client is
  reachable here. To check in Steam, open the dock on a Store page. If it misbehaves, run
  `__aikaFriendsDock.diagnose()` in Steam's DevTools and send the result.

### Files
- Changed: `js/friends-dock.js`, `sections/friends-dock.css`, `skin.json` (2.4.0), `README.md`,
  `CLAUDE.md`.
- Added: `tests/friends-dock/popup-stub.js` (test fixture). `tests/store-dock.e2e.cjs` was
  rewritten.

## 2.3.0 — 2026-11-26

The Friends Dock now really opens on Store and Community pages. The theme does less work while
Steam runs. Nothing looks different: in the harness the library (top bar and left sidebar), a Store
page and Expand on hover match 2.2.0 pixel for pixel, apart from Chromium's dithering. The 2.2.0
state is the git tag `v2.2.0`.

### Fixed — the Friends Dock on Store / Community pages
- **Cause.**
  - Store and Community pages are Steam's native browser view. It sits over the main window, so
    nothing in the window's DOM draws above it.
  - The dock makes room by narrowing the content frame (`margin-inline-end`, eased over 250 ms).
    Steam lays its view out in that frame when it lays the frame out for its own reasons (the
    page shown, the window resized), not when the margin merely changes.
  - So expanding on a Store page widened the dock underneath the page. The page stayed at its old
    width and covered everything past the rail: the dock "opened" but showed only its first 52 px,
    with the names cut off at the page's edge.
  - Collapsing left a strip of empty frame where the page should have widened back.
  - The library has no native view, which is why it always worked.
- **Fix.**
  - On browser pages the room changes at once (`html[data-aika-fdock-page]`), since the native view
    can't ease anyway. The dock's own width still eases into the room.
  - The dock then asks Steam to lay its view out again by sending the same `resize` event a window
    resize sends, twice: next frame, and once the dock's width has eased.
  - The dock's own resize handling ignores that event, so its menu and tooltip stay open.
  - The library keeps its easing.
- `window.__aikaFriendsDock.diagnose()` reports the dock's, the frame's and Steam's view's boxes,
  for a check in Steam's DevTools.

### Faster (same look)
- **Navigation** (`aika-nav.js`):
  - it only listens to mutations inside the title-bar controls (`SE.watch` scope). Before, every
    DOM change in the window ran a pass, up to five times a second;
  - a pass that would draw the same thing stops after its cheap reads;
  - the layout setting is read from the DOM (the inline value, the option file's `<link>`)
    instead of `getComputedStyle`, with the computed value checked every 30 s;
  - the content's top is measured only after a resize, a setting or the slow poll;
  - in the top bar, the right area's buttons are no longer measured.
- **Friends Dock** (`js/friends-dock.js`):
  - the page kind (route, URL, visibility) is worked out again only when the route or the page
    changes, plus every 5 s. Before it ran each second, and its `checkVisibility()` recalculated
    the window's style;
  - the header's height is read only when it can have changed;
  - settings are re-read every 10 s instead of 5 s (live changes still arrive at once);
  - offline friends are skipped after one look at their state while their section is hidden
    (the default), instead of being read in full each second.
- **Chat engine** (`aika-main.js`):
  - `EnsureFriendsListLoaded` is called only while Steam's list is empty (it was called every
    second; the Aika dock already asks that way);
  - "Scroll to new messages" finds the history's scroller once, instead of walking computed
    styles on every message.

### Measured (test harness, headless Chromium, not Steam)
- Conditions: 1440×860, 10 test friends. A node in the library changes every 50 ms, standing in
  for Steam's DOM, which changes all the time. Each figure is the mean of 3 runs (library) or 2
  runs (Store + rail), 15 s each. Self time is per call site.

| | 2.2.0 | 2.3.0 |
|---|---|---|
| Theme callbacks, library, top bar | 14.2 ms/s | 6.9 ms/s |
| Theme callbacks, Store page, left sidebar | 12.2 ms/s | 7.2 ms/s |
| Script time, library | 12.4 ms/s | 8.3 ms/s |
| Style recalcs at idle, no churn | 3.5/s | 1.35/s |
| Navigation pass | 3.2/s, 3.1–4.7 ms/s | only on changes in the header (0 under churn) |
| Dock page check (`checkVisibility`) | 2.0 ms/s | 0.4 ms/s |
| Time to dock and navigation ready (median of 5) | 376 ms | 359 ms (within noise) |
| Long session, 80 page changes, toggles, layout and status switches: live MutationObservers / listeners / DOM nodes | 2 / 113 / 586 → same | 2 / 113 / 587 → same |

- Steam's own CPU, memory and frame rate were not measured: no Steam client is reachable here.
- How it was measured: `PerformanceObserver`-free wrappers around timers, observers and
  listeners (self time per call site), CDP `Performance.getMetrics`, and CDP CPU profiles.

### Left as they were
- The look:
  - every animation, blur, transparency and glow;
  - Aika's background spots (compositor transforms);
  - Aika's own infinite animations (preloaders, shimmer, the play button, the store calendar).
    These are design elements, and Aika's Performance setting already turns them down.
- Loading order: the Millennium Settings scripts still load in the main window, because
  Millennium's window is drawn from there.
- Aika's own scripts measured at under 0.3 ms/s each in the harness and were not touched.

### Files
- Changed: `js/friends-dock.js`, `sections/friends-dock.css`,
  `vendor/steam-enhanced/client/navigation/aika-nav.js`,
  `vendor/steam-enhanced/client/friends/dock/aika-main.js`, `skin.json` (2.3.0), `README.md`,
  `CLAUDE.md`.
- Added: `tests/store-dock.e2e.cjs` (a stand-in for Steam's browser view laid out the way Steam
  lays it out; 2.2.0 fails it with the reported symptom, 2.3.0 passes).

## 2.2.0 — 2026-11-25

The navigation, customisable: a Navigation editor in the theme settings window with a live preview,
drag-and-drop order, presets and JSON import/export. With nothing changed the navigation is
2.1.0's, pixel for pixel. The 2.1.0 state is the git tag `v2.1.0` (branch
`backup/aika-enhanced-2.1.0`).

### Added
- **Navigation editor** (theme settings › Navigation), with categories General, Layout, Buttons,
  Profile, Appearance, Animations, Behaviour, Pop-up menus and Presets. Each control is a real
  setting, applied at once to the real navigation and to the live preview, which uses your
  avatar and status. Each category has its own reset, and General has a full reset back to
  2.1.0's navigation.
- **Per-layout settings**: the Left Sidebar and the Top Bar each keep their own sizes, order and
  visible buttons. You can edit either one while the other is in use.
- **Layout**:
  - sidebar width / bar height;
  - button, icon and avatar size;
  - spacing; inner padding; outer margin (a floating rail);
  - button radius, panel radius, border thickness;
  - alignment.
- **Buttons**:
  - areas: the rail's top, middle and bottom; the top bar's left, middle and right;
  - drag and drop between areas, or arrow keys;
  - separators and gaps, added from a palette and removed with Delete;
  - each button can be hidden, and the rest close up;
  - unread indicators, tooltips, separators, button background and borders on or off.
  - With Settings hidden, the theme's settings are in My Profile's menu, the dock's button,
    Millennium's sidebar and Ctrl+Shift+`.
- **Profile**:
  - avatar shape (squircle / round);
  - status ring on or off, its width, its gap and the hover glow;
  - a pulse on status change;
  - caption: name, status, the game you're in;
  - a status dot;
  - colours per state: Online, In game, Away, Snooze, Do Not Disturb, Invisible, Offline.
    These are Steam's own states; Steam's legacy Busy uses the Do Not Disturb colour.
- **Appearance**:
  - styles: Aika (the default), Minimal, Glass, Transparent, Solid, Custom;
  - panel opacity and blur;
  - button opacity; hover and active intensity;
  - borders and their opacity; shadow; glow; accent colour.
- **Animations**: on/off; speed; hover style (colour, lift, grow, glow, none); press; the open
  button; menu opening (slide, fade, none); tooltips; the avatar ring; new notifications; the
  layout switch.
- **Behaviour**:
  - auto-hide: the rail comes back at the window's left edge, the top bar's buttons over the
    header's row; there are hide and show delays, and nothing hides while a menu is open;
  - compact mode;
  - icons only / icons and names / names on hover (the rail opens over the content);
  - closing menus on an outside click or when the pointer leaves;
  - tooltip delay.
- **Pop-up menus** (My Profile, Settings, Games, Announcements): width, radius, opacity, blur,
  font size, row height, icon size, opening speed, separators. These also apply in Steam's popup
  windows.
- **Presets**:
  - built-ins: Original Aika Enhanced, Steam Enhanced Style, Minimal Sidebar, Compact Top Bar,
    Glass Navigation;
  - your own: save, rename, duplicate, update, delete, switch;
  - JSON export (copy) and import. Bad JSON is refused with a message, and wrong values fall back
    to their defaults.
- Stored in localStorage and in Millennium's theme config (`__aika_nav`), and restored on a
  cleared profile.

### Not possible, left out
- Steam's own Notifications menu and its account menu are Steam's windows, so the pop-up menu
  settings don't reach them.
- The panel and menu blur shows only over what is behind it in the same window. Over Store and
  Community pages (Steam's browser view) the rail can't be drawn over the page: with auto-hide or
  names on hover it moves the page aside, or shows tooltips instead.
- The editor's settings aren't in the window's search.

### Kept as they were
The Friends Dock, the chat, the Millennium Settings, Downloads, the library, the store, the
community, Aika's presets and existing settings.

### Files
- Added: `vendor/steam-enhanced/client/navigation/nav-config.js`,
  `vendor/steam-enhanced/client/settings/theme/nav-editor.js` and `nav-editor.css`,
  `tests/nav-custom.e2e.cjs`, `CLAUDE.md`.
- Changed: `vendor/.../navigation/aika-nav.js` (the layout engine), `sections/navigation.css`,
  `vendor/.../client/loader.js`, `vendor/.../settings/theme/aika-settings.js` (Millennium's copy),
  `skin.json` (2.2.0), `.gitignore`, tests stub.
- Patched Steam Enhanced files:
  - `client/settings/theme/theme-settings.js` (`customTabs`);
  - `client/shared/popup-layer-menu.js` (`mark`, `closeOutside`);
  - `client/shared/popup-layer.js` (copies `--aika-menu-*` into popup windows);
  - `client/shared/popup-layer.css` (the navigation menus' settings);
  - `client/header/announcements.js`.

## 2.1.0 — 2026-11-25

Steam Enhanced's navigation, the parts asked for, in Aika's look: **My Profile**, **Settings**,
**Games**, **Announcements**, **Notifications** — in the top bar or in a left rail. The 2.0.0 state is
the git tag `v2.0.0` (branch `backup/aika-enhanced-2.0.0`).

### Added
- **Navigation layout** setting (new *Navigation* tab): *Top Bar* (default) or *Left Sidebar*; switches
  at once (Aika's live bridge), kept by Millennium, restored at startup.
- **My Profile**: Steam's account button as your real avatar in a status ring that follows your
  status (online — accent, in game — ok, away/snooze — warn, busy/Do Not Disturb — live, invisible /
  offline — subtle). Its menu (Steam Enhanced's menu with its account menu's groups): your name, the
  four states (FriendStore), Do Not Disturb (FriendStore), View my profile, Edit profile, Account
  details, Store preferences, View my wallet, Change account and Sign out where Steam offers them
  (SteamClient.User), and Steam's own account menu one row away. Labels in Steam's words where it has
  them.
- **Settings**: Steam Enhanced's Settings menu — Steam Settings, the theme's settings window,
  Millennium, the Library Manager — with its keyboard shortcuts.
- **Games**: Steam Enhanced's Games menu — Steam's own Games menu items (Activate a Product, Redeem
  Wallet Code, Gifts and Guest Passes, Add a Non-Steam Game, any others Steam adds) and Steam's Restore
  a Backup dialog, each running Steam's own action.
- **Announcements**: Steam's button with Steam Enhanced's news menu (Steam's news; a dot while unread).
- **Notifications**: Steam's own button, menu and notifications; its count as an Aika badge; Steam
  Enhanced's kinds and day headings in the menu.
- In the rail: tooltips beside the buttons, menus beside the rail; Steam's own Notifications and
  account menus placed beside it too. In the top bar: menus drop under their buttons.

### Kept as they were
Downloads (Aika's floating bar; with the rail it centres on the content beside the rail, as Aika's
"+" moves out of the rail's way), the other header buttons (menus, tabs, Big Picture), the window
controls, the library, the store, the Friends Dock, the chat, the Millennium Settings.

### Files
- Added: `vendor/steam-enhanced/client/navigation/aika-nav.js`, `sections/navigation.css`,
  `options/nav-sidebar.css`, `tests/navigation.e2e.cjs`; from Steam Enhanced (7d8439c):
  `client/header/header-shortcuts.js`, `client/shared/news-feed.js`, `client/header/announcements.js`,
  `client/header/notifications.js/.css`.
- Changed: `skin.json` (2.1.0, the setting), `main.css`, `js/live-settings.js`, `js/settings-l10n.js`,
  `vendor/steam-enhanced/client/loader.js`, `.../aika-settings.js` (the tab), `.../aika-foundation.css`,
  tests harness and fixture (Steam's title bar).
- Patched Steam Enhanced files: `client/shared/popup-layer-menu.js` (besideRail drops menus under
  the top bar), `client/header/announcements.js` (Aika Enhanced's navigation flag).

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
