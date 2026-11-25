/*
 * Aika Enhanced — the navigation's configuration: what the Navigation editor sets (vendor/
 * steam-enhanced/client/settings/theme/nav-editor.js) and the navigation reads
 * (client/navigation/aika-nav.js, sections/navigation.css).
 *
 *   window.__aikaNavConfig
 *     get()                 the whole configuration (a copy)
 *     mode()                'rail' | 'top' — the layout in use
 *     set(path, value)      one value ("rail.btn", "profile.colors.online", "top.zones")
 *     patch(section, obj)   several values of a section at once
 *     reset(section) / resetAll()
 *     replace(config)       a whole configuration (a preset, an import), validated
 *     presets               built-in and user presets: list(), apply(id), save(name), rename(id, name),
 *                           duplicate(id), remove(id), active()
 *     exportJSON() / importJSON(text) → { ok, error }
 *     on(fn) → off()        told after every change
 *
 * Layout-specific values (sizes, the buttons' order and areas, which buttons show) are kept apart
 * for the rail and the top bar, so switching keeps each one's own. The rest (profile, appearance,
 * animations, behaviour, menus) is shared.
 *
 * Kept in localStorage "aika-nav-config" (read at startup, before Millennium answers) and in
 * Millennium's own config for the theme (the condition "__aika_nav", which no skin.json condition
 * uses: Millennium keeps it with the theme's other values, across theme reinstalls). Every value
 * read back is checked against the schema below: a broken or foreign value falls back to its
 * default, never reaching the page.
 *
 * The defaults are 2.1.0's navigation exactly: a configuration left alone draws nothing new.
 */
