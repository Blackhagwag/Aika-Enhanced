// friends-dock.js — the Friends Dock (Aika Enhanced): a friends column at the
// right edge of the library, collapsed to a rail of faces or expanded to a
// list with names and games. Imported by js/main.js (the main window only).
// The look is sections/friends-dock.css, built from Aika's own tokens.
//
// Where it comes from. The behaviour follows the Friends dock of Steam
// Enhanced by NVHT (MIT, see LICENSES/Steam-Enhanced-MIT.txt): its data pass
// over Steam's FriendStore (client/friends/dock/data.js, read()), its persona
// state table, the chat and profile actions (ui.js), the left-edge column that
// reserves its room beside the library (dock.js, place()) and the small-window
// fold (window-fold.js). Its markup, its embedding of Steam's own Friends &
// Chat tree and its look are not used: the dock here is Aika's — the left game
// list mirrored on the right.
//
// The data. Steam keeps the friends list in the Friends UI app of its shared
// context (g_FriendsUIApp, MobX stores): the real friends of the signed-in
// account, their persona state, the game and its rich presence, avatars and
// nicknames. No Web API key, no requests: the dock reads what the client
// already holds. SteamClient has no persona event, so a light poll compares a
// per-friend signature once a second while the dock is on screen and only
// the rows that changed are touched (no list rebuild, no innerHTML with
// friends' names).
//
// Settings ("Friends Dock" tab, skin.json): the option files
// options/fdock-*.css set --aika-fdock-* switches on the root, the sliders set
// --aika-setting-fdock-*; js/live-settings.js applies dropdown changes at
// once in an open window. The expanded / collapsed state and the open
// sections are kept in localStorage (it survives a Steam restart).
//
// Turned off (the setting, a store page, the mini "Steam Games List"
// window): the dock leaves the DOM and html[data-aika-fdock] goes, so the
// library's original layout comes back with no room left over.
import "./live-settings.js";

