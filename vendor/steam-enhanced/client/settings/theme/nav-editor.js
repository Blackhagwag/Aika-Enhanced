/*
 * Aika Enhanced — the Navigation editor: the theme settings window's Navigation tab
 * (theme-settings.js draws it through settings.customTabs). It edits the navigation's
 * configuration (client/navigation/nav-config.js), which the navigation (aika-nav.js) applies as
 * it changes; the preview here draws the same configuration with the same numbers
 * (window.__aikaNav.preview), your real avatar and status.
 *
 * Categories: General (the layout, the layout being edited, resets), Layout (sizes, spacing,
 * radii, alignment), Buttons (their order and areas by drag and drop, separators and gaps, which
 * show), Profile (the avatar, the ring, the caption, the state colours), Appearance (the look's
 * mode and its values), Animations, Behaviour (auto-hide, compact, labels, closing menus,
 * tooltips), Pop-up menus, Presets (built-in and yours; JSON export and import).
 *
 * Every control is a real setting of the navigation; nothing here only looks like one.
 */
((SE) => {
  const { run } = SE;
  const NC = () => window.__aikaNavConfig;
  const settings = SE.settings;
  if (!settings) return;

  const RU = () => Boolean(window.__aikaSettingsText);
  const W = {
    general: ['General', 'Общее'], layout: ['Layout', 'Размеры'], buttons: ['Buttons', 'Кнопки'], profile: ['Profile', 'Профиль'],
    appearance: ['Appearance', 'Вид'], animations: ['Animations', 'Анимации'], behavior: ['Behaviour', 'Поведение'], menus: ['Pop-up menus', 'Меню'],
    presets: ['Presets', 'Пресеты'],
    preview: ['Preview', 'Предпросмотр'], previewHint: ['Live: the same numbers as the real navigation', 'Вживую: те же значения, что у настоящей навигации'],
    editing: ['Settings for', 'Настройки для'], editingHint: ['Sizes, order and buttons are kept for each layout', 'Размеры, порядок и кнопки у каждой раскладки свои'],
    rail: ['Left Sidebar', 'Левая панель'], top: ['Top Bar', 'Верхняя панель'],
    resetCat: ['Reset this category', 'Сбросить категорию'], resetAll: ['Reset all navigation', 'Сбросить всю навигацию'],
    resetAllHint: ['Back to Aika Enhanced 2.1.0’s navigation (your presets stay)', 'Вернуть навигацию Aika Enhanced 2.1.0 (пресеты останутся)'],
    on: ['On', 'Вкл'], off: ['Off', 'Выкл'], def: ['Default', 'Стандарт'],
    size_rail: ['Sidebar width', 'Ширина панели'], size_top: ['Bar height', 'Высота полосы'],
    sizeHint_rail: ['The rail’s width', 'Ширина левой панели'], sizeHint_top: ['The bar behind the areas (with a look other than Aika’s; 0 — the buttons’ own)', 'Подложка под кнопками (вид не «Aika»; 0 — по кнопкам)'],
    btn: ['Button size', 'Размер кнопок'], icon: ['Icon size', 'Размер иконок'], avatar: ['Avatar size', 'Размер аватара'], gap: ['Spacing', 'Отступ между кнопками'],
    pad: ['Inner padding', 'Внутренний отступ'], padHint: ['From the panel’s ends to the buttons', 'От краёв панели до кнопок'],
    margin: ['Outer margin', 'Внешний отступ'], marginHint: ['From the window’s edges (a floating panel)', 'От краёв окна (плавающая панель)'],
    btnRadius: ['Button radius', 'Скругление кнопок'], panelRadius: ['Panel radius', 'Скругление панели'], border: ['Border thickness', 'Толщина обводки'],
    align: ['Alignment', 'Выравнивание'], alignHint_rail: ['Across the rail', 'Поперёк панели'], alignHint_top: ['In the header’s row', 'В строке заголовка'],
    start: ['Start', 'Начало'], center: ['Centre', 'Центр'], end: ['End', 'Конец'],
    zone_rail_start: ['Top', 'Верх'], zone_rail_center: ['Middle', 'Середина'], zone_rail_end: ['Bottom', 'Низ'],
    zone_top_start: ['Left', 'Слева'], zone_top_center: ['Middle', 'По центру'], zone_top_end: ['Right (in the header’s row)', 'Справа (в строке заголовка)'],
    order: ['Order and areas', 'Порядок и зоны'], orderHint: ['Drag buttons between areas; separators and gaps from below. Keys: arrows move the focused one, Delete removes a separator or a gap.', 'Перетаскивайте кнопки между зонами, разделители и пробелы — снизу. Клавиши: стрелки двигают выбранную, Delete убирает разделитель или пробел.'],
    addSep: ['Separator', 'Разделитель'], addGap: ['Gap', 'Пробел'], dropHere: ['Drop here', 'Сюда'], removeHere: ['Drop here to remove', 'Бросьте сюда, чтобы убрать'],
    downloads: ['Downloads stays in Aika’s floating bar', 'Загрузки остаются на плавающей панели Aika'],
    show: ['Show', 'Показ'], hide: ['Hide', 'Скрыть'],
    k_profile: ['My Profile', 'Мой профиль'], k_settings: ['Settings', 'Настройки'], k_games: ['Games', 'Игры'], k_news: ['Announcements', 'Новости'], k_alerts: ['Notifications', 'Уведомления'],
    settingsHidden: ['Settings is hidden: open the theme’s settings from My Profile’s menu, the dock’s sliders button, Millennium’s “All Aika Enhanced settings” or Ctrl+Shift+`', 'Настройки скрыты: настройки темы — в меню профиля, кнопкой в доке друзей, «Все настройки Aika Enhanced» в Millennium или Ctrl+Shift+`'],
    unread: ['Unread indicators', 'Индикаторы непрочитанного'], tooltips: ['Tooltips', 'Подсказки'], tooltipsHint: ['Beside the rail’s buttons', 'Возле кнопок левой панели'],
    separators: ['Separators', 'Разделители'], background: ['Button background', 'Фон кнопок'], borders: ['Button borders', 'Обводка кнопок'],
    shape: ['Avatar shape', 'Форма аватара'], squircle: ['Squircle', 'Скруглённый'], round: ['Round', 'Круглый'],
    ring: ['Status ring', 'Кольцо статуса'], ringWidth: ['Ring width', 'Толщина кольца'], ringGap: ['Ring gap', 'Зазор кольца'], glow: ['Glow on hover', 'Свечение при наведении'],
    statusAnim: ['Animate a status change', 'Анимация смены статуса'], showName: ['Show name', 'Показывать имя'], showStatus: ['Show status', 'Показывать статус'],
    showGame: ['Show the game', 'Показывать игру'], indicator: ['Status dot', 'Точка статуса'], indicatorHint: ['A dot at the avatar’s corner', 'Точка в углу аватара'],
    colors: ['Status colours', 'Цвета статусов'], colorsHint: ['Steam’s states; Default — the preset’s colour', 'Состояния Steam; «Стандарт» — цвет пресета'],
    s_online: ['Online', 'В сети'], s_ingame: ['In game', 'В игре'], s_away: ['Away', 'Нет на месте'], s_snooze: ['Snooze', 'Спит'], s_dnd: ['Do Not Disturb', 'Не беспокоить'], s_invisible: ['Invisible', 'Невидимка'], s_offline: ['Offline', 'Не в сети'],
    mode: ['Style', 'Стиль'], m_default: ['Aika', 'Aika'], m_minimal: ['Minimal', 'Минимал'], m_glass: ['Glass', 'Стекло'], m_transparent: ['Transparent', 'Прозрачный'], m_solid: ['Solid', 'Плотный'], m_custom: ['Custom', 'Свой'],
    modeHint: ['A style sets the values below; moving one makes it Custom', 'Стиль задаёт значения ниже; изменение любого делает его «Свой»'],
    panelOpacity: ['Panel opacity', 'Плотность панели'], blur: ['Panel blur', 'Размытие панели'], btnOpacity: ['Button opacity', 'Плотность кнопок'],
    hover: ['Hover intensity', 'Яркость наведения'], active: ['Active intensity', 'Яркость активной'], bordersA: ['Borders', 'Обводки'], borderOpacity: ['Border opacity', 'Яркость обводок'],
    shadow: ['Shadow', 'Тень'], glowA: ['Glow', 'Свечение'], accent: ['Accent colour', 'Акцентный цвет'], accentHint: ['Default — the preset’s accent', 'Стандарт — акцент пресета'],
    enabled: ['Animations', 'Анимации'], speed: ['Speed', 'Скорость'], hoverAnim: ['Hover', 'Наведение'], a_color: ['Colour', 'Цвет'], a_lift: ['Lift', 'Подъём'], a_scale: ['Grow', 'Увеличение'], a_glow: ['Glow', 'Свечение'], a_none: ['None', 'Нет'],
    press: ['Press', 'Нажатие'], activeAnim: ['Open button', 'Активная кнопка'], menuAnim: ['Menu opening', 'Открытие меню'], a_default: ['Slide', 'Выезд'], a_fade: ['Fade', 'Проявление'],
    tooltipAnim: ['Tooltip', 'Подсказка'], ringAnim: ['Avatar ring', 'Кольцо аватара'], notify: ['New notifications', 'Новые уведомления'], switchAnim: ['Switching layouts', 'Смена раскладки'],
    autohide: ['Auto-hide', 'Автоскрытие'], autohideHint: ['The rail comes back at the window’s left edge, the top bar’s buttons over the header’s row', 'Левая панель появляется у левого края окна, кнопки верхней — при наведении на строку заголовка'],
    hideDelay: ['Hide delay', 'Задержка скрытия'], showDelay: ['Show delay', 'Задержка появления'], compact: ['Compact', 'Компактный режим'], compactHint: ['Smaller buttons and spacing', 'Кнопки и отступы меньше'],
    labels: ['Names', 'Подписи'], l_icons: ['Icons only', 'Только иконки'], l_labels: ['Icons and names', 'Иконки и подписи'], l_hover: ['Names on hover', 'Подписи при наведении'],
    closeOutside: ['Close menus on a click outside', 'Закрывать меню кликом мимо'], closeLeave: ['Close menus when the pointer leaves', 'Закрывать меню, когда курсор уходит'], tipDelay: ['Tooltip delay', 'Задержка подсказок'],
    width: ['Width', 'Ширина'], widthHint: ['0 — the menu’s own', '0 — по содержимому'], radius: ['Radius', 'Скругление'], opacity: ['Opacity', 'Плотность'], font: ['Font size', 'Размер шрифта'],
    spacing: ['Row height', 'Высота строк'], menuIcon: ['Icon size', 'Размер иконок'], menuSpeed: ['Opening speed', 'Скорость открытия'], menuSep: ['Separators', 'Разделители'],
    menusHint: ['My Profile, Settings, Games and Announcements. Notifications and Steam’s account menu are Steam’s own windows and keep Steam’s look.', 'Профиль, Настройки, Игры и Новости. Уведомления и меню аккаунта Steam — собственные окна Steam, их вид не меняется.'],
    builtIn: ['Built-in', 'Встроенные'], yours: ['Yours', 'Ваши'], apply: ['Apply', 'Применить'], active: ['In use', 'Выбран'], rename: ['Rename', 'Переименовать'], duplicate: ['Duplicate', 'Копия'],
    del: ['Delete', 'Удалить'], save: ['Save current as…', 'Сохранить текущие как…'], saveBtn: ['Save', 'Сохранить'], update: ['Update with current', 'Обновить текущими'],
    name: ['Name', 'Название'], exportT: ['Export', 'Экспорт'], exportHint: ['The current navigation as JSON', 'Текущая навигация в JSON'], copy: ['Copy', 'Копировать'], copied: ['Copied', 'Скопировано'],
    importT: ['Import', 'Импорт'], importHint: ['Paste a navigation JSON; anything wrong is refused or set back to its default', 'Вставьте JSON навигации; ошибочное отклоняется или сбрасывается к стандарту'],
    importBtn: ['Import', 'Импортировать'], imported: ['Imported', 'Импортировано'], none: ['No presets of yours yet', 'Своих пресетов пока нет'],
    px: ['px', 'пкс'], ms: ['ms', 'мс'],
  };
  const t = (key) => (W[key] ? W[key][RU() ? 1 : 0] : key);
  const KEYS = ['profile', 'settings', 'games', 'news', 'alerts'];
  const ICON = { profile: '--se-icon-user', settings: '--se-icon-settings', games: '--se-icon-gamepad', news: '--se-icon-announcements', alerts: '--se-icon-bell' };
  const CATS = ['general', 'layout', 'buttons', 'profile', 'appearance', 'animations', 'behavior', 'menus', 'presets'];
  const CAT_ICON = { general: 'settings', layout: 'view-compact', buttons: 'grid', profile: 'user', appearance: 'palette', animations: 'activity', behavior: 'sliders', menus: 'list', presets: 'archive' };

  let category = 'general';
  let editMode = null; // the layout being edited (null: the one in use)

  // The main window's Aika colours, for the preview in this window
  const TOKENS = ['--aika-accent', '--aika-accent-bright', '--aika-accent-fill', '--aika-accent-glow', '--aika-ok', '--aika-warn', '--aika-live', '--aika-fg', '--aika-fg-muted',
    '--aika-fg-subtle', '--aika-surface', '--aika-surface-hover', '--aika-border', '--aika-border-accent', '--aika-bg-base', '--aika-bg-elevated', '--aika-on-accent', '--aika-fl-avatar-radius',
    '--aika-highlight-top', '--aika-shadow-menu', '--se-icon-user', '--se-icon-settings', '--se-icon-gamepad', '--se-icon-announcements', '--se-icon-bell'];
  const copyTokens = (node) => {
    const cs = getComputedStyle(document.documentElement);
    for (const name of TOKENS) {
      const v = cs.getPropertyValue(name).trim();
      if (v) node.style.setProperty(name, v);
    }
  };

  function tab(p) {
    const { doc, make, button, heading, cleanup } = p;
    const nc = NC();
    if (!nc) return [make('p', 'se-ts-empty', 'The navigation is not loaded.')];
    const mode = () => editMode || nc.mode();
    const c = () => nc.get();
    const refreshers = [];
    const refresh = () => refreshers.forEach(run);

    /* ---------- Controls: each a row of the window's own look ---------- */

    const rowOf = (label, hint, control, icon = 'sliders', wide = false) => {
      const node = make('div', 'se-ts-row ane-row');
      const tile = make('span', 'se-ts-row-icon');
      tile.setAttribute('aria-hidden', 'true');
      tile.style.setProperty('--se-ts-icon', `var(--se-icon-${icon})`);
      const text = make('div', 'se-ts-text');
      text.append(make('div', 'se-ts-label', label));
      if (hint) text.append(make('div', 'se-ts-hint', hint));
      if (wide) node.classList.add('se-ts-row-wide');
      node.append(tile, text, control);
      return node;
    };
    const valueAt = (path) => path.split('.').reduce((o, k) => o?.[k], c());
    const specAt = (path) => {
      const parts = path.split('.');
      const head = parts[0] === 'rail' || parts[0] === 'top' ? [parts[0]] : [];
      return parts.slice(head.length).reduce((o, k) => o?.[k], head.length ? nc.SCHEMA[parts[0]] : nc.SCHEMA);
    };
    const unitText = (unit) => (unit === 'px' ? ` ${t('px')}` : unit === 'ms' ? ` ${t('ms')}` : unit === '%' ? ' %' : '');

    const slider = (path, label, hint, icon) => {
      const spec = specAt(typeof path === 'function' ? path() : path);
      const at = () => (typeof path === 'function' ? path() : path);
      const box = make('label', 'se-ts-range');
      const input = make('input');
      input.type = 'range';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = String(spec.step);
      input.setAttribute('aria-label', label);
      input.dataset.anePath = at();
      const out = make('output', 'se-ts-range-value');
      const show = (v) => {
        out.textContent = `${v}${unitText(spec.unit)}`;
        box.style.setProperty('--se-ts-range-fill', `${Math.round(((Number(v) - spec.min) / (spec.max - spec.min || 1)) * 100)}%`);
      };
      input.addEventListener('input', () => {
        show(input.value);
        nc.set(at(), Number(input.value));
      });
      box.append(input, out);
      refreshers.push(() => {
        input.dataset.anePath = at();
        const v = valueAt(at());
        if (doc.activeElement !== input) input.value = String(v);
        show(input.value);
      });
      return rowOf(label, hint, box, icon);
    };

    const seg = (path, choices, label, hint, icon, onPick) => {
      const at = () => (typeof path === 'function' ? path() : path);
      const group = make('div', 'se-seg');
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', label);
      group.dataset.anePath = at();
      const nodes = choices.map(([value, text]) => {
        const node = button('', text);
        node.setAttribute('role', 'radio');
        node.dataset.value = String(value);
        group.append(node);
        return node;
      });
      group.addEventListener('click', (event) => {
        const node = event.target.closest('button[data-value]');
        if (!node) return;
        const choice = choices.find(([v]) => String(v) === node.dataset.value)[0];
        if (onPick) onPick(choice);
        else nc.set(at(), choice);
      });
      refreshers.push(() => {
        group.dataset.anePath = at();
        const v = String(valueAt(at()));
        for (const node of nodes) node.setAttribute('aria-checked', String(node.dataset.value === v));
      });
      return rowOf(label, hint, group, icon, choices.length > 4);
    };
    const toggle = (path, label, hint, icon) => seg(path, [[true, t('on')], [false, t('off')]], label, hint, icon);

    const colour = (path, label, hint, fallbackToken) => {
      const box = make('div', 'ane-colour');
      const input = make('input');
      input.type = 'color';
      input.setAttribute('aria-label', label);
      input.dataset.anePath = path;
      const reset = button('ane-link', t('def'));
      input.addEventListener('input', () => nc.set(path, input.value));
      reset.addEventListener('click', () => nc.set(path, ''));
      box.append(input, reset);
      refreshers.push(() => {
        const v = valueAt(path);
        const fallback = toHex(getComputedStyle(document.documentElement).getPropertyValue(fallbackToken).trim());
        if (doc.activeElement !== input) input.value = v || fallback || '#888888';
        box.classList.toggle('is-default', !v);
        reset.disabled = !v;
      });
      return rowOf(label, hint, box, 'palette');
    };

    const card = (...rows) => {
      const node = make('div', 'se-ts-rows');
      node.append(...rows.filter(Boolean));
      return node;
    };
    const resetButton = (section) => {
      const node = button('ane-button', t('resetCat'));
      node.dataset.aneReset = section;
      node.addEventListener('click', () => nc.reset(section));
      return node;
    };

    /* ---------- The preview ---------- */

    const preview = make('div', 'ane-preview');
    preview.setAttribute('aria-label', t('preview'));
    copyTokens(preview);
    const avatarURL = () => document.querySelector('.TitleBarControls .AccountMenu img.avatar')?.src || '';

    function drawPreview() {
      const nav = window.__aikaNav;
      const m = mode();
      const info = nav?.preview?.(m);
      preview.replaceChildren();
      if (!info) return;
      preview.dataset.mode = m;
      preview.dataset.look = info.looks.join(' ');
      for (const name of [...preview.style].filter((n) => n.startsWith('--aika-nav-'))) preview.style.removeProperty(name);
      for (const [name, value] of Object.entries(info.vars)) if (name.startsWith('--aika-nav-')) preview.style.setProperty(name, value);
      const L = info.m;
      preview.style.setProperty('--p-btn', `${L.btn}px`);
      preview.style.setProperty('--p-glyph', `${L.icon}px`);
      preview.style.setProperty('--p-avatar', `${L.avatar}px`);
      preview.style.setProperty('--p-gap', `${L.gap}px`);
      preview.style.setProperty('--p-pad', `${L.pad}px`);
      preview.style.setProperty('--p-margin', `${L.margin}px`);
      const wide = info.looks.includes('wide');
      preview.style.setProperty('--p-rail', `${wide ? Math.max(L.size, 184) : L.size}px`);
      const head = make('div', 'ane-p-head');
      for (let i = 0; i < 4; i++) head.append(make('span', 'ane-p-menu'));
      const body = make('div', 'ane-p-body');
      const content = make('div', 'ane-p-content');
      for (let i = 0; i < 6; i++) content.append(make('span', 'ane-p-card'));
      const item = (key, zone) => {
        if (key === 'sep' || key === 'gap') return make('span', `ane-p-${key}`);
        const node = make('span', `ane-p-btn ane-p-${key}`);
        node.dataset.key = key;
        node.dataset.zone = zone;
        if (key === 'profile') {
          node.dataset.state = info.state();
          const img = make('img', 'ane-p-avatar');
          const src = avatarURL();
          if (src) img.src = src;
          img.alt = '';
          node.append(img);
          const caption = info.looks.includes('caption') || wide || info.looks.includes('labels') ? info.caption() : '';
          if (caption) node.append(make('span', 'ane-p-label', caption));
        } else {
          const glyph = make('span', 'ane-p-glyph');
          glyph.style.setProperty('--p-icon', `var(${ICON[key]})`);
          node.append(glyph);
          if (wide || info.looks.includes('labels')) node.append(make('span', 'ane-p-label', info.label(key)));
          if ((key === 'alerts' || key === 'news') && !info.looks.includes('nounread')) node.append(make('span', 'ane-p-dot'));
        }
        return node;
      };
      const zones = ['start', 'center', 'end'].map((zone) => {
        const node = make('div', `ane-p-zone ane-p-zone-${zone}`);
        node.append(...info.areas[zone].map((key) => item(key, zone)));
        return node;
      });
      if (m === 'rail') {
        const railNode = make('div', 'ane-p-rail');
        railNode.append(...zones);
        body.append(railNode, content);
        preview.append(head, body);
        // A rail taller than the preview is drawn smaller, whole
        requestAnimationFrame(() => {
          const room = body.clientHeight - 2 * L.margin;
          const need = [...railNode.children].reduce((sum, z) => sum + z.scrollHeight, 0) + 2 * L.pad + 2 * L.gap;
          railNode.style.zoom = need > room && room > 0 ? String(Math.max(0.4, room / need)) : '';
        });
      } else {
        const right = make('div', 'ane-p-controls');
        right.append(zones[2], make('span', 'ane-p-window'));
        head.append(zones[0], zones[1], right);
        body.append(content);
        preview.append(head, body);
      }
    }
    refreshers.push(drawPreview);

    const previewCard = make('div', 'ane-preview-card');
    const previewHead = make('div', 'ane-preview-head');
    const previewTitle = make('div', 'ane-preview-title');
    previewTitle.append(make('span', 'se-ts-eyebrow', t('preview')), make('span', 'se-ts-hint', t('previewHint')));
    const editSeg = make('div', 'se-seg ane-edit-seg');
    editSeg.setAttribute('role', 'radiogroup');
    editSeg.setAttribute('aria-label', t('editing'));
    const editButtons = ['rail', 'top'].map((m) => {
      const node = button('', t(m));
      node.setAttribute('role', 'radio');
      node.dataset.value = m;
      editSeg.append(node);
      return node;
    });
    editSeg.addEventListener('click', (event) => {
      const node = event.target.closest('button[data-value]');
      if (!node) return;
      editMode = node.dataset.value === nc.mode() ? null : node.dataset.value;
      rerender();
    });
    refreshers.push(() => {
      for (const node of editButtons) node.setAttribute('aria-checked', String(node.dataset.value === mode()));
    });
    previewHead.append(previewTitle, editSeg);
    previewCard.append(previewHead, preview);

    /* ---------- Categories ---------- */

    const catBar = make('div', 'ane-cats');
    catBar.setAttribute('role', 'tablist');
    for (const name of CATS) {
      const node = button('ane-cat', t(name));
      node.setAttribute('role', 'tab');
      node.dataset.cat = name;
      node.style.setProperty('--se-ts-icon', `var(--se-icon-${CAT_ICON[name]})`);
      node.setAttribute('aria-selected', String(name === category));
      catBar.append(node);
    }
    catBar.addEventListener('click', (event) => {
      const node = event.target.closest('[data-cat]');
      if (!node) return;
      category = node.dataset.cat;
      rerender();
    });

    const body = make('div', 'ane-body');
    const L = (key) => `${mode()}.${key}`;
    const sections = {
      general() {
        const layoutItem = p.items?.find((i) => i.key === 'Navigation layout');
        const all = button('ane-button ane-danger', t('resetAll'));
        all.dataset.aneReset = 'all';
        all.addEventListener('click', () => nc.resetAll());
        const out = [card(layoutItem ? p.row(layoutItem) : null, rowOf(t('editing'), t('editingHint'), make('span', 'se-ts-hint', t(mode())), 'view-compact'))];
        if (c()[mode()].hidden.settings) out.push(make('p', 'ane-note', t('settingsHidden')));
        out.push(card(rowOf(t('resetAll'), t('resetAllHint'), all, 'restart')));
        return out;
      },
      layout() {
        const m = mode();
        return [card(
          slider(L('size'), t(`size_${m}`), t(`sizeHint_${m}`), 'view-compact'),
          slider(L('btn'), t('btn'), null, 'grid'),
          slider(L('icon'), t('icon'), null, 'settings'),
          slider(L('avatar'), t('avatar'), null, 'user'),
          slider(L('gap'), t('gap'), null, 'unfold'),
          slider(L('pad'), t('pad'), t('padHint'), 'fold'),
          slider(L('margin'), t('margin'), t('marginHint'), 'move'),
          slider(L('btnRadius'), t('btnRadius'), null, 'grid'),
          slider(L('panelRadius'), t('panelRadius'), null, 'view-compact'),
          slider(L('border'), t('border'), null, 'grid'),
          seg(L('align'), [['start', t('start')], ['center', t('center')], ['end', t('end')]], t('align'), t(`alignHint_${m}`), 'list'),
        ), resetButton('layout')];
      },
      buttons() {
        return [orderEditor(), card(
          ...KEYS.map((k) => {
            const rowNode = seg(() => `${mode()}.hidden.${k}`, [[false, t('show')], [true, t('hide')]], t(`k_${k}`), null, null, (hide) =>
              nc.set(`${mode()}.hidden`, { ...c()[mode()].hidden, [k]: hide }));
            rowNode.querySelector('.se-ts-row-icon').style.setProperty('--se-ts-icon', `var(${ICON[k]})`);
            return rowNode;
          }),
          toggle('buttons.unread', t('unread'), null, 'bell'),
          toggle('buttons.tooltips', t('tooltips'), t('tooltipsHint'), 'info'),
          toggle('buttons.separators', t('separators'), null, 'list'),
          toggle('buttons.background', t('background'), null, 'grid'),
          toggle('buttons.borders', t('borders'), null, 'grid'),
        ), make('p', 'ane-note', t('downloads')), resetButton('buttons')];
      },
      profile() {
        const tokens = { online: '--aika-accent-bright', ingame: '--aika-ok', away: '--aika-warn', snooze: '--aika-warn', dnd: '--aika-live', invisible: '--aika-fg-subtle', offline: '--aika-fg-subtle' };
        return [card(
          seg('profile.shape', [['squircle', t('squircle')], ['round', t('round')]], t('shape'), null, 'user'),
          toggle('profile.ring', t('ring'), null, 'badge'),
          slider('profile.ringWidth', t('ringWidth'), null, 'badge'),
          slider('profile.ringGap', t('ringGap'), null, 'badge'),
          slider('profile.glow', t('glow'), null, 'badge'),
          toggle('profile.statusAnim', t('statusAnim'), null, 'activity'),
          toggle('profile.showName', t('showName'), null, 'id-card'),
          toggle('profile.showStatus', t('showStatus'), null, 'info'),
          toggle('profile.showGame', t('showGame'), null, 'gamepad'),
          toggle('profile.indicator', t('indicator'), t('indicatorHint'), 'badge'),
        ), heading(t('colors'), make('span', 'se-ts-hint', t('colorsHint'))), card(
          ...Object.keys(tokens).map((st) => colour(`profile.colors.${st}`, t(`s_${st}`), null, tokens[st])),
        ), resetButton('profile')];
      },
      appearance() {
        return [card(
          seg('appearance.mode', ['default', 'minimal', 'glass', 'transparent', 'solid', 'custom'].map((v) => [v, t(`m_${v}`)]), t('mode'), t('modeHint'), 'palette', (v) => {
            if (v !== 'custom') nc.set('appearance.mode', v);
          }),
          slider('appearance.panelOpacity', t('panelOpacity'), null, 'view-compact'),
          slider('appearance.blur', t('blur'), null, 'view-compact'),
          slider('appearance.btnOpacity', t('btnOpacity'), null, 'grid'),
          slider('appearance.hover', t('hover'), null, 'grid'),
          slider('appearance.active', t('active'), null, 'grid'),
          toggle('appearance.borders', t('bordersA'), null, 'grid'),
          slider('appearance.borderOpacity', t('borderOpacity'), null, 'grid'),
          toggle('appearance.shadow', t('shadow'), null, 'view-compact'),
          toggle('appearance.glow', t('glowA'), null, 'badge'),
          colour('appearance.accent', t('accent'), t('accentHint'), '--aika-accent'),
        ), resetButton('appearance')];
      },
      animations() {
        return [card(
          toggle('animations.enabled', t('enabled'), null, 'activity'),
          slider('animations.speed', t('speed'), null, 'activity'),
          seg('animations.hover', ['color', 'lift', 'scale', 'glow', 'none'].map((v) => [v, t(`a_${v}`)]), t('hoverAnim'), null, 'grid'),
          toggle('animations.press', t('press'), null, 'grid'),
          toggle('animations.active', t('activeAnim'), null, 'grid'),
          seg('animations.menu', ['default', 'fade', 'none'].map((v) => [v, t(`a_${v}`)]), t('menuAnim'), null, 'list'),
          toggle('animations.tooltip', t('tooltipAnim'), null, 'info'),
          toggle('animations.ring', t('ringAnim'), null, 'badge'),
          toggle('animations.notify', t('notify'), null, 'bell'),
          toggle('animations.switch', t('switchAnim'), null, 'view-compact'),
        ), resetButton('animations')];
      },
      behavior() {
        return [card(
          toggle('behavior.autohide', t('autohide'), t('autohideHint'), 'eye-off'),
          slider('behavior.hideDelay', t('hideDelay'), null, 'eye-off'),
          slider('behavior.showDelay', t('showDelay'), null, 'eye'),
          toggle('behavior.compact', t('compact'), t('compactHint'), 'view-compact'),
          seg('buttons.labels', [['icons', t('l_icons')], ['labels', t('l_labels')], ['hover', t('l_hover')]], t('labels'), null, 'list'),
          toggle('behavior.closeOutside', t('closeOutside'), null, 'close-sm'),
          toggle('behavior.closeLeave', t('closeLeave'), null, 'close-sm'),
          slider('behavior.tipDelay', t('tipDelay'), null, 'info'),
        ), resetButton('behavior')];
      },
      menus() {
        return [make('p', 'ane-note', t('menusHint')), card(
          slider('menus.width', t('width'), t('widthHint'), 'list'),
          slider('menus.radius', t('radius'), null, 'list'),
          slider('menus.opacity', t('opacity'), null, 'list'),
          slider('menus.blur', t('blur'), null, 'list'),
          slider('menus.font', t('font'), null, 'list'),
          slider('menus.spacing', t('spacing'), null, 'list'),
          slider('menus.icon', t('menuIcon'), null, 'list'),
          slider('menus.speed', t('menuSpeed'), null, 'activity'),
          toggle('menus.separators', t('menuSep'), null, 'list'),
        ), resetButton('menus')];
      },
      presets: presetsPage,
    };

    /* ---------- Buttons: order and areas, by drag and drop or keys ---------- */

    function orderEditor() {
      const m = mode();
      const wrap = make('div', 'ane-order');
      wrap.append(heading(t('order'), make('span', 'se-ts-hint', t('orderHint'))));
      const board = make('div', 'ane-board');
      board.dataset.mode = m;
      wrap.append(board);
      const zonesNow = () => structuredClone(c()[mode()].zones);
      const commit = (zones) => nc.set(`${mode()}.zones`, zones);

      const chip = (item, zone, index) => {
        const node = button(`ane-chip${item === 'sep' || item === 'gap' ? ' is-filler' : ''}`);
        node.dataset.item = item;
        node.dataset.zone = zone;
        node.dataset.index = String(index);
        const name = item === 'sep' ? t('addSep') : item === 'gap' ? t('addGap') : t(`k_${item}`);
        const icon = make('span', 'ane-chip-icon');
        icon.setAttribute('aria-hidden', 'true');
        icon.style.setProperty('--se-ts-icon', item === 'sep' || item === 'gap' ? `var(--se-icon-${item === 'sep' ? 'list' : 'unfold'})` : `var(${ICON[item]})`);
        const grip = make('span', 'ane-chip-grip');
        grip.setAttribute('aria-hidden', 'true');
        node.append(grip, icon, make('span', 'ane-chip-name', name));
        if (KEYS.includes(item) && c()[mode()].hidden[item]) node.classList.add('is-hidden');
        node.setAttribute('aria-label', name);
        return node;
      };
      const zoneNodes = {};
      const palette = make('div', 'ane-palette');
      function draw() {
        board.replaceChildren();
        const zones = zonesNow();
        for (const zone of ['start', 'center', 'end']) {
          const box = make('div', 'ane-zone');
          box.dataset.zone = zone;
          const title = make('div', 'ane-zone-title', t(`zone_${mode()}_${zone}`));
          const list = make('div', 'ane-zone-list');
          list.dataset.zone = zone;
          list.dataset.empty = t('dropHere');
          zones[zone].forEach((item, i) => list.append(chip(item, zone, i)));
          box.append(title, list);
          board.append(box);
          zoneNodes[zone] = list;
        }
        palette.replaceChildren(chip('sep', 'palette', 0), chip('gap', 'palette', 1));
        palette.dataset.empty = t('removeHere');
      }
      draw();
      refreshers.push(draw);
      wrap.append(palette);

      // Drag and drop (pointer events: in Steam's popup windows HTML5 drag images are unreliable)
      let drag = null;
      const where = (x, y) => {
        const target = doc.elementFromPoint(x, y);
        const list = target?.closest?.('.ane-zone-list');
        if (list) {
          const chips = [...list.querySelectorAll('.ane-chip:not(.is-dragging)')];
          let index = chips.length;
          for (let i = 0; i < chips.length; i++) {
            const r = chips[i].getBoundingClientRect();
            if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
              index = i;
              break;
            }
          }
          return { zone: list.dataset.zone, index, list };
        }
        if (target?.closest?.('.ane-palette')) return { zone: 'palette' };
        return null;
      };
      const move = (from, to) => {
        const zones = zonesNow();
        let item = from.item;
        if (from.zone !== 'palette') {
          item = zones[from.zone].splice(from.index, 1)[0];
          if (to.zone === from.zone && to.index > from.index) to.index--;
        }
        if (to.zone === 'palette') {
          if (KEYS.includes(item)) return; // a button can't be removed, only hidden
          commit(zones);
          return;
        }
        zones[to.zone].splice(Math.max(0, Math.min(to.index, zones[to.zone].length)), 0, item);
        commit(zones);
      };
      const onDown = (event) => {
        const node = event.target.closest('.ane-chip');
        if (!node || event.button !== 0) return;
        drag = { node, x: event.clientX, y: event.clientY, from: { item: node.dataset.item, zone: node.dataset.zone, index: Number(node.dataset.index) }, ghost: null, moved: false };
        node.setPointerCapture?.(event.pointerId);
      };
      const onMove = (event) => {
        if (!drag) return;
        if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
        if (!drag.moved) {
          drag.moved = true;
          const r = drag.node.getBoundingClientRect();
          drag.ghost = drag.node.cloneNode(true);
          drag.ghost.classList.add('ane-ghost');
          drag.ghost.style.width = `${r.width}px`;
          drag.dx = event.clientX - r.left;
          drag.dy = event.clientY - r.top;
          doc.body.append(drag.ghost);
          if (drag.from.zone !== 'palette') drag.node.classList.add('is-dragging');
          wrap.classList.add('is-dragging');
        }
        drag.ghost.style.left = `${event.clientX - drag.dx}px`;
        drag.ghost.style.top = `${event.clientY - drag.dy}px`;
        for (const n of wrap.querySelectorAll('.is-over')) n.classList.remove('is-over');
        const to = where(event.clientX, event.clientY);
        (to?.list || (to?.zone === 'palette' ? palette : null))?.classList.add('is-over');
      };
      const onUp = (event) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        d.ghost?.remove();
        d.node.classList.remove('is-dragging');
        wrap.classList.remove('is-dragging');
        for (const n of wrap.querySelectorAll('.is-over')) n.classList.remove('is-over');
        if (!d.moved) return;
        const to = where(event.clientX, event.clientY);
        if (to) move(d.from, to);
      };
      // Keys: arrows move the focused chip, Delete takes a separator or a gap away
      const onKey = (event) => {
        const node = event.target.closest?.('.ane-chip');
        if (!node || node.dataset.zone === 'palette') {
          if (node && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            move({ item: node.dataset.item, zone: 'palette' }, { zone: 'end', index: 0 });
          }
          return;
        }
        const from = { item: node.dataset.item, zone: node.dataset.zone, index: Number(node.dataset.index) };
        const order = ['start', 'center', 'end'];
        const zones = zonesNow();
        let to = null;
        if (event.key === 'ArrowLeft' && from.index > 0) to = { zone: from.zone, index: from.index - 1 };
        else if (event.key === 'ArrowRight' && from.index < zones[from.zone].length - 1) to = { zone: from.zone, index: from.index + 2 };
        else if (event.key === 'ArrowUp' && order.indexOf(from.zone) > 0) to = { zone: order[order.indexOf(from.zone) - 1], index: Infinity };
        else if (event.key === 'ArrowDown' && order.indexOf(from.zone) < 2) to = { zone: order[order.indexOf(from.zone) + 1], index: 0 };
        else if ((event.key === 'Delete' || event.key === 'Backspace') && !KEYS.includes(from.item)) to = { zone: 'palette' };
        if (!to) return;
        event.preventDefault();
        if (to.index === Infinity) to.index = zones[to.zone].length;
        move(from, to);
        // Focus follows the chip
        requestAnimationFrame(() => {
          const zone = to.zone === 'palette' ? null : to.zone;
          if (!zone) return;
          const z = zonesNow()[zone];
          const i = to.zone === from.zone && to.index > from.index ? to.index - 1 : Math.min(to.index, z.length - 1);
          board.querySelector(`.ane-zone-list[data-zone="${zone}"] .ane-chip[data-index="${i}"]`)?.focus();
        });
      };
      wrap.addEventListener('pointerdown', onDown);
      doc.addEventListener('pointermove', onMove);
      doc.addEventListener('pointerup', onUp);
      doc.addEventListener('pointercancel', onUp);
      wrap.addEventListener('keydown', onKey);
      cleanup(() => {
        doc.removeEventListener('pointermove', onMove);
        doc.removeEventListener('pointerup', onUp);
        doc.removeEventListener('pointercancel', onUp);
        drag?.ghost?.remove();
      });
      return wrap;
    }

    /* ---------- Presets ---------- */

    function presetsPage() {
      const out = [];
      const list = make('div', 'ane-presets');
      const status = make('p', 'ane-status');
      status.setAttribute('role', 'status');
      const say = (text, bad = false) => {
        status.textContent = text;
        status.classList.toggle('is-bad', bad);
      };
      function drawList() {
        list.replaceChildren();
        const all = nc.presets.list();
        const active = nc.presets.active();
        for (const group of [[t('builtIn'), all.filter((p) => p.builtIn)], [t('yours'), all.filter((p) => !p.builtIn)]]) {
          list.append(make('div', 'se-ts-eyebrow ane-presets-group', group[0]));
          if (!group[1].length) list.append(make('p', 'se-ts-hint', t('none')));
          for (const preset of group[1]) {
            const rowNode = make('div', 'ane-preset');
            rowNode.dataset.preset = preset.id;
            if (preset.id === active) rowNode.classList.add('is-active');
            const name = make('div', 'ane-preset-name', preset.name);
            const actions = make('div', 'ane-preset-actions');
            const act = (label, fn, cls = '') => {
              const node = button(`ane-link ${cls}`, label);
              node.dataset.act = cls || label;
              node.addEventListener('click', fn);
              actions.append(node);
              return node;
            };
            if (preset.id === active) actions.append(make('span', 'ane-pill', t('active')));
            act(t('apply'), () => nc.presets.apply(preset.id), 'apply');
            act(t('duplicate'), () => nc.presets.duplicate(preset.id), 'duplicate');
            if (!preset.builtIn) {
              if (preset.id === active) act(t('update'), () => nc.presets.update(preset.id), 'update');
              act(t('rename'), () => {
                const input = make('input', 'ane-input');
                input.value = preset.name;
                input.setAttribute('aria-label', t('name'));
                const ok = button('ane-button', t('saveBtn'));
                const done = () => nc.presets.rename(preset.id, input.value);
                ok.addEventListener('click', done);
                input.addEventListener('keydown', (e) => e.key === 'Enter' && done());
                name.replaceChildren(input, ok);
                input.focus();
                input.select();
              }, 'rename');
              act(t('del'), () => nc.presets.remove(preset.id), 'delete ane-danger');
            }
            rowNode.append(name, actions);
            list.append(rowNode);
          }
        }
      }
      drawList();
      refreshers.push(drawList);

      const saveBox = make('div', 'ane-inline');
      const saveName = make('input', 'ane-input');
      saveName.placeholder = t('name');
      saveName.setAttribute('aria-label', t('name'));
      const saveBtn = button('ane-button', t('saveBtn'));
      saveBtn.dataset.act = 'save';
      const doSave = () => {
        nc.presets.save(saveName.value.trim() || `${t('yours')} ${nc.presets.list().filter((x) => !x.builtIn).length + 1}`);
        saveName.value = '';
      };
      saveBtn.addEventListener('click', doSave);
      saveName.addEventListener('keydown', (e) => e.key === 'Enter' && doSave());
      saveBox.append(saveName, saveBtn);

      const exportBox = make('div', 'ane-json');
      const exportText = make('textarea', 'ane-textarea');
      exportText.readOnly = true;
      exportText.rows = 6;
      exportText.dataset.ane = 'export';
      const copyBtn = button('ane-button', t('copy'));
      copyBtn.addEventListener('click', () => {
        exportText.select();
        const text = exportText.value;
        const done = () => say(t('copied'));
        run(() => doc.execCommand('copy')) ? done() : run(() => navigator.clipboard.writeText(text).then(done));
      });
      refreshers.push(() => {
        exportText.value = nc.exportJSON();
      });
      exportBox.append(exportText, copyBtn);

      const importBox = make('div', 'ane-json');
      const importText = make('textarea', 'ane-textarea');
      importText.rows = 6;
      importText.dataset.ane = 'import';
      importText.placeholder = '{ "type": "aika-enhanced-navigation", … }';
      const importBtn = button('ane-button', t('importBtn'));
      importBtn.dataset.act = 'import';
      importBtn.addEventListener('click', () => {
        const result = nc.importJSON(importText.value);
        if (result.ok) {
          importText.value = '';
          say(t('imported'));
        } else say(result.error, true);
      });
      importBox.append(importText, importBtn);

      out.push(card(rowOf(t('presets'), null, list, 'archive', true)));
      out.push(card(rowOf(t('save'), null, saveBox, 'archive', true)));
      out.push(card(rowOf(t('exportT'), t('exportHint'), exportBox, 'external', true), rowOf(t('importT'), t('importHint'), importBox, 'install', true)));
      out.push(status);
      return out;
    }

    /* ---------- Putting it together ---------- */

    function rerender() {
      for (const node of catBar.querySelectorAll('[data-cat]')) node.setAttribute('aria-selected', String(node.dataset.cat === category));
      refreshers.length = 0;
      refreshers.push(drawPreview, () => {
        for (const node of editButtons) node.setAttribute('aria-checked', String(node.dataset.value === mode()));
      });
      body.replaceChildren(...(sections[category] || sections.general)());
      body.dataset.cat = category;
      refresh();
    }
    const off = nc.on(() => refresh());
    // The layout setting (Millennium's) or Steam's state changing: the preview follows
    const offSettings = settings.on(() => refresh());
    const offVisual = () => removeEventListener('aika-visual-setting', refresh);
    addEventListener('aika-visual-setting', refresh);
    const poll = setInterval(drawPreview, 2000);
    cleanup(() => {
      off();
      offSettings?.();
      offVisual();
      clearInterval(poll);
    });
    rerender();
    const root = make('div', 'ane');
    root.append(previewCard, catBar, body);
    return [root];
  }

  // A colour token's value (rgb()/hex) as #rrggbb, for a colour input
  function toHex(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color.match(/[\d.]+/g);
    probe.remove();
    if (!rgb) return '';
    return `#${rgb.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')}`;
  }

  settings.customTabs = { ...(settings.customTabs || {}), Navigation: tab };
  window.__aikaNavEditor = { tab, get category() { return category; }, set category(v) { category = v; } };
})(window.__se);
