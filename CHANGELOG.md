# Changelog

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
