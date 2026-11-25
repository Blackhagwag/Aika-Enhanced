/*
 * Aika Enhanced — the navigation: My Profile (your avatar with a status ring and its menu),
 * Settings, Games, Announcements and Notifications, taken from Steam Enhanced's navigation, in a
 * left rail ("Navigation layout: Left Sidebar") or in the top bar ("Top Bar").
 *
 * Steam Enhanced's way, kept: Steam's own title-bar buttons stay mounted where React put them
 * (Announcements, Notifications, the account button) and are only laid out by CSS
 * (sections/navigation.css), so they keep every function Steam gives them; Settings and Games are
 * added beside them as Steam Enhanced adds them (client/header/header-actions.js
 * makeActionButton); the menus are Steam Enhanced's menu (SE.layer.menu, client/shared/
 * popup-layer-menu.js) with its rows — Settings (header-actions.js onSettings), Games
 * (client/navigation/nav-rail.js: Steam's own Games menu items and its Restore a Backup dialog),
 * Announcements (client/header/announcements.js, ported as is), and the account menu's groups
 * (client/header/menu/account.js: Status, Do Not Disturb, Profile, Account). Steam's own menus
 * that open from its buttons (Notifications, the account menu itself) are placed beside the rail
 * as Steam Enhanced places them (client/header/menu/placement.js).
 *
 * One set of buttons for both layouts: html[data-aika-nav="rail" | "top"] switches the layout
 * and the menus follow it (SE.layer.besideRail opens beside the rail or under the top bar). The
 * Downloads button, Aika's other header buttons, the window controls and the Friends Dock are not
 * touched. Every action is Steam's: its FriendStore (status, Do Not Disturb), its menu items,
 * its pages, its SteamClient calls — offered only where Steam has them.
 */
