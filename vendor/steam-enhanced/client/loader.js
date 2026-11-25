/*
 * Aika Enhanced — the loader of the Steam Enhanced parts (vendor/steam-enhanced/).
 *
 * Written after Steam Enhanced's own client/loader.js (NVHT, MIT) and working the same way, for
 * the parts Aika Enhanced takes from it: it sorts the window into groups by its title, adds the
 * runtime first (core/classmap.js, core/runtime.js, core/runtime-art.js), then every file of the
 * window's groups in list order — stylesheets through one <style id="se-sheets"> of @imports
 * (list order is the cascade), classic scripts in order once the runtime has published
 * window.__se. window.__seClient.sheets keeps file → URL, which the popup layer and the chat
 * flyout read to copy styles into Steam's popup windows.
 *
 * Left out on purpose (Aika does them its own way): Steam Enhanced's cover and entrance, its
 * settings store and option stylesheets, its web page loaders, every restyle of the library,
 * header, friends list, chat windows, toasts and dialogs. Web pages are left to Aika's
 * webkit.css: this loader does nothing there.
 *
 * Patched into every client window by skin.json (MatchRegexString ".*", like Steam Enhanced).
 */
(() => {
  if (window.__seClient) return;
  // (window.__aikaTestClient: the test harness, tests/friends-dock/, served from a local server)
  const onWeb = /^https?:$/.test(location.protocol) && location.hostname !== 'steamloopback.host' && !window.__aikaTestClient;
  if (onWeb) return;

  // Window groups, by document.title (Steam Enhanced's regular expressions)
  const GROUPS = {
    main: /^Steam$/,
    desktop:
      /^(?!Steam Games List$|.*(?:Menu|Supernav)$|notificationtoasts_|SP Overlay:|OverlayBrowser_|OverlayTab\d+_|SteamBrowser_Find$|Steam Big Picture Mode$|QuickAccess_|MainMenu_)/,
    menu: /(?:Menu|Supernav)$/,
  };

  /** [group, folder, files] — list order is the cascade and the run order */
  const FEATURES = [
    // Shared pieces: tokens (with Aika's palette bridge at their end), icons, motion, the popup
    // layer's and the menus' looks, the segmented control and the search field
    ['any', 'core/', ['tokens.css', 'icons-nav.css', 'icons-ui.css', 'motion.css']],
    ['any', 'client/shared/', ['popup-layer.css', 'segmented.css', 'search-field.css', 'menu.css', 'picker.css']],
    ['menu', 'client/friends/', ['aika-foundation.css']],
    ['app', 'client/shared/', ['mini-profile.js']],
    // The main window: the popup layer (Steam's popup windows over a browser view), menus, the
    // small-window fold, Millennium's backend bridge
    ['main', 'client/shared/', [
      'plugin-rpc.js', 'popup-layer.js', 'popup-layer-panel.js', 'popup-layer-menu.js', 'picker.js', 'menu.js',
      'window-fold.js', 'open-page.js', 'steam-confirm.js',
    ]],
    ['main', 'client/friends/', ['call-tools.js']],
    // The navigation from Steam Enhanced (My Profile, Settings, Games, Announcements,
    // Notifications) in a left rail or the top bar: what Settings opens and its shortcuts, Steam's
    // news for Announcements, then Aika Enhanced's layout of them (aika-nav.js)
    ['main', 'client/header/', ['header-shortcuts.js']],
    ['main', 'client/shared/', ['news-feed.js']],
    ['main', 'client/header/', ['announcements.js']],
    ['main', 'client/navigation/', ['aika-nav.js']],
    // Steam's notifications menu (its own popup window): each row's kind and the days (Steam Enhanced)
    ['menu', 'client/header/', ['notifications.css', 'notifications.js']],
    // The Friends dock chat: Steam Enhanced's engine (Steam's own Friends & Chat tree, its chat
    // routing and its popup) driven by the Aika Friends Dock (aika-dock.js, aika-main.js stand in
    // for Steam Enhanced's dock.js and main.js). The look: the frame from friends-dock-chat*.css,
    // the chat itself in Aika's own chat style (friends-dock-aika.css, from sections/friends.css).
    ['main', 'client/friends/', [
      'friends-dock-chat.css', 'friends-dock-chat-group.css', 'friends-dock-chat-rail.css', 'friends-dock-aika-frame.css', 'friends-dock-aika.css',
    ]],
    ['main', 'client/friends/dock/', [
      'templates.js', 'data.js', 'ui.js', 'routing.js', 'flyouts.js', 'member-list.js', 'embed.js',
      'aika-dock.js', 'chat-popup.js', 'aika-main.js',
    ]],
    // Millennium Settings, redesigned: the settings dialog's pass (Millennium's window only in
    // Aika Enhanced: Aika styles Steam Settings and Game Properties itself), its pages, Brew Hub
    ['desktop', 'client/settings/', ['layout.css', 'controls.css', 'pages.css', 'storage.css', 'search.css', 'spacing.css']],
    ['desktop', 'client/settings/dialog/', [
      'shared.js', 'options.js', 'search.js', 'window.js', 'sidebar.js', 'layout.js', 'props-pages.js',
      'props-header.js', 'props.js', 'main.js',
    ]],
    ['desktop', 'client/settings/millennium/', [
      'millennium.css', 'millennium-window.css', 'millennium-redesign.css', 'millennium-editor.css',
      'millennium-plugins.css', 'millennium-updates.css', 'millennium-logs.css', 'millennium-general.css',
      'millennium-icons.js', 'millennium-plugins.js', 'millennium-updates.js', 'millennium-logs.js',
      'millennium-pages.js',
    ]],
    ['desktop', 'compat/brew-hub/', ['brew-hub.css', 'brew-hub.js']],
    // Millennium Settings in a popup of its own, the theme's settings window (Aika's settings and
    // the Friends Dock's, through aika-settings.js), Millennium's library manager
    ['main', 'client/settings/millennium/', ['millennium-window.js']],
    ['desktop', 'client/settings/theme/', ['theme-settings.css']],
    ['main', 'client/settings/theme/', ['aika-settings.js', 'theme-settings.js']],
    ['main', 'client/settings/library-manager/', ['library-manager.css', 'library-manager.js']],
  ];

  const self =
    document.currentScript?.src ||
    [...document.scripts].find((s) => /\/vendor\/steam-enhanced\/client\/loader\.js(?:[?#]|$)/.test(s.src))?.src;
  if (!self) {
    console.warn('[Aika Enhanced] Steam Enhanced parts: theme folder not found from this window.');
    return;
  }
  const query = new URL(self).search;
  const asset = (file) => {
    const url = new URL(`../${file}`, self);
    url.search = query;
    return url.href;
  };

  const title = document.title;
  const groups = new Set(['any']);
  for (const [group, test] of Object.entries(GROUPS)) if (test.test(title)) groups.add(group);
  if (groups.has('main') || groups.has('desktop')) groups.add('app');
  // Menu windows only need the shared looks (the popup layer copies the rest it needs)
  const head = document.head ?? document.documentElement;
  const sheets = new Map();
  const added = new Set();

  const addScript = (file) => {
    const script = document.createElement('script');
    script.src = asset(file);
    script.async = false;
    script.dataset.seFile = file;
    head.append(script);
  };

  const RUNTIME = ['core/classmap.js', 'core/runtime.js', 'core/runtime-art.js'];
  const scripts = [];
  for (const [group, folder, files] of FEATURES) {
    if (!groups.has(group)) continue;
    for (const name of files) {
      const file = folder + name;
      if (added.has(file)) continue;
      added.add(file);
      if (file.endsWith('.css')) sheets.set(file, asset(file));
      else scripts.push(file);
    }
  }
  if (sheets.size) {
    const style = document.createElement('style');
    style.id = 'se-sheets';
    style.textContent = [...sheets.values()].map((href) => `@import url("${href}");`).join('\n');
    head.append(style);
  }
  // Aika's foundation for the popup windows the main window opens (aika-foundation.css): known to
  // the popup layer's copyStyles, not loaded here (the main window has Aika's own main.css)
  if (groups.has('main')) sheets.set('client/friends/aika-foundation.css', asset('client/friends/aika-foundation.css'));
  window.__seClient = { groups, files: added, sheets, aika: true };
  if (!scripts.length) return;
  if (window.__se) {
    scripts.forEach(addScript);
    return;
  }
  addEventListener('se-core', () => scripts.forEach(addScript), { once: true });
  RUNTIME.forEach(addScript);
})();