((SE) => {
  window.__aikaNavConfig?.destroy?.();
  const { run } = SE;

  const KEYS = ['profile', 'settings', 'games', 'news', 'alerts'];
  const STORE_KEY = 'aika-nav-config';
  const MILLENNIUM_KEY = '__aika_nav';
  const VERSION = 1;

  /* ---------- The schema: every value, its kind and bounds, its default ---------- */

  const num = (def, min, max, step = 1, unit = 'px') => ({ kind: 'num', def, min, max, step, unit });
  const bool = (def) => ({ kind: 'bool', def });
  const pick = (def, values) => ({ kind: 'pick', def, values });
  const color = () => ({ kind: 'color', def: '' }); // '' — the theme's own colour

  const layoutSchema = (d) => ({
    size: num(d.size, d.sizeMin, d.sizeMax),
    btn: num(d.btn, 24, 56),
    icon: num(d.icon, 12, 28),
    avatar: num(d.avatar, 18, 48),
    gap: num(d.gap, 0, 24),
    pad: num(d.pad, 0, 32),
    margin: num(d.margin, 0, 32),
    btnRadius: num(8, 0, 28),
    panelRadius: num(d.panelRadius, 0, 28),
    border: num(1, 0, 4),
    align: pick('center', ['start', 'center', 'end']),
  });

  const SCHEMA = {
    rail: layoutSchema({ size: 56, sizeMin: 40, sizeMax: 120, btn: 40, icon: 18, avatar: 32, gap: 8, pad: 12, margin: 0, panelRadius: 0 }),
    // top.size: the title bar row's height, 0 — Steam's own (left alone)
    top: layoutSchema({ size: 0, sizeMin: 0, sizeMax: 56, btn: 32, icon: 16, avatar: 24, gap: 4, pad: 0, margin: 0, panelRadius: 10 }),
    buttons: {
      unread: bool(true),
      tooltips: bool(true),
      separators: bool(true),
      background: bool(true),
      borders: bool(true),
      labels: pick('icons', ['icons', 'labels', 'hover']),
    },
    profile: {
      shape: pick('squircle', ['squircle', 'round']),
      ring: bool(true),
      ringWidth: num(2, 1, 6),
      ringGap: num(2, 0, 6),
      glow: num(45, 0, 100, 5, '%'),
      statusAnim: bool(true),
      showName: bool(false),
      showStatus: bool(false),
      showGame: bool(false),
      indicator: bool(false),
      colors: {
        // Steam's states (EPersonaState) as the client shows them, and Do Not Disturb
        online: color(), ingame: color(), away: color(), snooze: color(),
        dnd: color(), invisible: color(), offline: color(),
      },
    },
    appearance: {
      mode: pick('default', ['default', 'minimal', 'glass', 'transparent', 'solid', 'custom']),
      panelOpacity: num(100, 0, 300, 10, '%'),
      blur: num(0, 0, 40, 2),
      btnOpacity: num(100, 0, 200, 10, '%'),
      hover: num(100, 0, 200, 10, '%'),
      active: num(100, 0, 200, 10, '%'),
      borders: bool(true),
      borderOpacity: num(100, 0, 300, 10, '%'),
      shadow: bool(false),
      glow: bool(false),
      accent: color(),
    },
    animations: {
      enabled: bool(true),
      speed: num(100, 25, 300, 25, '%'),
      hover: pick('color', ['color', 'lift', 'scale', 'glow', 'none']),
      press: bool(true),
      active: bool(true),
      menu: pick('default', ['default', 'fade', 'none']),
      tooltip: bool(true),
      ring: bool(true),
      notify: bool(true),
      switch: bool(true),
    },
    behavior: {
      autohide: bool(false), // the rail: revealed at the window's left edge; the top bar: over its row
      hideDelay: num(700, 0, 3000, 100, 'ms'),
      showDelay: num(150, 0, 1500, 50, 'ms'),
      compact: bool(false),
      closeOutside: bool(true),
      closeLeave: bool(true),
      tipDelay: num(350, 0, 1500, 50, 'ms'),
    },
    // Steam Enhanced's menus (SE.layer.menu): 0 — the menu's own value
    menus: {
      width: num(0, 0, 420, 10),
      radius: num(12, 0, 24),
      opacity: num(100, 30, 100, 5, '%'),
      blur: num(0, 0, 40, 2),
      font: num(13, 11, 16),
      spacing: num(34, 26, 48),
      icon: num(18, 12, 24),
      speed: num(100, 25, 300, 25, '%'),
      separators: bool(true),
    },
  };

  // The buttons' areas: each layout has three, each a list of buttons, separators ("sep") and gaps ("gap")
  const AREAS = { rail: ['start', 'center', 'end'], top: ['start', 'center', 'end'] };
  const DEFAULT_ZONES = {
    // 2.1.0: the rail's buttons at its foot, the avatar lowest
    rail: { start: [], center: [], end: ['alerts', 'news', 'games', 'settings', 'profile'] },
    // 2.1.0: in the title bar's row, before the account
    top: { start: [], center: [], end: ['settings', 'games', 'news', 'alerts', 'profile'] },
  };
  const DEFAULT_HIDDEN = () => Object.fromEntries(KEYS.map((k) => [k, false]));

  /* ---------- Defaults and validation ---------- */

  const defaultsOf = (schema) => {
    const out = {};
    for (const [key, spec] of Object.entries(schema)) out[key] = spec.kind ? spec.def : defaultsOf(spec);
    return out;
  };

  function defaults() {
    const d = defaultsOf(SCHEMA);
    for (const mode of ['rail', 'top']) {
      d[mode].zones = structuredClone(DEFAULT_ZONES[mode]);
      d[mode].hidden = DEFAULT_HIDDEN();
    }
    d.layout = null;
    d.version = VERSION;
    return d;
  }

  const HEX = /^#[0-9a-f]{6}$/i;
  function clean(value, spec) {
    if (spec.kind === 'num') {
      const n = Number(value);
      if (!Number.isFinite(n)) return spec.def;
      return Math.min(spec.max, Math.max(spec.min, Math.round(n / spec.step) * spec.step));
    }
    if (spec.kind === 'bool') return typeof value === 'boolean' ? value : spec.def;
    if (spec.kind === 'pick') return spec.values.includes(value) ? value : spec.def;
    if (spec.kind === 'color') return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : '';
    return spec.def;
  }
  function cleanSection(input, schema) {
    const out = {};
    const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    for (const [key, spec] of Object.entries(schema)) out[key] = spec.kind ? clean(src[key], spec) : cleanSection(src[key], spec);
    return out;
  }
  // A layout's areas: known items only, each button at most once, separators and gaps as many as wanted
  function cleanZones(input, mode) {
    const out = { start: [], center: [], end: [] };
    const seen = new Set();
    const src = input && typeof input === 'object' ? input : null;
    if (!src) return structuredClone(DEFAULT_ZONES[mode]);
    for (const area of AREAS[mode]) {
      for (const item of Array.isArray(src[area]) ? src[area].slice(0, 32) : []) {
        if (item === 'sep' || item === 'gap') out[area].push(item);
        else if (KEYS.includes(item) && !seen.has(item)) {
          seen.add(item);
          out[area].push(item);
        }
      }
    }
    // A button left out goes back to the end area, so none can be lost
    for (const key of KEYS) if (!seen.has(key)) out.end.push(key);
    return out;
  }
  function cleanHidden(input) {
    const out = DEFAULT_HIDDEN();
    if (input && typeof input === 'object') for (const k of KEYS) out[k] = input[k] === true;
    return out;
  }

  function validate(input) {
    const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const out = cleanSection(src, SCHEMA);
    for (const mode of ['rail', 'top']) {
      out[mode].zones = cleanZones(src[mode]?.zones, mode);
      out[mode].hidden = cleanHidden(src[mode]?.hidden);
    }
    out.layout = src.layout === 'rail' || src.layout === 'top' ? src.layout : null;
    out.version = VERSION;
    return out;
  }

  /* ---------- Built-in presets (their values over the defaults) ---------- */

  const merge = (base, over) => {
    const out = structuredClone(base);
    for (const [k, v] of Object.entries(over || {})) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : v;
    }
    return out;
  };
  const APPEARANCE_MODES = {
    default: {},
    minimal: { panelOpacity: 50, blur: 0, btnOpacity: 0, hover: 100, active: 100, borders: false, shadow: false, glow: false },
    glass: { panelOpacity: 200, blur: 20, btnOpacity: 60, hover: 120, active: 120, borders: true, borderOpacity: 150, shadow: true, glow: false },
    transparent: { panelOpacity: 0, blur: 0, btnOpacity: 0, borders: false, borderOpacity: 0, shadow: false, glow: false },
    solid: { panelOpacity: 100, blur: 0, btnOpacity: 150, hover: 120, active: 120, borders: true, borderOpacity: 120, shadow: false, glow: false },
  };
  const BUILT_IN = [
    { id: 'original', name: 'Original Aika Enhanced', over: {} },
    {
      id: 'steam-enhanced', name: 'Steam Enhanced Style',
      over: {
        layout: 'rail',
        rail: { size: 60, btn: 40, icon: 18, avatar: 34, gap: 8, pad: 12, zones: { start: [], center: [], end: ['alerts', 'news', 'games', 'sep', 'settings', 'profile'] } },
        buttons: { labels: 'icons' },
        appearance: { mode: 'solid', ...APPEARANCE_MODES.solid },
      },
    },
    {
      id: 'minimal-sidebar', name: 'Minimal Sidebar',
      over: {
        layout: 'rail',
        rail: { size: 48, btn: 34, icon: 16, avatar: 28, gap: 4, pad: 10, btnRadius: 10, zones: { start: ['alerts', 'news'], center: [], end: ['games', 'settings', 'profile'] } },
        buttons: { separators: false },
        appearance: { mode: 'minimal', ...APPEARANCE_MODES.minimal },
      },
    },
    {
      id: 'compact-top', name: 'Compact Top Bar',
      over: {
        layout: 'top',
        top: { btn: 28, icon: 14, avatar: 22, gap: 2 },
        behavior: { compact: true },
      },
    },
    {
      id: 'glass', name: 'Glass Navigation',
      over: {
        layout: 'rail',
        rail: { size: 60, margin: 8, panelRadius: 16, btnRadius: 12, zones: { start: [], center: ['settings', 'games', 'sep', 'news', 'alerts'], end: ['profile'] } },
        appearance: { mode: 'glass', ...APPEARANCE_MODES.glass },
        menus: { opacity: 85, blur: 20 },
      },
    },
  ];
  const builtIn = (id) => {
    const p = BUILT_IN.find((x) => x.id === id);
    return p ? validate(merge(defaults(), p.over)) : null;
  };

  /* ---------- Storage ---------- */

  const readLocal = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  let stored = readLocal() || {};
  let config = validate(stored.config);
  let userPresets = Array.isArray(stored.presets) ? stored.presets.filter((p) => p && typeof p.name === 'string' && typeof p.id === 'string').slice(0, 50).map((p) => ({ id: p.id, name: p.name.slice(0, 60), config: validate(p.config) })) : [];
  let activePreset = typeof stored.active === 'string' ? stored.active : 'original';

  const listeners = new Set();
  let mirrorTimer = 0;
  function persist() {
    const record = { config, presets: userPresets, active: activePreset };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(record));
    } catch {}
    // Millennium's copy, a moment later (one write for a slider's drag)
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(() => {
      const theme = run(() => window.__aikaSettings?.themeNative?.());
      if (!theme || !window.__sePluginRpc) return;
      window.__sePluginRpc
        .call('core', 'Core_ChangeCondition', { theme, newData: JSON.stringify(record), condition: MILLENNIUM_KEY })
        .catch(() => {});
    }, 800);
  }
  function changed(what) {
    persist();
    for (const fn of listeners) run(() => fn(config, what));
  }

  // Millennium's copy, when this window has none (a new profile, cleared storage)
  function adoptMillennium(raw) {
    if (readLocal()) return false;
    let record = null;
    try {
      record = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return false;
    }
    if (!record?.config) return false;
    config = validate(record.config);
    userPresets = Array.isArray(record.presets) ? record.presets.map((p) => ({ id: String(p.id), name: String(p.name).slice(0, 60), config: validate(p.config) })) : [];
    activePreset = typeof record.active === 'string' ? record.active : 'original';
    changed('all');
    return true;
  }

  /* ---------- Changes ---------- */

  const specAt = (path) => path.reduce((s, k) => s?.[k], SCHEMA);
  function set(path, value) {
    const parts = path.split('.');
    let target = config;
    for (const k of parts.slice(0, -1)) target = target[k];
    const key = parts.at(-1);
    if (parts.at(-1) === 'zones') target.zones = cleanZones(value, parts[0]);
    else if (key === 'hidden') target.hidden = cleanHidden(value);
    else if (path === 'layout') return useLayout(value);
    else {
      const spec = specAt(parts);
      if (!spec?.kind) return;
      target[key] = clean(value, spec);
    }
    // An appearance value moved by hand makes the mode Custom; a mode picked brings its values
    if (parts[0] === 'appearance') {
      if (key === 'mode' && APPEARANCE_MODES[value]) Object.assign(config.appearance, defaultsOf(SCHEMA.appearance), APPEARANCE_MODES[value], { mode: value });
      else if (key !== 'mode') config.appearance.mode = 'custom';
    }
    activePreset = '';
    changed(parts[0]);
  }

  function reset(section) {
    const d = defaults();
    if (section === 'layout') {
      for (const mode of ['rail', 'top']) {
        config[mode] = { ...d[mode], zones: config[mode].zones, hidden: config[mode].hidden };
      }
    } else if (section === 'buttons') {
      for (const mode of ['rail', 'top']) {
        config[mode].zones = d[mode].zones;
        config[mode].hidden = d[mode].hidden;
      }
      config.buttons = d.buttons;
    } else if (section === 'general') {
      config.layout = null;
    } else if (d[section]) {
      config[section] = d[section];
    }
    activePreset = '';
    changed(section);
  }
  function resetAll() {
    config = defaults();
    activePreset = 'original';
    changed('all');
  }
  function replace(next) {
    config = takeLayout(validate(next));
    changed('all');
  }

  const presets = {
    list: () => [
      ...BUILT_IN.map((p) => ({ id: p.id, name: p.name, builtIn: true })),
      ...userPresets.map((p) => ({ id: p.id, name: p.name, builtIn: false })),
    ],
    active: () => activePreset,
    apply(id) {
      const next = builtIn(id) || userPresets.find((p) => p.id === id)?.config;
      if (!next) return false;
      config = takeLayout(validate(next));
      activePreset = id;
      changed('all');
      return true;
    },
    save(name) {
      const id = `user-${Date.now().toString(36)}`;
      userPresets.push({ id, name: String(name || 'My navigation').slice(0, 60), config: validate({ ...config, layout: mode() }) });
      activePreset = id;
      changed('presets');
      return id;
    },
    // The active user preset takes the current settings
    update(id) {
      const p = userPresets.find((x) => x.id === id);
      if (!p) return false;
      p.config = validate({ ...config, layout: mode() });
      activePreset = id;
      changed('presets');
      return true;
    },
    rename(id, name) {
      const p = userPresets.find((x) => x.id === id);
      if (!p || !String(name).trim()) return false;
      p.name = String(name).trim().slice(0, 60);
      changed('presets');
      return true;
    },
    duplicate(id) {
      const source = builtIn(id) || userPresets.find((p) => p.id === id)?.config;
      const name = presets.list().find((p) => p.id === id)?.name;
      if (!source) return null;
      const copy = `user-${Date.now().toString(36)}`;
      userPresets.push({ id: copy, name: `${name} (2)`.slice(0, 60), config: validate(source) });
      changed('presets');
      return copy;
    },
    remove(id) {
      const before = userPresets.length;
      userPresets = userPresets.filter((p) => p.id !== id);
      if (activePreset === id) activePreset = '';
      if (userPresets.length !== before) changed('presets');
      return userPresets.length !== before;
    },
  };

  function exportJSON() {
    return JSON.stringify({ type: 'aika-enhanced-navigation', version: VERSION, config: { ...config, layout: mode() } }, null, 2);
  }
  // A configuration from JSON: refused unless it is one; every value checked, unknown ones dropped
  function importJSON(text) {
    let data;
    try {
      data = JSON.parse(String(text || ''));
    } catch (error) {
      return { ok: false, error: `Not JSON: ${error.message}` };
    }
    const cfg = data?.type === 'aika-enhanced-navigation' ? data.config : data;
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return { ok: false, error: 'Not a navigation configuration' };
    const known = ['layout', 'rail', 'top', 'buttons', 'profile', 'appearance', 'animations', 'behavior', 'menus'];
    if (!Object.keys(cfg).some((k) => known.includes(k))) return { ok: false, error: 'Not a navigation configuration' };
    config = takeLayout(validate(cfg));
    activePreset = '';
    changed('all');
    return { ok: true };
  }

  /*
   * The layout in use is the "Navigation layout" setting's (skin.json; Millennium keeps it): a
   * preset or an import that names one switches that setting, the one place it is kept.
   */
  const mode = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--aika-nav-layout').trim().replace(/["']/g, '') === 'rail' ? 'rail' : 'top';
  function useLayout(next) {
    if (next !== 'rail' && next !== 'top') return;
    // At once here (as Aika's live bridge sets it), and saved as the setting
    document.documentElement.style.setProperty('--aika-nav-layout', next);
    run(() => window.__aikaSettings?.ready && window.__aikaSettings.set('Navigation layout', next === 'rail' ? 'Left Sidebar' : 'Top Bar'));
  }
  function takeLayout(cfg) {
    if (cfg.layout) useLayout(cfg.layout);
    cfg.layout = null;
    return cfg;
  }

  window.__aikaNavConfig = {
    KEYS, SCHEMA, AREAS, APPEARANCE_MODES, MILLENNIUM_KEY,
    get: () => structuredClone(config),
    defaults,
    validate,
    mode,
    useLayout,
    set,
    patch(section, obj) {
      for (const [k, v] of Object.entries(obj || {})) set(`${section}.${k}`, v);
    },
    reset,
    resetAll,
    replace,
    presets,
    exportJSON,
    importJSON,
    adoptMillennium,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    destroy() {
      clearTimeout(mirrorTimer);
      listeners.clear();
      delete window.__aikaNavConfig;
    },
  };
})(window.__se);