((SE) => {
  window.__aikaNav?.destroy?.();
  if (!document.body) return;
  const { C, run } = SE;
  const root = document.documentElement;
  const state = (window.__aikaNav = {});

  /* ---------- Steam's nodes ---------- */

  const cls = (...names) => names.filter(Boolean).map((n) => `.${n}`).join(', ');
  const CONTROLS = `:is(${cls(C.FocusNavigationRoot_TitleBarControls, C.BranchBar_TitleBarControls, 'TitleBarControls')})`;
  const ACCOUNT = `${CONTROLS} :is(${cls(C.AccountMenu, 'AccountMenu')})`;
  const BELL = `${CONTROLS} :is(${cls(C.NotificationsButton, 'NotificationsButton')})`;
  // (Big Picture's toggle shares the Announcements button's class: never it)
  const NEWS = `${CONTROLS} :is(${cls(C.AnnouncementsButton, 'AnnouncementsButton')}):not(.aika-nav-btn):not(${cls(C.GamepadUIToggle, 'GamepadUIToggle')})`;
  const BELL_UNREAD = '_3L1c8C0o_xXzPy26aoLBFd'; // Steam's "has unread" modifier on the bell (Aika's selectors.css)

  const owners = () => SE.owners();
  const app = () => SE.global('g_FriendsUIApp', (a) => !!a.FriendStore);
  const friendStore = () => run(() => app().FriendStore);

  /* ---------- Words: Steam's own, in the client's language ---------- */

  const lang = (() => {
    for (const w of owners()) {
      const l = run(() => new URLSearchParams(w.location.search).get('LANGUAGE'));
      if (l) return l;
    }
    return document.documentElement.lang || '';
  })();
  const english = !lang || /^(english|en)\b/i.test(lang);
  const RU = /^(russian|ru)/i.test(lang);

  // nav-rail.js localizeToken: Steam's localizer, then its LocalizationManager, else a word from the token
  function localize(token, fallback) {
    const sources = [
      () => SE.global('LocalizationManager', (m) => typeof m.LocalizeString === 'function')?.LocalizeString(token, true),
      () => SE.global('LocalizeString', (fn) => typeof fn === 'function')?.(token),
    ];
    for (const source of sources) {
      const text = run(source);
      if (typeof text === 'string' && text && !text.startsWith('#')) return text.replace(/…/g, '...');
    }
    return fallback ?? token.replace(/^#(?:Menu_|PersonaState)?/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  const firstOf = (tokens, fallback) => {
    for (const t of tokens) {
      const text = localize(t, '');
      if (text) return text;
    }
    return fallback;
  };

  // The rows' own words (Steam Enhanced's English; Russian with Steam in Russian)
  const T = RU ? {
    settings: 'Настройки', games: 'Игры', profile: 'Профиль', steam: 'Steam', theme: 'Aika Enhanced',
    steamSettings: 'Настройки', steamSettingsHint: 'Аккаунт, загрузки, экран',
    themeSettings: 'Настройки темы', themeSettingsHint: 'Вид, панель друзей, чат, навигация',
    millennium: 'Millennium', millenniumHint: 'Темы, плагины, обновления',
    libraryManager: 'Library Manager', libraryManagerHint: 'Настройки тем и плагинов',
    redeem: 'Активация', addGames: 'Добавить игры', status: 'Статус', account: 'Аккаунт',
    dnd: 'Не беспокоить', dndHint: 'Без звука в чате и уведомлениях',
    viewProfile: 'Мой профиль', viewProfileHint: 'Ваша страница в сообществе',
    editProfile: 'Изменить профиль', editProfileHint: 'Имя, аватар, оформление',
    details: 'Об аккаунте', detailsHint: 'Почта, безопасность, покупки',
    storePrefs: 'Настройки магазина', storePrefsHint: 'Что показывает магазин',
    wallet: 'Кошелёк', walletHint: 'Баланс и история',
    changeAccount: 'Сменить аккаунт', signOut: 'Выйти', moreAccount: 'Все параметры аккаунта', moreAccountHint: 'Меню аккаунта Steam',
    activate: 'Активировать продукт', activateHint: 'Ввести ключ продукта',
    walletCode: 'Активировать код кошелька', walletCodeHint: 'Пополнить кошелёк',
    gifts: 'Подарки и гостевые пропуски', giftsHint: 'Ваш инвентарь подарков',
    nonSteam: 'Добавить стороннюю игру', nonSteamHint: 'Игра на этом компьютере',
    restore: 'Восстановить из резервной копии', restoreHint: 'Установить из файлов копии',
    ingame: 'В игре',
  } : {
    settings: 'Settings', games: 'Games', profile: 'My Profile', steam: 'Steam', theme: 'Aika Enhanced',
    steamSettings: 'Settings', steamSettingsHint: 'Account, downloads, display',
    themeSettings: 'Theme settings', themeSettingsHint: 'Look, Friends Dock, chat, navigation',
    millennium: 'Millennium', millenniumHint: 'Themes, plugins, updates',
    libraryManager: 'Library Manager', libraryManagerHint: 'Theme and plugin settings',
    redeem: 'Redeem', addGames: 'Add Games', status: 'Status', account: 'Account',
    dnd: 'Do Not Disturb', dndHint: 'Mute chat and notifications',
    viewProfile: 'View my profile', viewProfileHint: 'Your public page',
    editProfile: 'Edit profile', editProfileHint: 'Name, avatar, showcase',
    details: 'Account details', detailsHint: 'Email, security, purchases',
    storePrefs: 'Store preferences', storePrefsHint: 'What the store shows you',
    wallet: 'View my wallet', walletHint: 'Balance and history',
    changeAccount: 'Change account', signOut: 'Sign out', moreAccount: 'All account options', moreAccountHint: "Steam's account menu",
    activate: 'Activate a Product', activateHint: 'Enter a product key',
    walletCode: 'Redeem Wallet Code', walletCodeHint: 'Add funds to your wallet',
    gifts: 'Gifts and Guest Passes', giftsHint: 'Your gift inventory',
    nonSteam: 'Add a Non-Steam Game', nonSteamHint: 'A game on this PC',
    restore: 'Restore a Backup', restoreHint: 'Install from backup files',
    ingame: 'In game',
  };

  /* ---------- The layout setting ---------- */

  // "Navigation layout" (skin.json): options/nav-sidebar.css sets --aika-nav-layout: rail on the
  // root; Aika's live bridge sets it inline while the settings editor is open
  const layout = () => (getComputedStyle(root).getPropertyValue('--aika-nav-layout').trim().replace(/["']/g, '') === 'rail' ? 'rail' : 'top');

  /* ---------- Buttons: Settings and Games, as Steam Enhanced makes them ---------- */

  function makeButton(key, label, icon, onActivate) {
    const button = document.createElement('div');
    button.className = 'aika-nav-btn';
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.dataset.aikaNavSlot = key;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-haspopup', 'menu');
    button.dataset.aikaTip = label;
    const glyph = document.createElement('span');
    glyph.className = 'aika-nav-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.style.setProperty('--aika-nav-icon', `var(${icon})`);
    button.append(glyph);
    button.addEventListener('click', onActivate);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate(event);
      }
    });
    return button;
  }

  const parts = window.__seHeaderActionsParts || {};
  const openSteamSettings = parts.openSteamSettings || (() => run(() => SteamClient.URL.ExecuteSteamURL('steam://open/settings')));

  // One menu at a time, closed by a second click on its button (header-actions.js)
  let menu = null;
  let menuKey = '';
  function toggleMenu(key, button, rows) {
    const reopen = !(menu && !menu.released && menuKey === key);
    menu?.release();
    menu = null;
    menuKey = '';
    hideTip();
    if (!reopen) return null;
    const items = rows();
    if (!items?.length) return null;
    menu = SE.layer?.menu(items, SE.layer.besideRail(button, { foot: true }), { owner: button, closeOnLeave: true }) || null;
    if (menu) menuKey = key;
    return menu;
  }

  // Settings: Steam's, the theme's and Millennium's (header-actions.js onSettings)
  const settingsRows = () => [
    { heading: T.steam },
    { label: T.steamSettings, hint: T.steamSettingsHint, icon: '--se-icon-settings', keys: 'Ctrl+`', run: openSteamSettings },
    { separator: true },
    { heading: T.theme },
    { label: T.themeSettings, hint: T.themeSettingsHint, icon: '--se-icon-sliders', keys: 'Ctrl+Shift+`', run: () => window.__seThemeSettings?.open() },
    { separator: true },
    { heading: T.millennium },
    { label: T.millennium, hint: T.millenniumHint, icon: '--se-icon-millennium', keys: 'Ctrl+1', run: parts.openMillennium },
    { label: T.libraryManager, hint: T.libraryManagerHint, icon: '--se-icon-library-manager', keys: 'Ctrl+2', run: parts.openLibraryManager },
  ].filter((row) => !('run' in row) || typeof row.run === 'function');

  const settingsButton = makeButton('settings', T.settings, '--se-icon-settings', () => {
    if (!toggleMenu('settings', settingsButton, settingsRows) && !(menu && menuKey)) {
      if (!SE.layer) openSteamSettings();
    }
  });

  /*
   * Games: Steam's Games menu (its items read off its own menu-bar button, which stays where Aika
   * draws it) and Steam's Restore Game Backup dialog, laid out as Steam Enhanced lays them out
   * (client/navigation/nav-rail.js NAV_ITEMS.games). A row runs Steam's own item; one Steam has
   * no item for is left out; Steam's items the layout doesn't place still show, at the end.
   */
  function gamesMenuItems() {
    for (const button of document.querySelectorAll(cls(C.RootMenuButton, 'RootMenuButton'))) {
      for (let fiber = SE.fiber(button), depth = 0; fiber && depth < 15; fiber = fiber.return, depth++) {
        const props = fiber.memoizedProps;
        if (props?.title === 'Games Root Menu' && Array.isArray(props.menuItems)) return props.menuItems;
      }
    }
    return null;
  }
  const backupRestore = () =>
    SE.findModule('rail:backup-restore', (src, id, req) => {
      if (!src.includes('#BackupApps_Title') || !src.includes('GetBackupsInFolder')) return null;
      const exports = run(() => req(id));
      return Object.values(exports || {}).find((fn) => typeof fn === 'function' && fn.length === 1) || null;
    });

  // What a Steam menu item does (nav-rail.js itemAction)
  function itemAction(item) {
    if (!item || item.visible === false) return null;
    if (item.route) return () => SE.navigate(item.route) || run(() => SteamClient.URL.ExecuteSteamURL('steam://nav/library'));
    if (typeof item.steamURL === 'string' && item.steamURL) return () => SE.openPage(item.steamURL);
    if (typeof item.onClick === 'function') return () => run(item.onClick, window);
    return null;
  }

  const GAMES_LAYOUT = [
    { heading: () => T.redeem },
    { name: '#Menu_ActivateRetail', label: () => T.activate, hint: () => T.activateHint, icon: '--se-icon-key' },
    { name: '#Menu_RedeemWallet', label: () => T.walletCode, hint: () => T.walletCodeHint, icon: '--se-icon-wallet' },
    { name: '#Menu_ManageGifts', label: () => T.gifts, hint: () => T.giftsHint, icon: '--se-icon-gift' },
    { heading: () => T.addGames },
    { name: '#Menu_AddNonSteam', label: () => T.nonSteam, hint: () => T.nonSteamHint, icon: '--se-icon-folder-plus' },
    { name: '#Menu_BackupRestore', label: () => T.restore, hint: () => T.restoreHint, icon: '--se-icon-restore' },
  ];
  // The library row is Aika's own tabs' job (Steam Enhanced: its rail's Library icon)
  const GAMES_OMIT = new Set(['#Menu_ViewLibrary']);

  function gamesRows() {
    const restore = backupRestore();
    const items = [
      ...(gamesMenuItems() || []),
      restore && { name: '#Menu_BackupRestore', onClick: (win) => restore(win) },
    ].filter(Boolean);
    const byName = new Map(items.filter((i) => typeof i?.name === 'string').map((i) => [i.name, i]));
    const groups = [];
    const placed = new Set(GAMES_OMIT);
    for (const row of GAMES_LAYOUT) {
      if (row.heading) {
        groups.push({ heading: row.heading(), rows: [] });
        continue;
      }
      placed.add(row.name);
      const run = itemAction(byName.get(row.name));
      // Steam's own (localized) name in other languages; Steam Enhanced's short one in English
      const label = english || RU ? row.label() : localize(row.name);
      if (run) groups.at(-1).rows.push({ label, hint: row.hint(), icon: row.icon, run });
    }
    const rest = [];
    for (const [name, item] of byName) {
      const go = !placed.has(name) && !name.startsWith('Separator') && itemAction(item);
      if (go) rest.push({ label: localize(name), run: go });
    }
    groups.push({ rows: rest });
    const rows = [];
    for (const group of groups.filter((g) => g.rows.length)) {
      if (rows.length) rows.push({ separator: true });
      if (group.heading) rows.push({ heading: group.heading });
      rows.push(...group.rows);
    }
    return rows;
  }

  const gamesButton = makeButton('games', T.games, '--se-icon-gamepad', () => toggleMenu('games', gamesButton, gamesRows));

  /* ---------- My Profile: the avatar's ring and its menu (account.js's groups) ---------- */

  // Steam's persona states (EPersonaState) and Do Not Disturb → the ring's state
  const PERSONA = { 0: 'offline', 1: 'online', 2: 'busy', 3: 'away', 4: 'snooze', 5: 'online', 6: 'online', 7: 'invisible' };
  const dndAvailable = () => typeof friendStore()?.GetUserDoNotDisturb === 'function' && typeof friendStore()?.SetUserDoNotDisturb === 'function';
  const dndOn = () => Boolean(dndAvailable() && run(() => friendStore().GetUserDoNotDisturb()));
  function selfState() {
    const self = run(() => friendStore().self);
    const persona = run(() => self.persona);
    if (!persona) return null;
    if (run(() => persona.is_ingame)) return 'ingame';
    const s = PERSONA[run(() => persona.m_ePersonaState)] || 'offline';
    return dndOn() && s !== 'offline' && s !== 'invisible' ? 'dnd' : s;
  }

  // Status, as Steam Enhanced's dock and account menu set it: FriendStore, else steam://
  const PERSONA_SET = { online: 1, away: 3, invisible: 7 };
  function setStatus(st) {
    const a = app();
    const done =
      st === 'offline'
        ? run(() => (a.SignOutOfFriends ? (a.SignOutOfFriends(), true) : false))
        : run(() => (a.FriendStore.SetUserPersonaState(PERSONA_SET[st]), true));
    if (!done) run(() => SteamClient.URL.ExecuteSteamURL(`steam://friends/status/${st}`));
    setTimeout(sync, 300);
  }

  const userCall = (method) => {
    for (const w of owners()) {
      const fn = run(() => w.SteamClient.User[method]);
      if (typeof fn === 'function') return () => run(() => w.SteamClient.User[method]());
    }
    return null;
  };

  // Steam's own account menu, opened from its button (our click handler lets this one through)
  let passNative = false;
  function openNativeAccountMenu() {
    const button = document.querySelector(ACCOUNT);
    if (!button) return;
    passNative = true;
    try {
      button.click();
    } finally {
      passNative = false;
    }
  }

  function profileRows() {
    const self = run(() => friendStore().self);
    const name = run(() => self.display_name) || run(() => self.persona.m_strPlayerName) || T.profile;
    const current = selfState();
    const rows = [{ heading: name }];
    const states = [
      ['online', ['#PersonaStateOnline', '#Menu_Online'], 'Online'],
      ['away', ['#PersonaStateAway', '#Menu_Away'], 'Away'],
      ['invisible', ['#PersonaStateInvisible', '#Menu_Invisible'], 'Invisible'],
      ['offline', ['#PersonaStateOffline', '#Menu_Offline'], 'Offline'],
    ];
    if (current === 'ingame') rows.push({ note: T.ingame });
    for (const [st, tokens, en] of states) {
      const persona = PERSONA[run(() => self.persona.m_ePersonaState)];
      rows.push({ state: st, label: firstOf(tokens, en), current: persona === st || (st === 'online' && ['online', 'busy', 'snooze'].includes(persona)), run: () => setStatus(st) });
    }
    if (dndAvailable()) {
      rows.push({
        label: T.dnd, hint: T.dndHint, icon: dndOn() ? '--se-icon-bell-off' : '--se-icon-bell', current: dndOn(),
        run: () => { run(() => friendStore().SetUserDoNotDisturb(!friendStore().GetUserDoNotDisturb())); setTimeout(sync, 300); },
      });
    }
    rows.push({ separator: true }, { heading: T.profile });
    rows.push({ label: firstOf(['#Menu_ViewMyProfile', '#Menu_ViewProfile', '#AccountMenu_ViewProfile'], T.viewProfile), hint: T.viewProfileHint, icon: '--se-icon-user', run: () => SE.openPage('https://steamcommunity.com/my/') });
    rows.push({ label: T.editProfile, hint: T.editProfileHint, icon: '--se-icon-edit', run: () => SE.openPage('https://steamcommunity.com/my/edit/info') });
    rows.push({ separator: true }, { heading: T.account });
    rows.push({ label: firstOf(['#Menu_AccountDetails', '#AccountMenu_AccountDetails'], T.details), hint: T.detailsHint, icon: '--se-icon-id-card', run: () => SE.openPage('https://store.steampowered.com/account/') });
    rows.push({ label: firstOf(['#Menu_StorePreferences', '#AccountMenu_StorePreferences'], T.storePrefs), hint: T.storePrefsHint, icon: '--se-icon-store', run: () => SE.openPage('https://store.steampowered.com/account/preferences/') });
    rows.push({ label: firstOf(['#Menu_ViewWallet', '#AccountMenu_ViewWallet'], T.wallet), hint: T.walletHint, icon: '--se-icon-wallet', run: () => SE.openPage('https://store.steampowered.com/account/history/') });
    const change = userCall('ChangeUser');
    const signOut = userCall('SignOutAndRestart');
    if (change) rows.push({ label: firstOf(['#Menu_ChangeAccount', '#AccountMenu_ChangeAccount'], T.changeAccount), icon: '--se-icon-switch-account', run: change });
    if (signOut) rows.push({ label: firstOf(['#Menu_SignOut', '#AccountMenu_SignOut', '#Menu_Logout'], T.signOut), icon: '--se-icon-sign-out', danger: true, run: signOut });
    rows.push({ label: T.moreAccount, hint: T.moreAccountHint, icon: '--se-icon-external', run: openNativeAccountMenu });
    return rows;
  }

  // A click on the avatar opens this menu while the navigation is up (Steam's own on demand)
  function onAccountClick(event) {
    if (passNative || !root.dataset.aikaNav) return;
    const button = event.target.closest?.(ACCOUNT);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleMenu('profile', button, profileRows);
  }
  function onAccountKey(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    onAccountClick(event);
  }

  /* ---------- Steam's own menus beside the rail (placement.js) ---------- */

  /*
   * Notifications' and the account's own menus are Steam's popup windows, placed by Steam from
   * their button. In the rail they open beside it, growing up from the button (the rail's foot),
   * as Steam Enhanced places them: each menu instance Steam makes for those buttons gets the
   * rail's placement and an anchor beside the button. In the top bar Steam's own placement stays.
   */
  const patchedManagers = new Map();
  const anchors = new Map();
  const RAIL_BUTTONS = () => [document.querySelector(BELL), document.querySelector(ACCOUNT)].filter(Boolean);
  function railAnchor(button) {
    let anchor = anchors.get(button);
    if (!anchor) {
      anchor = document.createElement('span');
      anchor.setAttribute('aria-hidden', 'true');
      anchor.className = 'aika-nav-anchor';
      anchor.style.cssText = 'position:fixed;pointer-events:none;visibility:hidden;width:0;height:0';
      anchor.getBoundingClientRect = () => {
        const rect = button.getBoundingClientRect();
        const gap = SE.px('--se-space-3') || 12;
        return new DOMRect(rect.left, rect.top, rect.width + gap, rect.height);
      };
      document.body.appendChild(anchor);
      anchors.set(button, anchor);
    }
    return anchor;
  }
  const RAIL_PLACEMENT = { bOverlapHorizontal: false, bOverlapVertical: true, bPreferPopLeft: false, bPreferPopTop: true, bGrowToElementWidth: false };
  function placeInstance(instance) {
    const position = instance?.position;
    const element = position?.element;
    if (!element || !instance.options) return;
    const button = RAIL_BUTTONS().find((b) => b === element || b.contains(element) || element.contains?.(b));
    const saved = instance.__aikaNav || (instance.__aikaNav = { element, options: { ...instance.options } });
    if (button && root.dataset.aikaNav === 'rail') {
      Object.assign(instance.options, RAIL_PLACEMENT);
      position.element = railAnchor(button);
    } else if (saved) {
      for (const key of Object.keys(RAIL_PLACEMENT)) {
        if (key in saved.options) instance.options[key] = saved.options[key];
        else delete instance.options[key];
      }
      position.element = saved.element;
    }
  }
  function patchManager() {
    const manager = run(() => SE.layer?.runtime()?.manager);
    if (!manager || patchedManagers.has(manager) || typeof manager.CreateContextMenuInstance !== 'function') return;
    const original = manager.CreateContextMenuInstance;
    const wrapped = function (...args) {
      const instance = original.apply(this, args);
      run(() => {
        placeInstance(instance);
        const show = instance.Show;
        if (typeof show === 'function' && !instance.__aikaShow) {
          instance.__aikaShow = true;
          instance.Show = function (...a) {
            run(() => placeInstance(this));
            return show.apply(this, a);
          };
        }
      });
      return instance;
    };
    manager.CreateContextMenuInstance = wrapped;
    patchedManagers.set(manager, { original, wrapped });
  }

  /* ---------- Tooltips beside the rail ---------- */

  let tip = null;
  let tipPanel = null;
  let tipTimer = 0;
  function hideTip() {
    clearTimeout(tipTimer);
    tip?.remove();
    tip = null;
    tipPanel?.release();
    tipPanel = null;
  }
  function showTip(target) {
    hideTip();
    const text = target.dataset.aikaTip || target.getAttribute('aria-label') || target.getAttribute('title') || '';
    if (!text || root.dataset.aikaNav !== 'rail' || (menu && !menu.released)) return;
    const node = document.createElement('div');
    node.className = 'aika-fdock-tip aika-nav-tip is-on';
    const nameNode = document.createElement('div');
    nameNode.className = 'aika-fdock-tip__name';
    nameNode.textContent = text;
    node.append(nameNode);
    const r = target.getBoundingClientRect();
    const at = (w, h) => ({ left: r.right + 8, top: r.top + r.height / 2 - h / 2 });
    // Over a browser page in a popup window (the page's view covers the main window), else here
    if (SE.browserShown?.() && SE.layer) {
      node.classList.add('is-layered');
      tipPanel = SE.layer.panel({ sheets: ['client/friends/aika-foundation.css'] });
      tipPanel?.show(at, (container) => container.append(node));
      return;
    }
    document.body.append(node);
    const { left, top } = at(node.offsetWidth, node.offsetHeight);
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(Math.max(8, top))}px`;
    tip = node;
  }
  const tipTarget = (event) => event.target.closest?.(`.aika-nav-btn, ${NEWS}, ${BELL}, ${ACCOUNT}`);
  function onOver(event) {
    const t = tipTarget(event);
    if (!t || root.dataset.aikaNav !== 'rail') return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(t), 350);
  }
  function onOut(event) {
    const t = tipTarget(event);
    if (t && !t.contains(event.relatedTarget)) hideTip();
  }

  /* ---------- The pass: buttons in place, slots numbered, the ring, the counts ---------- */

  const rail = document.createElement('div');
  rail.className = 'aika-nav-rail';
  rail.setAttribute('aria-hidden', 'true');
  const marked = new Set();
  const slotOf = (button, controls) => {
    if (!button) return null;
    let el = button;
    while (el.parentElement && el.parentElement !== controls) el = el.parentElement;
    return el.parentElement === controls ? el : button;
  };
  function mark(el, key) {
    if (!el) return;
    SE.attr(el, 'data-aika-nav-slot', key);
    marked.add(el);
  }

  let frame = 0;
  let lastTop = -1;
  function sync() {
    frame = 0;
    const news = document.querySelector(NEWS);
    const bell = document.querySelector(BELL);
    const account = document.querySelector(ACCOUNT);
    const controls = (news || bell || account)?.closest(CONTROLS);
    if (!controls) {
      settingsButton.remove();
      gamesButton.remove();
      rail.remove();
      delete root.dataset.aikaNav;
      return;
    }
    const mode = layout();
    if (root.dataset.aikaNav !== mode) {
      root.dataset.aikaNav = mode;
      menu?.release();
      hideTip();
    }
    // Settings and Games beside Steam's own buttons (Steam Enhanced's place: before Announcements)
    const before = slotOf(news || bell || account, controls);
    if (gamesButton.parentElement !== controls) controls.insertBefore(gamesButton, before);
    if (settingsButton.parentElement !== controls) controls.insertBefore(settingsButton, gamesButton);
    mark(slotOf(news, controls), 'news');
    mark(slotOf(bell, controls), 'alerts');
    mark(slotOf(account, controls), 'profile');
    // The bell's count, read off Steam's own button
    if (bell) {
      const n = parseInt((bell.textContent || '').replace(/\D+/g, ''), 10) || 0;
      const unread = n > 0 || bell.classList.contains(BELL_UNREAD);
      SE.attr(bell, 'data-aika-unread', unread ? '' : null);
      SE.attr(bell, 'data-aika-count', n > 0 ? (n > 99 ? '99+' : String(n)) : null);
    }
    // The ring: your real status
    if (account) {
      const st = selfState() || 'offline';
      SE.attr(account, 'data-aika-state', st);
      SE.attr(account, 'aria-haspopup', 'menu');
      SE.attr(account, 'data-aika-tip', `${run(() => friendStore().self.display_name) || T.profile}`);
    }
    if (mode === 'rail') {
      if (rail.parentElement !== document.body) document.body.append(rail);
      const frameNode = document.querySelector('.OuterFrame > .ContentFrame') || document.querySelector('.ContentFrame');
      const top = frameNode ? Math.round(frameNode.getBoundingClientRect().top) : lastTop;
      if (top >= 0 && top !== lastTop) {
        lastTop = top;
        root.style.setProperty('--aika-nav-top', `${top}px`);
      }
    } else {
      rail.remove();
    }
    patchManager();
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(sync);
  };

  const onSetting = () => schedule();
  addEventListener('click', onAccountClick, true);
  addEventListener('keydown', onAccountKey, true);
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);
  addEventListener('resize', schedule);
  addEventListener('aika-visual-setting', onSetting);
  // Structure changes (Steam re-rendering its buttons) and, slowly, the persona's state (no event)
  const watcher = SE.watch(schedule, { throttle: 200 });
  const poll = SE.poll(sync, 2000);
  sync();

  state.layout = () => root.dataset.aikaNav || '';
  state.refresh = schedule;
  state.destroy = () => {
    removeEventListener('click', onAccountClick, true);
    removeEventListener('keydown', onAccountKey, true);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
    removeEventListener('resize', schedule);
    removeEventListener('aika-visual-setting', onSetting);
    watcher?.disconnect();
    poll?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    menu?.release();
    hideTip();
    for (const [manager, saved] of patchedManagers) {
      if (manager.CreateContextMenuInstance === saved.wrapped) manager.CreateContextMenuInstance = saved.original;
    }
    patchedManagers.clear();
    for (const a of anchors.values()) a.remove();
    anchors.clear();
    for (const el of marked) el.removeAttribute('data-aika-nav-slot');
    marked.clear();
    for (const el of document.querySelectorAll('[data-aika-state], [data-aika-unread], [data-aika-count]')) {
      el.removeAttribute('data-aika-state');
      el.removeAttribute('data-aika-unread');
      el.removeAttribute('data-aika-count');
    }
    settingsButton.remove();
    gamesButton.remove();
    rail.remove();
    delete root.dataset.aikaNav;
    root.style.removeProperty('--aika-nav-top');
    delete window.__aikaNav;
  };
})(window.__se);
