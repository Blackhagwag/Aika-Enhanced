/*
 * Aika Enhanced — SE.settings for the theme's settings window (Steam Enhanced's
 * client/settings/theme/theme-settings.js, ported), made from Aika Enhanced's own settings.
 *
 * Steam Enhanced keeps its settings in localStorage and switches its option stylesheets itself
 * (client/shared/settings.js). Aika's settings are Millennium Conditions (skin.json), so this
 * part gives the window the same API (schema, tabs, presets, paletteTokens, readOn, get, set,
 * palette, customColors, setCustom, on) over them:
 *   - the schema is skin.json's Conditions, read from Millennium (Core_GetStartConfig: the active
 *     theme with its skin.json, and the values Millennium keeps); labels and hints in Russian when
 *     Steam is in Russian (js/settings-l10n.js);
 *   - the "Color preset" and "Custom colors" pair is the window's palette: the four presets as
 *     swatch tiles, Custom with its editor over the five colours of root-colors.css
 *     (Core_GetThemeColorOptions / Core_ChangeColor);
 *   - a change is saved where Millennium's own editor saves it (Core_ChangeCondition, through
 *     Steam Enhanced's client/shared/plugin-rpc.js) and applied at once in the open windows:
 *     the dock's and two visual settings through Aika's live bridge (js/live-settings.js), the
 *     rest by swapping the option stylesheet Millennium injected (link#millennium-injected) in
 *     every window the condition affects, sliders as Millennium does (style#millennium-slider-*).
 *   - SE.settings.get('chat-open') answers Steam Enhanced's chat routing from "Built-in chat".
 * Nothing leaves the computer: Millennium's own backend, the theme's own files.
 */
