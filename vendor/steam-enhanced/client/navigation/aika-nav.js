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
    ingame: 'В игре', news: 'Новости', alerts: 'Уведомления',
    online: 'В сети', away: 'Нет на месте', snooze: 'Спит', busy: 'Занят', dnd: 'Не беспокоить', invisible: 'Невидимка', offline: 'Не в сети',
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
    ingame: 'In game', news: 'Announcements', alerts: 'Notifications',
    online: 'Online', away: 'Away', snooze: 'Snooze', busy: 'Busy', dnd: 'Do Not Disturb', invisible: 'Invisible', offline: 'Offline',
  };
  // A state's name: Steam's word where it has one
  const STATE_TOKENS = {
    online: ['#PersonaStateOnline'], away: ['#PersonaStateAway'], snooze: ['#PersonaStateSnooze'], busy: ['#PersonaStateBusy'],
    invisible: ['#PersonaStateInvisible'], offline: ['#PersonaStateOffline'], ingame: [], dnd: [],
  };
  const stateName = (st) => (english || RU ? T[st] : firstOf(STATE_TOKENS[st] || [], T[st])) || '';

  /* ---------- The configuration (nav-config.js; the Navigation editor sets it) ---------- */

  const NC = () => window.__aikaNavConfig;
  let conf = run(() => NC().get()) || null;
  let confRev = 0;
  const offConfig = NC()?.on((next) => {
    conf = structuredClone(next);
    confRev++;
    invalidate();
  });
  const B = () => conf?.behavior || {};

  /* ---------- The layout setting ---------- */

  // "Navigation layout" (skin.json): options/nav-sidebar.css sets --aika-nav-layout: rail on the
  // root; Aika's live bridge sets it inline while the settings editor is open
  // Read once per change, not per pass: a computed-style read with the page's styles dirty
  // recalculates the whole window's style (Steam's DOM changes many times a second)
  let layoutNow = '';
  // The setting is the inline value Aika's live bridge sets, else the option file Millennium
  // injects (options/nav-sidebar.css): both read off the DOM, no style involved. The computed
  // value (the truth) is checked now and then (verifyLayout), never on every pass.
  const NAV_SHEET = 'link[href*="options/nav-sidebar.css"]';
  const computedLayout = () => (getComputedStyle(root).getPropertyValue('--aika-nav-layout').trim().replace(/["']/g, '') === 'rail' ? 'rail' : 'top');
  const readLayout = () => {
    const inline = root.style.getPropertyValue('--aika-nav-layout').trim().replace(/["']/g, '');
    if (inline) return inline === 'rail' ? 'rail' : 'top';
    return document.querySelector(NAV_SHEET) ? 'rail' : 'top';
  };
  let verified = false;
  const layout = () => {
    if (!layoutNow) layoutNow = verified ? readLayout() : computedLayout();
    verified = true;
    return layoutNow;
  };
  // What a pass measures (the layout setting, the content's top) is read again only after
  // something that can change it: a setting, the window's size, the slow poll
  let measureDue = true;
  function invalidate() {
    layoutNow = '';
    measureDue = true;
    schedule();
  }

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
    button.dataset.aikaName = label;
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
    const b = B();
    menu =
      SE.layer?.menu(items, SE.layer.besideRail(button, { foot: true }), {
        owner: button,
        closeOnLeave: b.closeLeave !== false,
        closeOutside: b.closeOutside !== false,
        mark: 'aika-nav-menu',
      }) || null;
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
    // Settings hidden from the navigation: the theme's settings stay one row away
    if (isHidden('settings')) {
      rows.push({ separator: true }, { label: T.themeSettings, hint: T.themeSettingsHint, icon: '--se-icon-sliders', keys: 'Ctrl+Shift+`', run: () => window.__seThemeSettings?.open() });
    }
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

  /* ---------- Tooltips ---------- */

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
  // A tooltip beside a rail button, when its name isn't on show already
  const tipsWanted = () =>
    root.dataset.aikaNav === 'rail' && conf?.buttons?.tooltips !== false && !looks.has('wide') && !(looks.has('hoverlabels') && !SE.browserShown?.());
  function showTip(target) {
    hideTip();
    const text = target.dataset.aikaTip || target.getAttribute('aria-label') || target.getAttribute('title') || '';
    if (!text || !tipsWanted() || (menu && !menu.released)) return;
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
  const ITEM = () => `.aika-nav-btn, ${NEWS}, ${BELL}, ${ACCOUNT}`;
  const tipTarget = (event) => event.target.closest?.(ITEM());
  function onOver(event) {
    const t = tipTarget(event);
    if (t && tipsWanted()) {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => showTip(t), B().tipDelay ?? 350);
    }
    hoverEnter(event);
  }
  function onOut(event) {
    const t = tipTarget(event);
    if (t && !t.contains(event.relatedTarget)) hideTip();
    hoverLeave(event);
  }

  /* ---------- The layout engine ---------- */

  /*
   * Each button sits in an area of its layout (the rail: top / middle / foot; the top bar: left /
   * middle / right), in the order the configuration gives, with separators and gaps between.
   * Steam's own buttons stay where React mounted them: the engine only gives each one its place
   * (custom properties and data attributes; sections/navigation.css lays them out). The top bar's
   * right area keeps the buttons in the header's row (CSS order); every other area places them
   * over its spot (position: fixed, at the point worked out here).
   *
   * Defaults (nav-config.js) are 2.1.0's layout: every value equal to its default writes nothing
   * and the stylesheet's own (2.1.0) values stand.
   */
  const rail = document.createElement('div');
  rail.className = 'aika-nav-rail';
  rail.setAttribute('aria-hidden', 'true');
  const edge = document.createElement('div');
  edge.className = 'aika-nav-edge';
  edge.setAttribute('aria-hidden', 'true');
  const topPanels = ['start', 'center', 'end'].map((zone) => {
    const node = document.createElement('div');
    node.className = 'aika-nav-bar';
    node.dataset.aikaNavZone = zone;
    node.setAttribute('aria-hidden', 'true');
    return node;
  });

  const marked = new Set();
  const styled = new Set();
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
  const prop = (el, name, value) => {
    if (!el) return;
    const v = value == null ? '' : String(value);
    if (el.style.getPropertyValue(name) !== v) {
      if (v) el.style.setProperty(name, v);
      else el.style.removeProperty(name);
    }
    if (v) styled.add(el);
  };
  const ROOT_VARS = new Set();
  const rootVarOn = (name, value) => {
    ROOT_VARS.add(name);
    prop(root, name, value);
  };
  const rootVar = rootVarOn;

  // Separators and gaps: the theme's own nodes, reused pass to pass
  const fillers = { sep: [], gap: [] };
  function filler(kind, index) {
    let node = fillers[kind][index];
    if (!node) {
      node = document.createElement('div');
      node.className = `aika-nav-${kind}`;
      node.setAttribute('aria-hidden', 'true');
      fillers[kind][index] = node;
    }
    return node;
  }

  const isHidden = (key, mode = layout()) => Boolean(conf?.[mode]?.hidden?.[key]);

  // A layout's areas as they show: hidden buttons gone, separators only between buttons, once
  function areas(mode) {
    const zones = conf?.[mode]?.zones || { start: [], center: [], end: [] };
    const seps = conf?.buttons?.separators !== false;
    const out = {};
    for (const zone of ['start', 'center', 'end']) {
      const list = [];
      for (const item of zones[zone] || []) {
        if (item === 'sep') {
          if (seps && list.length && list.at(-1) !== 'sep') list.push('sep');
        } else if (item === 'gap') list.push('gap');
        else if (!isHidden(item, mode)) list.push(item);
      }
      while (list.at(-1) === 'sep' || list.at(-1) === 'gap') list.pop();
      while (list[0] === 'gap') list.shift();
      out[zone] = list;
    }
    return out;
  }

  // The numbers a layout draws with: its own values, compact mode, the names beside the buttons
  function metrics(mode) {
    const L = conf?.[mode] || {};
    const d = run(() => NC().defaults()[mode]) || {};
    const compact = Boolean(B().compact);
    const m = {
      size: L.size ?? d.size, btn: L.btn ?? d.btn, icon: L.icon ?? d.icon, avatar: L.avatar ?? d.avatar,
      gap: L.gap ?? d.gap, pad: L.pad ?? d.pad, margin: L.margin ?? d.margin,
      btnRadius: L.btnRadius ?? 8, panelRadius: L.panelRadius ?? d.panelRadius, border: L.border ?? 1, align: L.align || 'center',
    };
    if (compact) {
      m.btn = Math.max(24, m.btn - 8);
      m.icon = Math.max(12, m.icon - 2);
      m.avatar = Math.max(18, m.avatar - 6);
      m.gap = Math.round(m.gap / 2);
      m.pad = Math.round(m.pad / 2);
      if (mode === 'rail') m.size = Math.max(m.btn + 8, m.size - 12);
    }
    m.avatar = Math.min(m.avatar, m.btn + 8);
    if (mode === 'rail') m.size = Math.max(m.size, m.btn + 4);
    m.d = d;
    return m;
  }

  const SEP = 9; // a separator's room along the rail: a hairline in 9 px
  const extent = (item, m) => (item === 'sep' ? SEP : item === 'gap' ? Math.round(m.btn / 2) : m.btn);

  // The flags sections/navigation.css reads off html[data-aika-nav-look]
  let looks = new Set();
  const lookOf = (mode, m) => {
    const c = conf || {};
    const b = c.buttons || {};
    const a = c.appearance || {};
    const an = c.animations || {};
    const p = c.profile || {};
    const out = new Set();
    if (b.background === false) out.add('nobg');
    if (b.borders === false || a.borders === false) out.add('noborder');
    if (b.unread === false) out.add('nounread');
    const caption = p.showName || p.showStatus || p.showGame;
    if (b.labels === 'labels') out.add('labels');
    if (b.labels === 'hover') out.add('hoverlabels');
    if (mode === 'rail' && (b.labels === 'labels' || caption)) out.add('wide');
    if (caption) out.add('caption');
    if (p.shape === 'round') out.add('round');
    if (p.ring === false) out.add('noring');
    if (p.indicator) out.add('indicator');
    if (a.shadow) out.add('shadow');
    if (a.glow) out.add('glow');
    if (a.mode && a.mode !== 'default') out.add(`mode-${a.mode}`);
    if (an.enabled === false) out.add('still');
    else {
      if (an.hover && an.hover !== 'color') out.add(`hover-${an.hover}`);
      if (an.press === false) out.add('nopress');
      if (an.active === false) out.add('noactive');
      if (an.tooltip === false) out.add('notipanim');
      if (an.ring === false) out.add('noringanim');
      if (an.switch === false) out.add('noswitch');
    }
    if (B().compact) out.add('compact');
    if (m.align !== 'center') out.add(`align-${m.align}`);
    return out;
  };

  const pct = (v, def = 100) => (v == null || v === def ? null : String(v / 100));
  const px = (v, def) => (v == null || v === def ? null : `${v}px`);

  // Everything not about places: sizes, the look, the ring, the menus — custom properties on the root
  function paint(mode, m, rootVar = rootVarOn) {
    const c = conf || {};
    const a = c.appearance || {};
    const p = c.profile || {};
    const an = c.animations || {};
    const mn = c.menus || {};
    const d = m.d;
    rootVar('--aika-nav-btn', px(m.btn, mode === 'rail' ? 40 : 32));
    rootVar('--aika-nav-glyph', px(m.icon, mode === 'rail' ? 18 : 16));
    rootVar('--aika-nav-avatar', px(m.avatar, mode === 'rail' ? 32 : 24));
    rootVar('--aika-nav-gap', px(m.gap, mode === 'rail' ? 8 : 4));
    rootVar('--aika-nav-btn-radius', px(m.btnRadius, 8));
    rootVar('--aika-nav-panel-radius', px(m.panelRadius, d.panelRadius));
    rootVar('--aika-nav-border-w', px(m.border, 1));
    rootVar('--aika-nav-margin', px(m.margin, 0));
    // The ring: its gap, its band, the hover glow
    rootVar('--aika-nav-ring', px(p.ringGap, 2));
    rootVar('--aika-nav-ring-w', px(p.ringWidth, 2));
    rootVar('--aika-nav-glow', p.glow == null || p.glow === 45 ? null : String(p.glow / 100));
    for (const st of ['online', 'ingame', 'away', 'snooze', 'dnd', 'invisible', 'offline']) rootVar(`--aika-nav-c-${st}`, p.colors?.[st] || null);
    // The look: the panel's and the buttons' surfaces scaled from Aika's own, the edges, the accent
    // (factors on Aika's own colours; sections/navigation.css scales them)
    rootVar('--aika-nav-panel-base', a.mode === 'solid' ? 'var(--aika-bg-elevated)' : null);
    rootVar('--aika-nav-panel-k', pct(a.panelOpacity));
    rootVar('--aika-nav-blur', a.blur ? `blur(${a.blur}px)` : null);
    rootVar('--aika-nav-btn-k', pct(a.btnOpacity));
    rootVar('--aika-nav-hover-k', pct(a.hover));
    rootVar('--aika-nav-active-k', pct(a.active));
    rootVar('--aika-nav-edge-k', pct(a.borderOpacity));
    rootVar('--aika-nav-accent', a.accent || null);
    // Motion: Aika's durations scaled
    const speed = an.enabled === false || !an.speed || an.speed === 100 ? null : String(100 / an.speed);
    rootVar('--aika-nav-speed', speed);
    // Steam Enhanced's menus opened here (data-aika-nav-menu): copied into its popup windows
    // with the root's state (popup-layer.js copyRootState)
    rootVar('--aika-menu-w', mn.width ? `${mn.width}px` : null);
    rootVar('--aika-menu-r', px(mn.radius, 12));
    rootVar('--aika-menu-a', mn.opacity == null || mn.opacity === 100 ? null : String(mn.opacity / 100));
    rootVar('--aika-menu-blur', mn.blur ? `blur(${mn.blur}px)` : null);
    rootVar('--aika-menu-fs', px(mn.font, 13));
    rootVar('--aika-menu-row', px(mn.spacing, 34));
    rootVar('--aika-menu-icon', px(mn.icon, 18));
    const menuSpeed = an.enabled === false ? null : mn.speed && mn.speed !== 100 ? String(100 / mn.speed) : null;
    rootVar('--aika-menu-k', menuSpeed);
    const menuFlags = [
      mn.separators === false && 'nosep',
      (an.enabled === false || an.menu === 'none') && 'still',
      an.enabled !== false && an.menu === 'fade' && 'fade',
    ].filter(Boolean).join(' ');
    if (rootVar === rootVarOn) SE.attr(root, 'data-se-aika-menu', menuFlags || null);
  }

  // The window's spots the areas go to
  const frameNode = () => document.querySelector('.OuterFrame > .ContentFrame') || document.querySelector('.ContentFrame');
  let navTop = -1;

  function placeRail(nodes, list, m) {
    const W = m.size;
    const wide = looks.has('wide');
    const width = wide ? Math.max(W, 184) : W;
    const margin = m.margin;
    const top = navTop + margin;
    const bottom = innerHeight - margin;
    const inset = Math.max(0, Math.round((W - m.btn) / 2)); // 2.1.0: a 40 px tile centred in 56
    const x = margin + (m.align === 'start' ? Math.min(inset, 6) : m.align === 'end' ? W - m.btn - Math.min(inset, 6) : inset);
    rootVar('--aika-nav-rail', px(width, 56));
    rootVar('--aika-nav-wide-w', wide || looks.has('hoverlabels') ? `${Math.max(184, W) - 2 * inset}px` : null);
    rootVar('--aika-nav-panel-w', looks.has('hoverlabels') ? `${Math.max(184, W)}px` : null);
    const length = (items) => items.reduce((sum, item, i) => sum + extent(item, m) + (i ? m.gap : 0), 0);
    const startLen = length(list.start);
    const endLen = length(list.end);
    const midLen = length(list.center);
    let y = {
      start: top + m.pad,
      end: bottom - m.pad - endLen,
      center: Math.round((top + bottom - midLen) / 2),
    };
    // The middle area between the others, never over them
    y.center = Math.max(y.start + startLen + (startLen ? m.gap : 0), Math.min(y.center, y.end - midLen - (endLen ? m.gap : 0)));
    const counts = { sep: 0, gap: 0 };
    const placed = [];
    // The entrance's order: from the foot up (2.1.0: the avatar first)
    let n = [...list.start, ...list.center, ...list.end].filter((item) => item !== 'sep' && item !== 'gap').length;
    for (const zone of ['start', 'center', 'end']) {
      let at = y[zone];
      for (const item of list[zone]) {
        const node = item === 'sep' || item === 'gap' ? filler(item, counts[item]++) : nodes[item];
        const size = extent(item, m);
        if (node) {
          SE.attr(node, 'data-aika-nav-zone', zone);
          prop(node, '--aika-nav-x', `${x}px`);
          prop(node, '--aika-nav-y', `${Math.round(at)}px`);
          prop(node, '--aika-nav-order', null);
          if (item !== 'sep' && item !== 'gap') prop(node, '--aika-nav-n', String(--n));
          if (item === 'sep' || item === 'gap') {
            prop(node, '--aika-nav-len', `${size}px`);
            if (node.parentElement !== document.body) document.body.append(node);
          }
          placed.push(node);
        }
        at += size + m.gap;
      }
    }
    // The room the content gives up: the rail and its margin (auto-hide: the edge's strip; out
    // over a browser page: the rail's again, as nothing can be drawn over the page)
    const full = (looks.has('hoverlabels') ? W : width) + margin;
    const room = !autohide() ? full : concealed || !SE.browserShown?.() ? EDGE : full;
    rootVar('--aika-nav-room', room === 56 ? null : `${room}px`);
    return { placed, counts };
  }

  function placeTop(nodes, list, m, controls) {
    const counts = { sep: 0, gap: 0 };
    const placed = [];
    const row = controls.getBoundingClientRect();
    const mid = row.top + row.height / 2;
    const menuBar = document.querySelector(cls(C.RootMenuBar, 'RootMenuBar'));
    const startX = Math.round((menuBar ? menuBar.getBoundingClientRect().right : 0) + 8 + m.margin);
    const extentX = (item) => (item === 'sep' ? SEP : item === 'gap' ? Math.round(m.btn / 2) : nodes[item]?.getBoundingClientRect().width || m.btn);
    let order = 1;
    for (const zone of ['start', 'center', 'end']) {
      const items = list[zone];
      // (the right area stays in the header's row: nothing of it is measured)
      const total = zone === 'end' ? 0 : items.reduce((sum, item, i) => sum + extentX(item) + (i ? m.gap : 0), 0);
      let x = zone === 'start' ? startX : Math.round(innerWidth / 2 - total / 2);
      for (const item of items) {
        const node = item === 'sep' || item === 'gap' ? filler(item, counts[item]++) : nodes[item];
        if (!node) continue;
        SE.attr(node, 'data-aika-nav-zone', zone);
        const size = zone === 'end' && item !== 'sep' && item !== 'gap' ? 0 : extentX(item);
        if (zone === 'end') {
          // In the header's row, in order, before nothing of Steam's own (2.1.0: orders 1–5)
          prop(node, '--aika-nav-x', null);
          prop(node, '--aika-nav-y', null);
          prop(node, '--aika-nav-order', String(order++));
          if ((item === 'sep' || item === 'gap') && node.parentElement !== controls) controls.append(node);
        } else {
          prop(node, '--aika-nav-order', null);
          prop(node, '--aika-nav-x', `${x}px`);
          prop(node, '--aika-nav-y', `${Math.round(mid - (item === 'sep' ? m.btn * 0.6 : m.btn) / 2)}px`);
          if ((item === 'sep' || item === 'gap') && node.parentElement !== document.body) document.body.append(node);
        }
        prop(node, '--aika-nav-len', item === 'sep' || item === 'gap' ? `${size}px` : null);
        x += size + m.gap;
        placed.push(node);
      }
    }
    // The bars behind each area, when the look draws one (any mode but Aika's default)
    const drawBars = Boolean(conf?.appearance?.mode && conf.appearance.mode !== 'default');
    requestAnimationFrame(() => {
      for (const bar of topPanels) {
        const zone = bar.dataset.aikaNavZone;
        const members = placed.filter((node) => node.dataset.aikaNavZone === zone && node.isConnected);
        if (!drawBars || !members.length || root.dataset.aikaNav !== 'top') {
          bar.remove();
          continue;
        }
        const rects = members.map((node) => node.getBoundingClientRect()).filter((r) => r.width);
        if (!rects.length) {
          bar.remove();
          continue;
        }
        const pad = Math.max(2, m.pad);
        const left = Math.min(...rects.map((r) => r.left)) - pad;
        const right = Math.max(...rects.map((r) => r.right)) + pad;
        const h = conf.top?.size || Math.max(...rects.map((r) => r.height)) + 2 * pad;
        bar.style.cssText = `left:${Math.round(left)}px;top:${Math.round(mid - h / 2)}px;width:${Math.round(right - left)}px;height:${Math.round(h)}px`;
        if (bar.parentElement !== document.body) document.body.append(bar);
      }
    });
    return { placed, counts };
  }

  /* ---------- Names beside the buttons, the profile's caption ---------- */

  function labelFor(key, bell) {
    if (key === 'settings') return T.settings;
    if (key === 'games') return T.games;
    if (key === 'news') return T.news;
    if (key === 'alerts') {
      const n = parseInt(bell?.dataset.aikaCount || '', 10);
      return n ? `${T.alerts} · ${bell.dataset.aikaCount}` : T.alerts;
    }
    return '';
  }
  function captionFor(st) {
    const p = conf?.profile || {};
    const self = run(() => friendStore().self);
    const name = run(() => self.display_name) || run(() => self.persona.m_strPlayerName) || T.profile;
    const lines = [];
    const labels = conf?.buttons?.labels;
    if (p.showName || ((labels === 'labels' || labels === 'hover') && !p.showStatus && !p.showGame)) lines.push(name);
    if (p.showStatus) lines.push(stateName(st));
    if (p.showGame && st === 'ingame') {
      const game = run(() => self.persona.GetCurrentGameName());
      if (game) lines.push(game);
    }
    return lines.join('\n');
  }

  /* ---------- Auto-hide ---------- */

  /*
   * The rail slides away and comes back when the pointer reaches the window's left edge (a strip
   * of the window kept for it); the top bar's buttons fold away and come back over the header's
   * row. Never while a menu of theirs is open. Over a browser page (Steam's view covers the main
   * window) the rail pushes the page aside while out, as nothing can be drawn over the page.
   */
  const EDGE = 6;
  let concealed = false;
  let revealTimer = 0;
  let hideTimer = 0;
  let nativeOpen = false; // Steam's own menu (the bell's, the account's) is open: stay
  const autohide = () => Boolean(B().autohide);
  const menuUp = () => Boolean((menu && !menu.released) || nativeOpen || document.querySelector('.se-menu[data-aika-nav-menu]'));
  function setConcealed(next) {
    clearTimeout(revealTimer);
    clearTimeout(hideTimer);
    revealTimer = hideTimer = 0;
    if (concealed === next) return;
    concealed = next;
    if (next) hideTip();
    schedule();
  }
  function wantReveal() {
    clearTimeout(hideTimer);
    hideTimer = 0;
    if (!concealed || revealTimer) return;
    revealTimer = setTimeout(() => setConcealed(false), B().showDelay ?? 150);
  }
  function wantHide() {
    clearTimeout(revealTimer);
    revealTimer = 0;
    if (concealed || hideTimer || !autohide() || menuUp()) return;
    hideTimer = setTimeout(() => {
      hideTimer = 0;
      if (!menuUp()) setConcealed(true);
    }, B().hideDelay ?? 700);
  }
  const railRight = () => (metrics('rail').margin || 0) + (parseFloat(getComputedStyle(root).getPropertyValue('--aika-nav-rail')) || 56);
  const inNav = (target) => Boolean(target?.closest?.(`${ITEM()}, .aika-nav-rail, .aika-nav-edge, .aika-nav-sep, .aika-nav-gap, .aika-nav-bar`));
  function onMove(event) {
    if (!autohide() || !root.dataset.aikaNav) return;
    if (root.dataset.aikaNav === 'rail') {
      if (event.clientX <= (concealed ? EDGE : railRight() + 16) && event.clientY >= navTop) wantReveal();
      else if (!concealed) {
        nativeOpen = false;
        wantHide();
      } else {
        clearTimeout(revealTimer);
        revealTimer = 0;
      }
    } else {
      const controls = document.querySelector(CONTROLS);
      if (event.target.closest?.(CONTROLS) || inNav(event.target)) wantReveal();
      else if (!concealed && controls) {
        nativeOpen = false;
        wantHide();
      }
    }
  }
  // Out of the window (onto a browser page, a popup): out of the rail when past its edge
  function onLeaveWindow(event) {
    if (!autohide() || event.relatedTarget || concealed) return;
    if (root.dataset.aikaNav === 'rail' ? event.clientX > railRight() : event.clientY > (document.querySelector(CONTROLS)?.getBoundingClientRect().bottom || 0)) wantHide();
  }
  function onNativeOpen(event) {
    if (event.target.closest?.(`${BELL}, ${ACCOUNT}`)) nativeOpen = true;
  }

  /* ---------- Labels on hover (the rail grows while the pointer is over it) ---------- */

  let expanded = false;
  let expandTimer = 0;
  function setExpanded(next) {
    clearTimeout(expandTimer);
    if (expanded === next) return;
    expanded = next;
    SE.attr(root, 'data-aika-nav-expanded', next ? '' : null);
    if (next) hideTip();
  }
  function hoverEnter(event) {
    if (!looks.has('hoverlabels') || root.dataset.aikaNav !== 'rail' || SE.browserShown?.()) return;
    if (inNav(event.target)) {
      clearTimeout(expandTimer);
      expandTimer = setTimeout(() => setExpanded(true), B().tipDelay ?? 350);
    }
  }
  function hoverLeave(event) {
    if (!expanded && !expandTimer) return;
    if (inNav(event.relatedTarget) || menuUp()) return;
    clearTimeout(expandTimer);
    expandTimer = setTimeout(() => setExpanded(false), 120);
  }

  /* ---------- The pass ---------- */

  let frame = 0;
  let lastState = '';
  let lastCount = -1;
  let lastNews = false;
  let lastMode = '';
  const pulse = (el, name, ms = 900) => {
    if (!el) return;
    el.setAttribute(name, '');
    setTimeout(() => el.removeAttribute(name), ms);
  };

  // A pass that would draw exactly what is drawn stops after the cheap reads (lastPass)
  let lastPass = '';
  let fullPasses = 0;
  const ids = new WeakMap();
  let nextId = 1;
  const idOf = (node) => (node ? ids.get(node) || (ids.set(node, nextId++), ids.get(node)) : 0);
  function sync(full = false) {
    frame = 0;
    if (full === true) {
      layoutNow = '';
      measureDue = true;
      // every 15th slow pass (30 s) the computed value, in case a sheet set it some other way
      if (++fullPasses % 15 === 0) verified = false;
    }
    const news = document.querySelector(NEWS);
    const bell = document.querySelector(BELL);
    const account = document.querySelector(ACCOUNT);
    const controls = (news || bell || account)?.closest(CONTROLS);
    if (!controls) {
      settingsButton.remove();
      gamesButton.remove();
      rail.remove();
      edge.remove();
      topPanels.forEach((b) => b.remove());
      delete root.dataset.aikaNav;
      return;
    }
    const mode = layout();
    if (root.dataset.aikaNav !== mode) {
      root.dataset.aikaNav = mode;
      menu?.release();
      hideTip();
      setExpanded(false);
      concealed = false;
      if (lastMode && conf?.animations?.switch !== false && conf?.animations?.enabled !== false) pulse(root, 'data-aika-nav-switching', 400);
      lastMode = mode;
    }
    // Settings and Games beside Steam's own buttons (Steam Enhanced's place: before Announcements)
    const before = slotOf(news || bell || account, controls);
    if (gamesButton.parentElement !== controls) controls.insertBefore(gamesButton, before);
    if (settingsButton.parentElement !== controls) controls.insertBefore(settingsButton, gamesButton);
    const nodes = {
      settings: settingsButton,
      games: gamesButton,
      news: slotOf(news, controls),
      alerts: slotOf(bell, controls),
      profile: slotOf(account, controls),
    };
    mark(nodes.news, 'news');
    mark(nodes.alerts, 'alerts');
    mark(nodes.profile, 'profile');

    // The bell's count, read off Steam's own button; a pulse when it grows
    if (bell) {
      const n = parseInt((bell.textContent || '').replace(/\D+/g, ''), 10) || 0;
      const unread = n > 0 || bell.classList.contains(BELL_UNREAD);
      SE.attr(bell, 'data-aika-unread', unread ? '' : null);
      SE.attr(bell, 'data-aika-count', n > 0 ? (n > 99 ? '99+' : String(n)) : null);
      if (lastCount >= 0 && n > lastCount && conf?.animations?.notify !== false) pulse(bell, 'data-aika-nav-ping');
      lastCount = n;
    }
    if (news) {
      const unread = news.hasAttribute('data-se-unread');
      if (unread && !lastNews && conf && conf.animations?.notify !== false) pulse(news, 'data-aika-nav-ping');
      lastNews = unread;
    }
    // The ring: your real status; a pulse when it changes
    let st = 'offline';
    if (account) {
      st = selfState() || 'offline';
      if (lastState && st !== lastState && conf?.profile?.statusAnim !== false) pulse(account, 'data-aika-nav-pulse');
      lastState = st;
      SE.attr(account, 'data-aika-state', st);
      SE.attr(account, 'aria-haspopup', 'menu');
      SE.attr(account, 'data-aika-tip', `${run(() => friendStore().self.display_name) || T.profile}`);
    }

    if (mode === 'rail' && (measureDue || navTop < 0)) {
      const f = frameNode();
      const top = f ? Math.round(f.getBoundingClientRect().top) : navTop;
      if (top >= 0) navTop = top;
    }
    measureDue = false;
    const pass = [mode, confRev, innerWidth, innerHeight, navTop, concealed, expanded, autohide(), !!SE.browserShown?.(), st, lastCount, lastNews,
      idOf(controls), idOf(nodes.news), idOf(nodes.alerts), idOf(nodes.profile), idOf(settingsButton.parentElement), idOf(gamesButton.parentElement)].join('|');
    if (pass === lastPass) {
      patchManager();
      return;
    }
    lastPass = pass;

    const m = metrics(mode);
    looks = lookOf(mode, m);
    SE.attr(root, 'data-aika-nav-look', [...looks].join(' ') || null);
    SE.attr(root, 'data-aika-nav-autohide', autohide() ? '' : null);
    if (!autohide()) concealed = false;
    SE.attr(root, 'data-aika-nav-concealed', concealed ? '' : null);
    if (!looks.has('hoverlabels')) setExpanded(false);
    paint(mode, m);

    // Hidden buttons free their room
    for (const key of KEYS) SE.attr(nodes[key], 'data-aika-nav-hidden', isHidden(key) ? '' : null);
    // Names beside the buttons (labels), the profile's caption
    const named = looks.has('labels') || looks.has('hoverlabels') || looks.has('wide');
    for (const key of ['settings', 'games', 'news', 'alerts']) {
      const target = key === 'news' ? news : key === 'alerts' ? bell : nodes[key];
      SE.attr(target, 'data-aika-label', named ? labelFor(key, bell) : null);
    }
    SE.attr(account, 'data-aika-label', looks.has('caption') || named ? captionFor(st) || null : null);

    if (mode === 'rail') {
      rootVar('--aika-nav-top', navTop >= 0 ? `${navTop}px` : null);
    } else {
      rootVar('--aika-nav-rail', null);
      rootVar('--aika-nav-wide-w', null);
      rootVar('--aika-nav-panel-w', null);
    }

    const list = areas(mode);
    const { placed, counts } = mode === 'rail' ? placeRail(nodes, list, m) : placeTop(nodes, list, m, controls);
    // Fillers not used this pass go
    for (const kind of ['sep', 'gap']) fillers[kind].slice(counts[kind]).forEach((node) => node.remove());
    for (const key of KEYS) if (!placed.includes(nodes[key])) SE.attr(nodes[key], 'data-aika-nav-zone', null);

    if (mode === 'rail') {
      if (rail.parentElement !== document.body) document.body.append(rail);
      if (autohide()) {
        if (edge.parentElement !== document.body) document.body.append(edge);
      } else edge.remove();
      topPanels.forEach((b) => b.remove());
    } else {
      rootVar('--aika-nav-room', null);
      rail.remove();
      edge.remove();
    }
    patchManager();
  }
  const KEYS = ['profile', 'settings', 'games', 'news', 'alerts'];
  function schedule() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  const onSetting = () => invalidate();
  const onResize = () => invalidate();
  addEventListener('click', onAccountClick, true);
  addEventListener('keydown', onAccountKey, true);
  addEventListener('pointerdown', onNativeOpen, true);
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);
  document.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', onLeaveWindow);
  addEventListener('resize', onResize);
  addEventListener('aika-visual-setting', onSetting);
  // Steam re-rendering its title-bar buttons (only mutations there: the rest of the window changes
  // many times a second and has nothing of the navigation's) and, slowly, everything else the
  // pass reads (the persona's state has no event; the header's height; a replaced title bar)
  const watcher = SE.watch(schedule, { scope: CONTROLS, throttle: 200 });
  const poll = SE.poll(() => sync(true), 2000);
  sync();

  state.layout = () => root.dataset.aikaNav || '';
  // What a layout draws with, for the Navigation editor's preview (nothing is changed here)
  state.preview = (mode) => {
    const m = metrics(mode);
    const vars = {};
    paint(mode, m, (name, value) => {
      if (value != null) vars[name] = value;
    });
    return { m, looks: [...lookOf(mode, m)], vars, areas: areas(mode), label: (key) => labelFor(key, document.querySelector(BELL)), caption: () => captionFor(selfState() || 'offline'), state: () => selfState() || 'offline' };
  };
  state.refresh = invalidate;
  state.sync = () => sync(true);
  state.concealed = () => concealed;
  state.reveal = () => setConcealed(false);
  state.conceal = () => autohide() && setConcealed(true);
  state.destroy = () => {
    removeEventListener('click', onAccountClick, true);
    removeEventListener('keydown', onAccountKey, true);
    removeEventListener('pointerdown', onNativeOpen, true);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
    document.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
    removeEventListener('resize', onResize);
    removeEventListener('aika-visual-setting', onSetting);
    offConfig?.();
    watcher?.disconnect();
    poll?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    clearTimeout(revealTimer);
    clearTimeout(hideTimer);
    clearTimeout(expandTimer);
    menu?.release();
    hideTip();
    for (const [manager, saved] of patchedManagers) {
      if (manager.CreateContextMenuInstance === saved.wrapped) manager.CreateContextMenuInstance = saved.original;
    }
    patchedManagers.clear();
    for (const a of anchors.values()) a.remove();
    anchors.clear();
    const attrs = ['data-aika-nav-slot', 'data-aika-nav-zone', 'data-aika-nav-hidden', 'data-aika-label', 'data-aika-state', 'data-aika-unread', 'data-aika-count'];
    for (const el of document.querySelectorAll(attrs.map((a) => `[${a}]`).join(','))) for (const a of attrs) el.removeAttribute(a);
    marked.clear();
    for (const el of styled) for (const name of ['--aika-nav-x', '--aika-nav-y', '--aika-nav-order', '--aika-nav-n', '--aika-nav-len']) el.style.removeProperty(name);
    styled.clear();
    for (const name of ROOT_VARS) root.style.removeProperty(name);
    for (const kind of ['sep', 'gap']) fillers[kind].forEach((node) => node.remove());
    settingsButton.remove();
    gamesButton.remove();
    rail.remove();
    edge.remove();
    topPanels.forEach((b) => b.remove());
    for (const a of ['data-aika-nav', 'data-aika-nav-look', 'data-aika-nav-autohide', 'data-aika-nav-concealed', 'data-aika-nav-expanded', 'data-se-aika-menu', 'data-aika-nav-switching']) root.removeAttribute(a);
    delete window.__aikaNav;
  };
})(window.__se);