(() => {
  "use strict";
  if (window.__aikaFriendsDock) return;
  if (!document.body) return;

  const root = document.documentElement;

  // ---------------------------------------------------------------- helpers
  const run = (fn) => { try { return fn(); } catch { return undefined; } };

  // This window and the windows that opened it (the shared JS context holds
  // the Friends UI app; the main window is its popup).
  const owners = () => {
    const wins = [window];
    for (let i = 0; i < wins.length && wins.length < 6; i++) {
      for (const rel of ["opener", "parent"]) {
        const w = run(() => wins[i][rel]);
        if (w && !wins.includes(w)) wins.push(w);
      }
    }
    return wins;
  };
  const app = () => {
    for (const w of owners()) {
      const a = run(() => w.g_FriendsUIApp);
      if (a && run(() => a.FriendStore)) return a;
    }
    return null;
  };
  const mainWindow = () => {
    for (const w of owners()) {
      const m = run(() => w.SteamUIStore.WindowStore.MainWindowInstance);
      if (m) return m;
    }
    return null;
  };
  const steamURL = (url) => {
    for (const w of owners()) {
      const fn = run(() => w.SteamClient.URL.ExecuteSteamURL);
      if (typeof fn === "function") { run(() => w.SteamClient.URL.ExecuteSteamURL(url)); return true; }
    }
    return false;
  };
  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } },
  };
  const el = (tag, cls, attrs) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const setText = (n, t) => { if (n.textContent !== t) n.textContent = t; };
  const setAttr = (n, k, v) => {
    if (v == null || v === false) { if (n.hasAttribute(k)) n.removeAttribute(k); }
    else if (n.getAttribute(k) !== String(v)) n.setAttribute(k, String(v));
  };
  const initials = (name) => String(name || "").trim().split(/\s+/)
    .map((w) => [...w].find((ch) => /[\p{L}\p{N}]/u.test(ch))).filter(Boolean)
    .slice(0, 2).join("").toUpperCase() || "#";

  // ------------------------------------------------------------------- copy
  // English and Russian, by the Steam language (as js/settings-l10n.js)
  const lang = (() => {
    for (const w of owners()) {
      const l = run(() => new URLSearchParams(w.location.search).get("LANGUAGE"));
      if (l) return l;
    }
    return document.documentElement.lang || navigator.language || "";
  })();
  const RU = /^(russian|ru)/i.test(lang);
  const COPY = RU ? {
    title: "Друзья", ingame: "В игре", online: "В сети", offline: "Не в сети",
    away: "Отошёл", busy: "Не беспокоить", snooze: "Спит", inGame: "В игре",
    expand: "Развернуть друзей", collapse: "Свернуть друзей",
    message: "Отправить сообщение", profile: "Открыть профиль", viewGame: "Открыть игру в библиотеке",
    signedOut: "Друзья и чат не в сети", empty: "Сейчас никого нет в сети",
    countTip: (n) => `${n} в сети`,
    settings: "Настройки Aika Enhanced", steamChat: "Открыть в окне чата Steam",
    unread: (n) => `${n} непрочит.`,
    ago: (s) => s < 3600 ? `${Math.max(1, Math.round(s / 60))} мин. назад` : s < 86400 ? `${Math.round(s / 3600)} ч назад` :
      s < 172800 ? "вчера" : `${Math.round(s / 86400)} дн. назад`,
    lastOnline: (t) => `Был в сети ${t}`,
  } : {
    title: "Friends", ingame: "In game", online: "Online", offline: "Offline",
    away: "Away", busy: "Busy", snooze: "Snooze", inGame: "In game",
    expand: "Expand friends", collapse: "Collapse friends",
    message: "Send message", profile: "View profile", viewGame: "View game in Library",
    signedOut: "Friends & Chat is offline", empty: "No friends online right now",
    countTip: (n) => `${n} online`,
    settings: "Aika Enhanced settings", steamChat: "Open in a Steam chat window",
    unread: (n) => `${n} unread`,
    ago: (s) => s < 3600 ? `${Math.max(1, Math.round(s / 60))} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` :
      s < 172800 ? "yesterday" : `${Math.round(s / 86400)} days ago`,
    lastOnline: (t) => `Last online ${t}`,
  };

  // -------------------------------------------------------------- settings
  // Read off the root: the condition files and the sliders set them there;
  // js/live-settings.js overrides them inline while the editor is open.
  const SETTINGS_DEFAULT = {
    enabled: "1", start: "remember", hover: "0", ingame: "1", online: "1",
    offline: "0", bygame: "0", count: "1",
    // 2.0: where the dock shows, and the built-in chat
    library: "1", store: "1", community: "1", other: "1",
    chat: "1", popout: "1", unread: "1", alerts: "1", autoscroll: "1", keepchat: "1",
  };
  let cfg = { ...SETTINGS_DEFAULT };
  const readSettings = () => {
    const cs = getComputedStyle(root);
    const next = {};
    for (const k of Object.keys(SETTINGS_DEFAULT)) {
      next[k] = cs.getPropertyValue(`--aika-fdock-${k}`).trim().replace(/^["']|["']$/g, "") || SETTINGS_DEFAULT[k];
    }
    const changed = JSON.stringify(next) !== JSON.stringify(cfg);
    cfg = next;
    return changed;
  };
  const on = (k) => cfg[k] === "1";
  readSettings();

  // ------------------------------------------------------------------ state
  // Dock at startup: Last state (remember) / Expanded / Collapsed
  const saved = () => (store.get("aika-fdock-mode", "open") === "rail" ? "rail" : "open");
  let userMode = cfg.start === "open" ? "open" : cfg.start === "rail" ? "rail" : saved();
  if (cfg.start !== "remember") store.set("aika-fdock-mode", userMode);
  const closed = new Set(run(() => JSON.parse(store.get("aika-fdock-closed", '["offline"]'))) || ["offline"]);
  const closedGames = new Set();
  // Below this window width the dock folds to its rail (Steam Enhanced folds
  // at 1400 px; Aika's narrower header turns its menus into icons near here).
  const FOLD_AT = 1100;
  let held = false;   // the rail opened by hand on a small window, until it grows

  const state = { shown: false, mode: "", peek: false, first: true, destroyed: false, signature: "" };

  // ------------------------------------------------------------- the data
  // Steam's persona states (EPersonaState) → the dock's
  const PERSONA = { 0: "offline", 1: "online", 2: "busy", 3: "away", 4: "snooze", 5: "online", 6: "online", 7: "online" };
  const byName = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: "base" });

  // After Steam Enhanced's read() (client/friends/dock/data.js)
  // Unread messages by friend: Steam's friend chats (blocked friends aside), as Steam Enhanced's
  // read() takes them for its "Chats" rail section
  function unreadOf(a) {
    const out = new Map();
    for (const c of run(() => a.ChatStore.FriendChatStore.m_rgFriendChats) || []) {
      const n = run(() => (c.is_blocked_friend ? 0 : c.unread_message_count)) || 0;
      const id = run(() => c.m_unAccountIDFriend);
      if (n && id != null) out.set(String(id), n);
    }
    return out;
  }

  function read(a) {
    const list = run(() => a.FriendStore.all_friends) || [];
    const unread = unreadOf(a);
    const ingame = [], online = [], offline = [];
    const games = new Map();
    for (const f of list) {
      const p = run(() => f.persona);
      if (!p) continue;
      const id = run(() => f.accountid) ?? run(() => p.GetAccountID());
      if (id == null) continue;
      const item = {
        id: String(id),
        name: run(() => f.display_name) || run(() => p.m_strPlayerName) || "",
        avatar: run(() => p.avatar_url_medium) || run(() => p.avatar_url) || "",
        state: PERSONA[run(() => p.m_ePersonaState)] || "offline",
        last: run(() => p.last_seen_online) || 0,
        appid: 0, gameKey: "", game: "", icon: "", rp: "",
        unread: 0,
      };
      item.unread = unread.get(item.id) || 0;
      if (run(() => p.is_ingame)) {
        item.appid = run(() => p.m_unGamePlayedAppID) || 0;
        item.game = run(() => p.GetCurrentGameName()) || "";
        item.gameKey = item.appid ? `a${item.appid}` : `n${item.game}`;
        item.icon = run(() => p.GetCurrentGameIconURL()) || "";
        item.rp = run(() => p.GetCurrentGameRichPresence()) || "";
        item.state = "ingame";
        ingame.push(item);
        let g = games.get(item.gameKey);
        if (!g) games.set(item.gameKey, (g = { key: item.gameKey, appid: item.appid, name: item.game, icon: item.icon, friends: [] }));
        g.friends.push(item);
      } else if (run(() => p.is_online)) {
        online.push(item);
      } else {
        offline.push(item);
      }
    }
    ingame.sort(byName);
    const rank = { online: 0, away: 1, snooze: 2, busy: 3 };
    online.sort((x, y) => (rank[x.state] ?? 0) - (rank[y.state] ?? 0) || byName(x, y));
    offline.sort((x, y) => (y.last || 0) - (x.last || 0) || byName(x, y));
    const gameList = [...games.values()].sort((x, y) => y.friends.length - x.friends.length || x.name.localeCompare(y.name));
    for (const g of gameList) g.friends.sort(byName);
    let unreadTotal = 0;
    for (const n of unread.values()) unreadTotal += n;
    return { ingame, online, offline, games: gameList, unreadTotal };
  }

  // A friend's Steam object, by account id (for the actions)
  const findFriend = (a, id) => (run(() => a.FriendStore.all_friends) || []).find((f) => String(run(() => f.accountid)) === String(id));
  const steamId64 = (f, id) =>
    run(() => f.persona.m_steamid.ConvertTo64BitString()) ||
    run(() => f.persona.GetSteamIDAsString?.()) ||
    run(() => String(76561197960265728n + BigInt(id))) || "";

  // ---------------------------------------------------------------- actions
  // A chat in Steam's own chat window (Steam Enhanced's "Window" option): the
  // friend's OpenChatDialog, Steam's UIStore, then the steam:// protocol.
  function openSteamChat(id) {
    const a = app();
    const f = a && findFriend(a, id);
    if (!f) return;
    const ctx = run(() => a.GetDefaultBrowserContext());
    if (ctx && run(() => (f.OpenChatDialog(ctx), true))) return;
    if (ctx && run(() => (a.UIStore.ShowFriendChatDialog(ctx, Number(id), true), true))) return;
    const sid = steamId64(f, id);
    if (sid) steamURL(`steam://friends/message/${sid}`);
  }

  // A click on a friend: the chat in the dock (Steam Enhanced's chat engine,
  // vendor/steam-enhanced/client/friends/dock/aika-main.js) — "Built-in chat" —
  // else, or when it cannot open there, Steam's window.
  const chatEngine = () => window.__aikaFdockChat;
  function openChat(id) {
    if (on("chat") && chatEngine()?.open(id)) { chatChanged(); return; }
    openSteamChat(id);
  }

  // Asked for by hand: Steam's window, the dock letting the chat go first
  function openInSteamWindow(id) {
    const se = window.__seFriendsDock;
    if (se?.openWindow) se.openWindow(() => openSteamChat(id));
    else openSteamChat(id);
    store.set("aika-fdock-chat", "");
  }

  function openProfile(id) {
    const a = app();
    const f = a && findFriend(a, id);
    const url = run(() => f.persona.GetCommunityProfileURL?.()) ||
      `https://steamcommunity.com/profiles/${steamId64(f, id)}/`;
    steamURL(`steam://openurl/${url}`);
  }

  function openGame(appid) {
    const m = mainWindow();
    if (m && run(() => (m.Navigate(`/library/app/${appid}`), true))) return;
    steamURL(`steam://nav/games/details/${appid}`);
  }

  // -------------------------------------------------------------- the DOM
  // Shared with the Steam Enhanced chat engine (vendor/steam-enhanced/client/friends/dock/
  // aika-dock.js): whichever runs first creates it; Steam's chat tree lives in it, hidden
  const dock = (window.__aikaFdockElement ||= document.createElement("aside"));
  dock.classList.add("aika-fdock");
  dock.setAttribute("aria-label", COPY.title);
  const head = el("div", "aika-fdock__head");
  const toggle = el("button", "aika-fdock__toggle", { type: "button" });
  toggle.append(el("span", "aika-fdock__toggle-icon", { "aria-hidden": "true" }));
  const title = el("span", "aika-fdock__title");
  title.textContent = COPY.title;
  const total = el("span", "aika-fdock__count");
  // The theme's settings window (Steam Enhanced's, with Aika's settings): shown once it is there
  const gear = el("button", "aika-fdock__gear", { type: "button", "aria-label": COPY.settings });
  gear.append(el("span", "aika-fdock__gear-icon", { "aria-hidden": "true" }));
  gear.hidden = true;
  gear.dataset.tipName = COPY.settings;
  head.append(toggle, title, total, gear);
  const scroll = el("div", "aika-fdock__scroll");
  const note = el("div", "aika-fdock__note");
  note.hidden = true;
  dock.append(head, scroll);

  const SECTIONS = ["ingame", "online", "offline"];
  const sections = {};
  for (const key of SECTIONS) {
    const sec = el("section", "aika-fdock__sec", { "data-sec": key });
    const sh = el("button", "aika-fdock__sec-head", { type: "button", "data-section": key });
    const chev = el("span", "aika-fdock__chev", { "aria-hidden": "true" });
    const label = el("span", "aika-fdock__label");
    label.textContent = COPY[key];
    const count = el("span", "aika-fdock__sec-count");
    const line = el("span", "aika-fdock__line", { "aria-hidden": "true" });
    sh.append(label, count, line, chev);
    const body = el("div", "aika-fdock__list", { role: "list" });
    sec.append(sh, body);
    sec.hidden = true;
    scroll.append(sec);
    sections[key] = { sec, head: sh, count, body };
  }
  scroll.append(note);

  const tip = el("div", "aika-fdock-tip", { role: "tooltip" });
  const tipName = el("div", "aika-fdock-tip__name");
  const tipSub = el("div", "aika-fdock-tip__sub");
  tip.append(tipName, tipSub);

  // The face: Steam's avatar, the initials under it when the picture fails
  function avatarNode() {
    const av = el("span", "aika-fdock__av");
    const ini = el("span", "aika-fdock__ini", { "aria-hidden": "true" });
    const img = el("img", "", { alt: "", draggable: "false", decoding: "async", loading: "lazy" });
    // Unread messages: a count on the face ("Unread badges")
    const badge = el("span", "aika-fdock__unread", { "aria-hidden": "true" });
    badge.hidden = true;
    av.append(ini, img, badge);
    return av;
  }

  const rows = new Map();    // account id → row
  const gameNodes = new Map(); // game key → group

  function friendRow(f) {
    let row = rows.get(f.id);
    if (!row) {
      row = el("div", "aika-fdock__row", { role: "button", tabindex: "0", "data-friend": f.id });
      const av = avatarNode();
      const text = el("span", "aika-fdock__text");
      text.append(el("span", "aika-fdock__name"), el("span", "aika-fdock__sub"));
      row.append(av, text);
      row._sig = "";
      rows.set(f.id, row);
      if (!state.first) row.classList.add("is-new");
    }
    return row;
  }

  function updateRow(row, f, sub) {
    const unread = on("unread") ? f.unread : 0;
    const sig = [f.name, f.avatar, f.state, f.game, sub, unread].join("\u0001");
    if (row._sig === sig) return;
    row._sig = sig;
    setAttr(row, "data-state", f.state);
    const av = row.firstChild;
    setAttr(av, "data-state", f.state);
    const img = av.children[1];
    const badge = av.lastChild;
    badge.hidden = !unread;
    setText(badge, unread > 99 ? "99+" : String(unread || ""));
    setAttr(row, "data-unread", unread ? String(unread) : null);
    // A new message (more unread than last time): the badge pulses once ("Message alerts")
    if (unread > (row._unread || 0) && !state.first && on("alerts")) {
      badge.classList.remove("is-alert");
      void badge.offsetWidth;
      badge.classList.add("is-alert");
    }
    row._unread = unread;
    setText(av.firstChild, initials(f.name));
    if (f.avatar && img.getAttribute("src") !== f.avatar) {
      img.hidden = false;
      img.src = f.avatar;
    } else if (!f.avatar) {
      img.removeAttribute("src");
      img.hidden = true;
    }
    const [name, subNode] = row.lastChild.children;
    setText(name, f.name);
    setText(subNode, sub);
    setAttr(subNode, "data-state", f.state);
    row.dataset.tipName = f.name;
    row.dataset.tipSub = (f.state === "ingame" ? (f.game || COPY.inGame) : sub) + (unread ? ` · ${COPY.unread(unread)}` : "");
    setAttr(row, "data-appid", f.appid || null);
    setAttr(row, "aria-label", `${f.name}, ${row.dataset.tipSub}`);
    if (tip.dataset.for === f.id) showTip(row);
  }

  function gameGroup(g) {
    let node = gameNodes.get(g.key);
    if (!node) {
      node = el("div", "aika-fdock__game", { "data-game": g.key, role: "group" });
      const gh = el("button", "aika-fdock__game-head", { type: "button", "data-game-head": g.key });
      const icon = el("span", "aika-fdock__game-icon", { "aria-hidden": "true" });
      icon.append(el("img", "", { alt: "", draggable: "false", decoding: "async" }));
      const name = el("span", "aika-fdock__game-name");
      const count = el("span", "aika-fdock__sec-count");
      const chev = el("span", "aika-fdock__chev", { "aria-hidden": "true" });
      gh.append(icon, name, count, chev);
      node.append(gh, el("div", "aika-fdock__list", { role: "list" }));
      node._sig = "";
      gameNodes.set(g.key, node);
      if (!state.first) node.classList.add("is-new");
    }
    const sig = [g.name, g.icon, g.friends.length].join("\u0001");
    if (node._sig !== sig) {
      node._sig = sig;
      const [icon, name, count] = node.firstChild.children;
      const img = icon.firstChild;
      if (g.icon && img.getAttribute("src") !== g.icon) { img.hidden = false; img.src = g.icon; }
      if (!g.icon) { img.removeAttribute("src"); img.hidden = true; }
      setText(name, g.name || COPY.inGame);
      setText(count, String(g.friends.length));
      node.firstChild.dataset.tipName = g.name || COPY.inGame;
      node.firstChild.dataset.tipSub = `${g.friends.length}`;
    }
    const open = !closedGames.has(g.key);
    setAttr(node, "data-closed", open ? null : "");
    setAttr(node.firstChild, "aria-expanded", String(open));
    return node;
  }

  // Puts `nodes` into `host` in this order, moving only what is out of place
  function reconcile(host, nodes) {
    let cur = host.firstChild;
    for (const n of nodes) {
      if (n === cur) { cur = cur.nextSibling; continue; }
      host.insertBefore(n, cur);
    }
    while (cur) { const next = cur.nextSibling; cur.remove(); cur = next; }
  }

  // Offline: when they were last seen (Steam Enhanced's "Last online …")
  const statusText = (f) => f.state === "offline" && f.last
    ? COPY.lastOnline(COPY.ago(Math.max(0, Date.now() / 1000 - f.last)))
    : COPY[f.state] || COPY.online;

  function render() {
    const a = app();
    if (!a) return;
    const d = read(a);
    const signed = run(() => a.FriendStore.self.persona.m_ePersonaState) !== 0 || d.ingame.length + d.online.length > 0;
    const show = { ingame: on("ingame"), online: on("online"), offline: on("offline") };
    const counts = { ingame: d.ingame.length, online: d.online.length, offline: d.offline.length };
    const live = d.ingame.length + d.online.length;
    const sig = JSON.stringify([cfg, [...closed], [...closedGames], d]);
    if (sig === state.signature) return;
    state.signature = sig;

    for (const key of SECTIONS) {
      const s = sections[key];
      const visible = show[key] && counts[key] > 0;
      s.sec.hidden = !visible;
      const isOpen = !closed.has(key);
      setAttr(s.sec, "data-closed", isOpen ? null : "");
      setAttr(s.head, "aria-expanded", String(isOpen));
      setText(s.count, String(counts[key]));
      if (!visible || !isOpen) { reconcile(s.body, []); continue; }
      if (key === "ingame" && on("bygame")) {
        const groups = d.games.map((g) => {
          const node = gameGroup(g);
          const list = node.lastChild;
          if (closedGames.has(g.key)) reconcile(list, []);
          else reconcile(list, g.friends.map((f) => {
            const row = friendRow(f);
            updateRow(row, f, f.rp || g.name || COPY.inGame);
            return row;
          }));
          return node;
        });
        reconcile(s.body, groups);
      } else {
        const items = d[key];
        reconcile(s.body, items.map((f) => {
          const row = friendRow(f);
          updateRow(row, f, f.state === "ingame" ? (f.game || COPY.inGame) : statusText(f));
          return row;
        }));
      }
    }
    setText(total, String(live));
    total.hidden = !on("count");
    for (const key of SECTIONS) sections[key].count.hidden = !on("count");
    toggle.dataset.tipName = COPY.title;
    toggle.dataset.tipSub = COPY.countTip(live);

    const nothing = SECTIONS.every((k) => sections[k].sec.hidden);
    note.hidden = !nothing;
    setText(note, signed ? COPY.empty : COPY.signedOut);

    // Rows that left every list: forget them (no detached nodes kept)
    for (const [id, row] of rows) if (!row.isConnected) rows.delete(id);
    for (const [key, node] of gameNodes) if (!node.isConnected) gameNodes.delete(key);
    if (tip.dataset.for && !dock.querySelector(`[data-friend="${CSS.escape(tip.dataset.for)}"]`)) hideTip();
    markCurrent();
    state.first = false;
  }

  // The friend whose chat is open in the dock: the game list's selected row (components/nav.css)
  let currentRow = null;
  function markCurrent() {
    const engine = chatEngine();
    const id = engine?.showing && !engine.minimized ? engine.active : null;
    const row = id ? rows.get(String(id)) || null : null;
    if (row === currentRow) return;
    currentRow?.removeAttribute("aria-current");
    currentRow = row;
    row?.setAttribute("aria-current", "true");
  }

  // The chat engine reports a change (opened, closed, minimized, another friend)
  function chatChanged() {
    chatEngine()?.changed?.();
    markCurrent();
    if (chatEngine()?.showing && state.peek) setPeek(false);
  }

  // ------------------------------------------------------------- placement
  // Where the main window is. The library is the window's own DOM; Store, Community and the
  // other web pages are a native browser view inside the content frame (.ContentFrame), which
  // Steam keeps the size of that frame — so narrowing the frame (sections/friends-dock.css)
  // makes room beside the page for the dock, as Steam Enhanced does. One dock, one state, for
  // every page.
  const libraryNode = () => document.querySelector(".Library");
  const frameNode = () => document.querySelector(".OuterFrame > .ContentFrame") || document.querySelector(".ContentFrame");
  const visible = (n) => !!n && (n.checkVisibility ? n.checkVisibility() : n.getClientRects().length > 0);
  const browserURL = () => {
    for (const w of owners()) {
      const m = run(() => w.MainWindowBrowserManager);
      const u = run(() => m.m_URL) || run(() => m.m_URLRequested);
      if (u) return String(u);
    }
    return "";
  };
  // "library" | "store" | "community" | "other" | "" (nowhere to show: the mini Games List)
  const browserKind = () => {
    const host = run(() => new URL(browserURL()).hostname) || "";
    if (/(^|\.)store\.steampowered\.com$/i.test(host)) return "store";
    if (/(^|\.)steamcommunity\.com$/i.test(host)) return "community";   // profiles, workshop, inventory, market
    return "other";
  };
  function pageKind() {
    if (/^Steam Games List$/.test(document.title)) return "";
    const path = run(() => mainWindow()?.LocationPathName);
    if (typeof path === "string" && path) {
      if (/^\/library\b/.test(path)) return visible(libraryNode()) ? "library" : "";
      if (!visible(frameNode())) return "";
      return /^\/(?:browser|store|community)(?:\/|$)/i.test(path) ? browserKind() : "other";
    }
    if (visible(libraryNode())) return "library";
    return visible(frameNode()) && browserURL() ? browserKind() : "";
  }
  let kind = "";

  const effectiveMode = () => {
    if (innerWidth < FOLD_AT) return held ? "open" : "rail";
    return userMode;
  };

  let topPx = -1;
  let savedScroll = 0;
  function place() {
    if (state.destroyed) return;
    const was = kind;
    kind = pageKind();
    const show = on("enabled") && !!app() && !!kind && on(kind);
    // "Keep the open chat" off: a page change closes it
    if (was && kind !== was && !on("keepchat")) chatEngine()?.close();
    if (show !== state.shown) {
      state.shown = show;
      if (show) {
        // Arriving on the library (startup, back from the store): the dock and
        // the library's room are simply there — only a change made on the
        // library itself (the toggle, the setting, the window size) moves.
        root.dataset.aikaFdockInstant = "";
        requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.aikaFdockInstant));
        document.body.append(dock);
        document.body.append(tip);
        // the list where it was (a removed element loses its scroll position)
        scroll.scrollTop = savedScroll;
        state.signature = "";
      } else {
        hideTip(); hideMenu(); setPeek(false);
        savedScroll = scroll.scrollTop;
        dock.remove(); tip.remove();
        delete root.dataset.aikaFdock;
        root.style.removeProperty("--aika-fdock-top");
        topPx = -1;
        return;
      }
    }
    if (!show) return;
    const mode = effectiveMode();
    if (mode !== state.mode) {
      state.mode = mode;
      dock.dataset.mode = mode;
      if (mode === "open") setPeek(false);
      toggle.setAttribute("aria-label", mode === "open" ? COPY.collapse : COPY.expand);
      toggle.setAttribute("aria-expanded", String(mode === "open"));
      hideTip();
    }
    if (root.dataset.aikaFdock !== mode) root.dataset.aikaFdock = mode;
    // The dock starts where the content starts (under the header, whatever its height)
    const frame = frameNode() || libraryNode();
    const top = frame ? Math.max(0, Math.round(frame.getBoundingClientRect().top)) : topPx;
    if (top !== topPx) {
      topPx = top;
      root.style.setProperty("--aika-fdock-top", `${top}px`);
    }
  }

  function setMode(m) {
    // "Keep the open chat" off: folding the dock closes it
    if (m !== state.mode && !on("keepchat")) chatEngine()?.close();
    if (innerWidth < FOLD_AT) held = m === "open";
    else { userMode = m; store.set("aika-fdock-mode", m); }
    place();
  }

  // ------------------------------------------------------- hover peek (rail)
  let peekTimer = 0;
  function setPeek(v) {
    clearTimeout(peekTimer);
    if (state.peek === v) return;
    state.peek = v;
    setAttr(dock, "data-peek", v ? "" : null);
    if (v) hideTip();
  }
  dock.addEventListener("pointerenter", () => {
    if (state.mode !== "rail" || !on("hover")) return;
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => setPeek(true), 250);
  });
  dock.addEventListener("pointerleave", () => {
    clearTimeout(peekTimer);
    if (!state.peek) return;
    peekTimer = setTimeout(() => { if (!menu) setPeek(false); }, 300);
  });

  // ------------------------------------------------- over a browser page
  // A Store or Community page is a native browser view over the main window:
  // nothing in the window's DOM draws above it. The tooltip and the menu then
  // go into one of Steam's popup windows (Steam Enhanced's popup layer,
  // vendor/steam-enhanced/client/shared/popup-layer*.js), with Aika's styles
  // (client/friends/aika-foundation.css). On the library they stay in the page.
  const SE = () => window.__se;
  const overBrowser = () => run(() => SE()?.browserShown?.()) ?? (kind === "store" || kind === "community");
  const LAYER_SHEETS = ["client/friends/aika-foundation.css"];
  function layerShow(panel, at, node) {
    panel.show(at, (container) => {
      container.append(node);
    });
  }

  // --------------------------------------------------------------- tooltip
  // In the rail only (open, the names are there): the name and the game, at
  // the left of the face, in the look of Steam's tooltips under Aika.
  let tipTimer = 0;
  let tipPanel = null;
  function showTip(target) {
    if (overBrowser() && SE()?.layer) return showTipLayer(target);
    tipPanel?.release();
    tipPanel = null;
    const name = target.dataset.tipName;
    if (!name) return hideTip();
    setText(tipName, name);
    setText(tipSub, target.dataset.tipSub || "");
    tipSub.hidden = !target.dataset.tipSub;
    setAttr(tipSub, "data-state", target.dataset.state || target.closest("[data-state]")?.dataset.state || null);
    tip.dataset.for = target.dataset.friend || "";
    const r = target.getBoundingClientRect();
    tip.classList.add("is-on");
    const h = tip.offsetHeight;
    const gap = 8;
    const top = Math.max(gap, Math.min(innerHeight - h - gap, r.top + r.height / 2 - h / 2));
    tip.style.top = `${Math.round(top)}px`;
    tip.style.right = `${Math.round(innerWidth - dock.getBoundingClientRect().left + gap)}px`;
  }
  function fillTip(target) {
    setText(tipName, target.dataset.tipName);
    setText(tipSub, target.dataset.tipSub || "");
    tipSub.hidden = !target.dataset.tipSub;
    setAttr(tipSub, "data-state", target.dataset.state || target.closest("[data-state]")?.dataset.state || null);
    tip.dataset.for = target.dataset.friend || "";
  }
  function showTipLayer(target) {
    if (!target.dataset.tipName) return hideTip();
    fillTip(target);
    if (!tipPanel || tipPanel.released) tipPanel = SE().layer.panel({ sheets: LAYER_SHEETS });
    if (!tipPanel) return undefined;
    const node = tip.cloneNode(true);
    node.classList.add("is-on", "is-layered");
    const r = target.getBoundingClientRect();
    const right = dock.getBoundingClientRect().left - 8;
    layerShow(tipPanel, (w, h) => ({ left: right - w, top: r.top + r.height / 2 - h / 2 }), node);
    return undefined;
  }
  function hideTip() {
    clearTimeout(tipTimer);
    tip.classList.remove("is-on");
    delete tip.dataset.for;
    tipPanel?.release();
    tipPanel = null;
  }
  const tipTarget = (e) => (ours(e.target) ? e.target.closest?.("[data-friend], [data-game-head], .aika-fdock__toggle, .aika-fdock__gear") : null);
  dock.addEventListener("mouseover", (e) => {
    const t = tipTarget(e);
    if (!t || state.mode !== "rail" || state.peek) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(t), tip.classList.contains("is-on") ? 0 : 300);
  });
  dock.addEventListener("mouseout", (e) => {
    const t = tipTarget(e);
    if (t && !t.contains(e.relatedTarget)) hideTip();
  });

  // ------------------------------------------------------------------ menu
  // A friend's menu in Aika's menu look (.aika-menu, components/menu.css):
  // the chat, the profile, the game in the library.
  let menu = null;
  let menuPanel = null;
  function hideMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    menuPanel?.release();
    menuPanel = null;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onMenuKey, true);
    window.removeEventListener("blur", hideMenu);
    if (state.peek && !dock.matches(":hover")) setPeek(false);
  }
  function onOutside(e) { if (menu && !menu.contains(e.target)) hideMenu(); }
  function onMenuKey(e) {
    if (!menu) return;
    const items = [...menu.querySelectorAll(".aika-menu__item")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); hideMenu(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  }
  function showMenu(row, x, y) {
    hideMenu();
    hideTip();
    const id = row.dataset.friend;
    const appid = Number(row.dataset.appid) || 0;
    const items = [
      [COPY.message, () => openChat(id)],
      [COPY.profile, () => openProfile(id)],
    ];
    // The chat opens in the dock: Steam's own window stays one choice away
    if (on("chat") && chatEngine()) items.push([COPY.steamChat, () => openInSteamWindow(id)]);
    if (appid) items.push(null, [COPY.viewGame, () => openGame(appid)]);
    menu = el("div", "aika-menu aika-fdock-menu", { role: "menu" });
    items.forEach((it, i) => {
      if (!it) { menu.append(el("div", "aika-menu__separator", { role: "separator" })); return; }
      const b = el("button", "aika-menu__item", { type: "button", role: "menuitem" });
      b.style.setProperty("--aika-menu-i", String(i));
      b.textContent = it[0];
      b.addEventListener("click", () => { hideMenu(); it[1](); });
      menu.append(b);
    });
    if (overBrowser() && SE()?.layer && (menuPanel = SE().layer.panel({ sheets: LAYER_SHEETS }))) {
      // In a popup window over the page; the main window's presses and keys still close it
      menu.classList.add("is-layered");
      layerShow(menuPanel, (w, h) => ({ left: Math.min(x, innerWidth - w - 8), top: Math.min(y, innerHeight - h - 8) }), menu);
      document.addEventListener("pointerdown", onOutside, true);
      document.addEventListener("keydown", onMenuKey, true);
      return;
    }
    document.body.append(menu);
    const w = menu.offsetWidth, h = menu.offsetHeight, m = 8;
    menu.style.left = `${Math.round(Math.max(m, Math.min(x, innerWidth - w - m)))}px`;
    menu.style.top = `${Math.round(Math.max(m, Math.min(y, innerHeight - h - m)))}px`;
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onMenuKey, true);
    window.addEventListener("blur", hideMenu);
    if (!row.matches(":hover")) menu.querySelector(".aika-menu__item")?.focus();
  }

  // ---------------------------------------------------------------- events
  // Only the dock's own parts: the chat engine's (Steam's chat tree, its buttons) live in the
  // same <aside> and keep their own clicks, menus and keys
  const ours = (t) => head.contains(t) || scroll.contains(t);
  function onClick(e) {
    const t = e.target;
    if (!ours(t)) return;
    if (t.closest(".aika-fdock__toggle")) { setMode(state.mode === "open" ? "rail" : "open"); return; }
    if (t.closest(".aika-fdock__gear")) { hideTip(); window.__seThemeSettings?.open(); return; }
    const sh = t.closest("[data-section]");
    if (sh) {
      const k = sh.dataset.section;
      if (closed.has(k)) closed.delete(k); else closed.add(k);
      store.set("aika-fdock-closed", JSON.stringify([...closed]));
      render();
      return;
    }
    const gh = t.closest("[data-game-head]");
    if (gh) {
      const k = gh.dataset.gameHead;
      if (closedGames.has(k)) closedGames.delete(k); else closedGames.add(k);
      render();
      return;
    }
    const row = t.closest("[data-friend]");
    if (row) { hideTip(); openChat(row.dataset.friend); }
  }
  function onContext(e) {
    if (!ours(e.target)) return;
    const row = e.target.closest("[data-friend]");
    e.preventDefault();
    if (!row) return;
    const r = row.getBoundingClientRect();
    const fromKey = e.clientX === 0 && e.clientY === 0;
    showMenu(row, fromKey ? r.left : e.clientX, fromKey ? r.bottom : e.clientY);
  }
  function onKey(e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-friend]")) {
      e.preventDefault();
      e.target.click();
    }
  }
  // A face that failed to load: its initials stay under it
  function onError(e) {
    if (e.target.tagName === "IMG" && ours(e.target)) e.target.hidden = true;
  }
  function onAnimEnd(e) {
    if (e.target.classList?.contains("is-new")) e.target.classList.remove("is-new");
  }
  function onScroll() { hideTip(); hideMenu(); }

  dock.addEventListener("click", onClick);
  dock.addEventListener("contextmenu", onContext);
  dock.addEventListener("keydown", onKey);
  dock.addEventListener("error", onError, true);
  dock.addEventListener("animationend", onAnimEnd);
  scroll.addEventListener("scroll", onScroll, { passive: true });

  // ----------------------------------------------------------------- timing
  // One timer: placement once a second (a querySelector and one rect read),
  // the friends pass each second while the dock is on screen, nothing while
  // the window is hidden. Settings are re-read when the live bridge tells or
  // every few seconds (a condition file arriving on a restart).
  let timer = 0, ticks = 0, frame = 0;
  function tick() {
    timer = 0;
    if (state.destroyed || document.visibilityState === "hidden") return;
    if (++ticks % 5 === 0 && readSettings()) state.signature = "";
    place();
    if (state.shown) {
      const a = app();
      if (a && run(() => a.CMInterface.BIsConnected?.()) && !(run(() => a.FriendStore.all_friends.length) > 0)) {
        run(() => a.FriendStore.EnsureFriendsListLoaded?.(false));
      }
      render();
      const noGear = !(window.__seThemeSettings && window.__aikaSettings?.ready);
      if (gear.hidden !== noGear) gear.hidden = noGear;
      restoreChat();
    }
    timer = setTimeout(tick, 1000);
  }

  // "Keep the open chat": the conversation open when Steam last closed comes back, minimized to
  // its chip, once the dock, the friends and the chat engine are all there (once a session)
  let restored = false;
  function restoreChat() {
    if (restored || !chatEngine() || !on("chat")) return;
    const a = app();
    if (!(run(() => a.FriendStore.all_friends.length) > 0)) return;
    restored = true;
    const id = store.get("aika-fdock-chat", "");
    if (!id || !on("keepchat") || !findFriend(a, id)) return;
    if (chatEngine().open(id)) chatEngine().minimize();
    chatChanged();
  }
  const wake = () => {
    if (state.destroyed || document.visibilityState === "hidden") return;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      place();
      if (state.shown) render();
      if (!timer) timer = setTimeout(tick, 1000);
    });
  };
  const onResize = () => {
    if (innerWidth >= FOLD_AT) held = false;
    hideTip(); hideMenu();
    wake();
  };
  const onSetting = () => { readSettings(); state.signature = ""; wake(); };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") { clearTimeout(timer); timer = 0; hideTip(); hideMenu(); }
    else wake();
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("focus", wake);
  window.addEventListener("aika-visual-setting", onSetting);
  document.addEventListener("visibilitychange", onVisibility);
  // Steam's navigation clicks (a tab, a game in the list): place at once, not a second later
  const onNav = () => setTimeout(wake, 50);
  document.addEventListener("click", onNav, true);
  tick();

  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    clearTimeout(timer); clearTimeout(tipTimer); clearTimeout(peekTimer);
    if (frame) cancelAnimationFrame(frame);
    hideMenu();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("focus", wake);
    window.removeEventListener("aika-visual-setting", onSetting);
    window.removeEventListener("pagehide", destroy);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("click", onNav, true);
    dock.removeEventListener("click", onClick);
    dock.removeEventListener("contextmenu", onContext);
    dock.removeEventListener("keydown", onKey);
    dock.removeEventListener("error", onError, true);
    dock.removeEventListener("animationend", onAnimEnd);
    scroll.removeEventListener("scroll", onScroll);
    dock.remove(); tip.remove();
    tipPanel?.release();
    // the shared <aside> stays for the chat engine; the dock's own parts go
    head.remove(); scroll.remove();
    rows.clear(); gameNodes.clear();
    delete root.dataset.aikaFdock;
    root.style.removeProperty("--aika-fdock-top");
    delete window.__aikaFriendsDock;
  }
  window.addEventListener("pagehide", destroy);

  window.__aikaFriendsDock = {
    destroy,
    element: dock,
    get mode() { return state.mode; },
    get shown() { return state.shown; },
    get page() { return kind; },
    toggle: () => setMode(state.mode === "open" ? "rail" : "open"),
    refresh: () => { state.signature = ""; readSettings(); wake(); },
    // For the Steam Enhanced chat engine (vendor/steam-enhanced/client/friends/dock/aika-*.js)
    chatEnabled: () => on("chat"),
    setting: (name) => cfg[name],
    chatChanged,
    chatReady: () => { wake(); },
  };
})();