((SE) => {
  window.__aikaSettings?.destroy();
  const { run } = SE;

  const THEME_TITLE = /^Aika( Enhanced)?$/;
  const L10N = () => window.__aikaSettingsText || null;
  const tr = (dict, key) => L10N()?.[dict]?.[key] || null;

  // The Aika presets as swatches (options/presets/*.css; Aika's defaults are colors.css's)
  const PRESETS = [
    { v: 'Aika', label: 'Aika', group: 'Warm', colors: { bg: '#070606', surface2: '#1D1B19', text: '#EDE9E3', accent: '#8B7FF0' } },
    { v: 'Hello Bert', label: 'Hello Bert', group: 'Cool', colors: { bg: '#0B0C10', surface2: '#263140', text: '#C5C6C7', accent: '#66FCF1' } },
    { v: 'Greeny', label: 'Greeny', group: 'Cool', colors: { bg: '#040908', surface2: '#142621', text: '#E3EFEA', accent: '#2ECC7A' } },
    { v: 'Rose Ash', label: 'Rose Ash', group: 'Warm', colors: { bg: '#0A0709', surface2: '#241C21', text: '#F4E8EE', accent: '#F07FAE' } },
  ];

  // Aika's settings tabs as the window shows them: Aika's "Main" leads as Appearance (the
  // window draws the palette there); the colour set folds into it
  const TAB_OF = { Main: 'Appearance', 'Color set': 'Appearance' };
  const TAB_INFO = {
    Appearance: ['--se-icon-sliders', 'Colours, the top bar, the wordmark and the sign-in window.'],
    Elements: ['--se-icon-list', 'What shows in the top bar and on the library home.'],
    'Friends list': ['--se-icon-friends', 'The friends list window.'],
    'Friends Dock': ['--se-icon-friends', 'The friends column beside the library, the Store and the Community.'],
    Chat: ['--se-icon-bubble', "The dock's built-in chat."],
    Navigation: ['--se-icon-compass', 'My Profile, Settings, Games, Announcements and Notifications: in the top bar or a left rail.'],
    Animations: ['--se-icon-activity', 'Motion, performance and the library covers.'],
    Advanced: ['--se-icon-settings', 'Privacy and notifications.'],
  };
  const TAB_RU = {
    Appearance: 'Оформление', Elements: 'Элементы', 'Friends list': 'Список друзей', 'Friends Dock': 'Панель друзей',
    Chat: 'Чат', Navigation: 'Навигация', Animations: 'Анимации', Advanced: 'Дополнительно',
  };

  const listeners = new Set();
  let theme = null; // { native, name, conditions: skin.json Conditions }
  let values = {}; // condition → value (Millennium's saved values, else skin.json's defaults)
  let colorOptions = []; // [{ color, name, description, type, hex, defaultColor }]
  let schema = [];
  let tabs = [];
  let ready = false;
  let destroyed = false;

  const rpc = () => window.__sePluginRpc;
  const call = (method, args) => {
    const r = rpc();
    if (!r) return Promise.reject(new Error("Millennium's backend bridge is unavailable"));
    return r.call('core', method, args).then((value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    });
  };
  const notify = () => listeners.forEach((fn) => run(fn));

  /* ---------- The schema, from skin.json ---------- */

  function build() {
    const conditions = theme.conditions;
    const items = [];
    const seenTabs = [];
    for (const [key, def] of Object.entries(conditions)) {
      const tab = TAB_OF[def.tab] || def.tab || 'Appearance';
      const label = tr('NAMES', key) || key;
      const hint = tr('DESCRIPTIONS', key) || def.description || '';
      let item;
      if (key === 'Color preset') {
        item = {
          key: 'palette', tab, label: tr('TEXT', 'Color set') ? 'Цвета' : 'Colours', hint,
          values: [...PRESETS.map((p) => ({ v: p.v, label: p.label })), { v: 'custom', label: tr('TEXT', 'Custom colors') || 'Custom' }],
        };
      } else if (key === 'Custom colors') {
        continue; // the palette's Custom
      } else if (def.slider) {
        item = { key, tab, label, hint, type: 'range', slider: def.slider, values: [] };
      } else {
        item = {
          key, tab, label, hint,
          values: Object.keys(def.values || {}).map((v) => ({ v, label: tr('TEXT', v) || v })),
        };
      }
      items.push(item);
      if (!seenTabs.includes(tab)) seenTabs.push(tab);
    }
    schema = items;
    tabs = seenTabs;
  }

  /* ---------- Reading Millennium's state ---------- */

  async function load() {
    const config = await call('Core_GetStartConfig', []);
    const active = config?.active_theme;
    const data = active?.data;
    if (!data?.Conditions || !THEME_TITLE.test(data.name || '')) throw new Error('Aika Enhanced is not the active theme');
    theme = { native: active.native, name: data.name, conditions: data.Conditions };
    const saved = config?.conditions?.[active.native] || {};
    values = {};
    for (const [key, def] of Object.entries(theme.conditions)) {
      values[key] = key in saved ? String(saved[key]) : String(def.default ?? '');
    }
    /* The Navigation editor's configuration, kept by Millennium beside the conditions
       (client/navigation/nav-config.js): taken up when this window has none */
    if (saved.__aika_nav) run(() => window.__aikaNavConfig?.adoptMillennium(saved.__aika_nav));
    colorOptions = (await call('Core_GetThemeColorOptions', { theme_name: active.native }).catch(() => [])) || [];
    build();
    ready = true;
    notify();
  }

  /* ---------- Applying a change in the open windows ---------- */

  // Every open client document: this window and Steam's popups (the friends list, chats, menus)
  function documents() {
    const docs = new Set([document]);
    for (const owner of SE.owners()) {
      const popups = run(() => [...(owner.g_PopupManager?.GetPopups?.() || [])]) || [];
      for (const popup of popups) {
        const doc = run(() => popup.window?.document || popup.m_popup?.document);
        if (doc && !run(() => doc.defaultView.closed)) docs.add(doc);
      }
    }
    return [...docs];
  }

  const themeURL = (src) => `https://millennium.host/v1/themes/${theme.native}/${src}`;
  const affectsDoc = (affects, doc) =>
    (affects || []).some((a) => run(() => doc.title.match(a)) || [...doc.documentElement.classList].some((c) => c.includes(a)));

  // A condition's option stylesheet from its old value to its new one, where Millennium injects it
  function swapSheets(key, from, to) {
    const def = theme.conditions[key];
    const oldPatch = def?.values?.[from]?.TargetCss;
    const newPatch = def?.values?.[to]?.TargetCss;
    for (const doc of documents()) {
      if (oldPatch?.src) {
        for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
          if (link.href === themeURL(oldPatch.src) || link.href.endsWith(`/${oldPatch.src}`)) link.remove();
        }
      }
      if (newPatch?.src && affectsDoc(newPatch.affects, doc)) {
        const href = themeURL(newPatch.src);
        if (![...doc.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === href)) {
          const link = doc.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.id = 'millennium-injected';
          doc.head.appendChild(link);
        }
      }
    }
  }

  // A slider's variable, as Millennium's editor writes it (style#millennium-slider-<variable>)
  function applySlider(def, value) {
    const { cssVariable, unit } = def.slider;
    for (const doc of documents()) {
      const id = `millennium-slider-${cssVariable}`;
      let el = doc.getElementById(id);
      if (!el) {
        el = doc.createElement('style');
        el.id = id;
        doc.head.appendChild(el);
      }
      el.textContent = `:root { ${cssVariable}: ${value}${unit ?? ''}; }`;
    }
  }

  function apply(key, from, to) {
    const def = theme.conditions[key];
    if (def?.slider) {
      applySlider(def, to);
      return;
    }
    const bridge = window.__aikaLiveSettingsBridge;
    if (bridge?.keys?.includes(key)) bridge.publish(key, to);
    swapSheets(key, from, to);
  }

  function save(key, value) {
    const from = values[key];
    if (from === value) return Promise.resolve();
    values[key] = value;
    apply(key, from, value);
    notify();
    return call('Core_ChangeCondition', { theme: theme.native, newData: value, condition: key }).catch((error) => {
      console.warn('[Aika Enhanced] settings: not saved', key, error);
    });
  }

  /* ---------- The API the settings window reads ---------- */

  const customOn = () => values['Custom colors'] === 'yes';

  function get(key) {
    if (key === 'chat-open') return window.__aikaFriendsDock?.chatEnabled?.() === false ? 'window' : 'dock';
    if (key === 'palette') return customOn() ? 'custom' : values['Color preset'];
    const item = schema.find((s) => s.key === key);
    if (item?.type === 'range') return Number(values[key]);
    return values[key];
  }

  function set(key, value) {
    if (!ready) return;
    if (key === 'palette') {
      if (value === 'custom') {
        setCustom();
        return;
      }
      if (customOn()) save('Custom colors', 'no');
      save('Color preset', String(value));
      return;
    }
    save(key, String(value));
  }

  // The five colours of root-colors.css, as the palette's tokens (key: the CSS variable)
  const paletteTokens = () =>
    colorOptions.map((o) => ({ key: o.color, label: tr('TEXT', o.name) || o.name || o.color, group: tr('TEXT', 'Color set') || 'Colour set' }));

  function palette() {
    const out = {};
    for (const o of colorOptions) out[o.color] = o.hex || o.defaultColor || '#000000';
    return out;
  }

  // Custom on, from the colours given (a preset's tiles only set the accent and its lights)
  function setCustom(colors = null) {
    if (!ready) return;
    if (!customOn()) save('Custom colors', 'yes');
    const next = colors && typeof colors === 'object' ? colors : {};
    const map = {
      accent: ['--aika-user-accent', '--aika-user-light-1'],
    };
    const writes = {};
    for (const [k, v] of Object.entries(next)) {
      for (const name of map[k] || [k]) if (colorOptions.some((o) => o.color === name)) writes[name] = v;
    }
    for (const [name, hex] of Object.entries(writes)) {
      if (!/^#[0-9a-f]{6}$/i.test(hex)) continue;
      const option = colorOptions.find((o) => o.color === name);
      option.hex = hex;
      for (const doc of documents()) doc.documentElement.style.setProperty(name, hex);
      call('Core_ChangeColor', { theme: theme.native, color_name: name, new_color: hex, color_type: option.type ?? 1 }).catch((error) =>
        console.warn('[Aika Enhanced] settings: colour not saved', name, error)
      );
    }
    notify();
  }

  // Each Aika setting's icon in its row (Steam Enhanced's icon set, core/icons-*.css)
  const ICONS = {
    'Top bar': 'view-compact', 'Compact header': 'view-compact', 'Header wordmark': 'quote', Preloader: 'refresh',
    'Wallet visibility': 'wallet', 'URL visibility': 'link', "What's New visibility": 'news', 'Add Shelf visibility': 'list',
    'Steam News visibility': 'announcements', 'Friends background': 'photo', 'Friends background opacity': 'eye',
    'Offline friends': 'user', 'Friend search': 'search', 'Friends list layout': 'list', 'Friends game banners': 'photo',
    Performance: 'activity', Store: 'store', 'Library scrolling': 'move', 'Library covers': 'art-zoom',
    'Cover press': 'art-parallax', 'Cursor glow': 'dynamic', 'Cursor glow radius': 'dynamic', 'Privacy blur': 'eye-off',
    'Notification wordmark': 'bell', 'Notification opacity': 'bell',
    'Friends Dock': 'friends', 'Dock at startup': 'power', 'Expand on hover': 'unfold', 'Dock: friends in game': 'gamepad',
    'Dock: friends online': 'user', 'Dock: offline friends': 'moon', 'Dock: group by game': 'group', 'Dock: friend count': 'chart',
    'Dock animations': 'activity', 'Dock: in the library': 'library', 'Dock: in the store': 'store',
    'Dock: in the community': 'community', 'Dock: on other pages': 'globe', 'Dock width': 'view-expanded',
    'Dock avatar size': 'scale', 'Dock opacity': 'eye',
    'Built-in chat': 'bubble', 'Chat window button': 'external', 'Unread badges': 'badge', 'Message alerts': 'bell',
    'Scroll to new messages': 'arrow-top', 'Keep the open chat': 'pause', 'Navigation layout': 'view-compact',
  };

  // The window's own words in Russian, with Steam in Russian (js/settings-l10n.js is loaded)
  const UI_RU = {
    Version: 'Версия', 'Search settings': 'Поиск настроек', Colours: 'Цвета', 'Fine-tune': 'Тонкая настройка',
    'No settings match.': 'Ничего не найдено.', setting: 'настройка', settings: 'настроек',
  };

  /*
   * Millennium's own editor for the theme (its sidebar, "Configure" in Millennium › Themes) stays
   * as it is, in Aika's look and in Russian (js/settings-l10n.js); a button at its top opens this
   * window with every setting.
   */
  const OPEN_LABEL = () => (L10N() ? 'Все настройки Aika Enhanced' : 'All Aika Enhanced settings');
  function sidebarButton() {
    const side = document.querySelector('.MillenniumDesktopSidebar');
    const title = side?.querySelector('.MillenniumDesktopSidebar_Title')?.textContent.trim() || '';
    const host = side?.querySelector('.MillenniumDesktopSidebar_EditorContent');
    if (!host || !THEME_TITLE.test(title) || !ready || host.querySelector('.aika-open-settings')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aika-open-settings';
    button.textContent = OPEN_LABEL();
    button.addEventListener('click', () => window.__seThemeSettings?.open());
    host.prepend(button);
  }
  const sideWatch = SE.watch(sidebarButton, { throttle: 250 });

  const api = {
    icons: ICONS,
    get ui() {
      return L10N() ? UI_RU : null;
    },
    get schema() {
      return schema;
    },
    get tabs() {
      return tabs;
    },
    tabInfo: new Proxy({}, {
      get: (_, name) => {
        const info = TAB_INFO[name];
        if (!info) return undefined;
        const label = L10N() ? TAB_RU[name] : null;
        return [info[0], info[1], label];
      },
    }),
    presets: PRESETS,
    get paletteTokens() {
      return paletteTokens();
    },
    readOn: {},
    title: 'Aika Enhanced',
    themeNative: () => theme?.native || null,
    get ready() {
      return ready;
    },
    get,
    set,
    palette,
    customColors: () => customOn(),
    setCustom,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reload: () => load().catch((error) => console.warn('[Aika Enhanced] settings:', error)),
    destroy() {
      destroyed = true;
      sideWatch?.disconnect?.();
      document.querySelectorAll('.aika-open-settings').forEach((b) => b.remove());
      listeners.clear();
      if (SE.settings === api) delete SE.settings;
      delete window.__aikaSettings;
    },
  };
  SE.settings = api;
  window.__aikaSettings = api;

  // Millennium's backend bridge comes up with plugin-rpc.js (listed before this file)
  const start = () => !destroyed && api.reload();
  if (rpc()) start();
  else addEventListener('se-plugin-rpc-ready', start, { once: true });
})(window.__se);
