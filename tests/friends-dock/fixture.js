// TEST FIXTURE ONLY — never loaded by the theme (skin.json does not list it).
// A stand-in for the parts of Steam's Friends UI app that js/friends-dock.js
// reads (g_FriendsUIApp.FriendStore and friends), the main window's route and
// SteamClient.URL, so the dock can be exercised in a plain browser. The theme
// itself always reads the real FriendStore of the signed-in Steam account.
const svgFace = (hue, letter) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue} 45% 52%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360} 50% 30%)'/></linearGradient></defs>` +
    `<rect width='64' height='64' fill='url(#g)'/><circle cx='32' cy='26' r='12' fill='rgba(255,255,255,.55)'/>` +
    `<path d='M12 60c3-14 12-20 20-20s17 6 20 20z' fill='rgba(255,255,255,.55)'/></svg>`);
const svgIcon = (hue) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='hsl(${hue} 55% 38%)'/>` +
    `<path d='M8 22l8-12 8 12z' fill='rgba(255,255,255,.7)'/></svg>`);

const GAMES = {
  730: { name: "Counter-Strike 2", icon: svgIcon(30) },
  570: { name: "Dota 2", icon: svgIcon(0) },
  1086940: { name: "Baldur's Gate 3", icon: svgIcon(280) },
  892970: { name: "Valheim", icon: svgIcon(140) },
};

export const calls = [];

function persona(o) {
  return {
    m_ePersonaState: o.state,
    get is_online() { return this.m_ePersonaState !== 0; },
    get is_ingame() { return !!this.m_unGamePlayedAppID || !!this.m_strGameName; },
    m_unGamePlayedAppID: o.appid || 0,
    m_strGameName: o.gameName || "",
    m_strPlayerName: o.name,
    avatar_url_medium: o.avatar === undefined ? svgFace(o.hue, o.name[0]) : o.avatar,
    last_seen_online: o.last || 0,
    rp: o.rp || "",
    m_steamid: { ConvertTo64BitString: () => String(76561197960265728n + BigInt(o.id)) },
    GetCurrentGameName() { return GAMES[this.m_unGamePlayedAppID]?.name || this.m_strGameName; },
    GetCurrentGameIconURL() { return GAMES[this.m_unGamePlayedAppID]?.icon || ""; },
    GetCurrentGameRichPresence() { return this.rp; },
  };
}

function friend(o) {
  return {
    accountid: o.id,
    display_name: o.name,
    persona: persona(o),
    OpenChatDialog(ctx) { calls.push(["chat", o.id, ctx]); },
  };
}

const now = Math.floor(Date.now() / 1000);
export const friends = [
  friend({ id: 101, name: "Mirelle", state: 1, hue: 260, appid: 730, rp: "Competitive · Mirage 9–7" }),
  friend({ id: 102, name: "kotofey", state: 1, hue: 20, appid: 730, rp: "Premier · Ancient" }),
  friend({ id: 103, name: "Aster Vale", state: 1, hue: 200, appid: 1086940, rp: "Act II · Moonrise Towers" }),
  friend({ id: 104, name: "Nox", state: 3, hue: 320, appid: 570, rp: "Ranked · Hero selection" }),
  friend({ id: 105, name: "Сергей Петров", state: 1, hue: 100, appid: 892970, rp: "" }),
  friend({ id: 106, name: "lumen", state: 1, hue: 50 }),
  friend({ id: 107, name: "Hana", state: 3, hue: 330 }),
  friend({ id: 108, name: "Ivory Wren with a very long display name", state: 4, hue: 180 }),
  friend({ id: 109, name: "Dmitri", state: 1, hue: 220, avatar: "" }),
  friend({ id: 110, name: "Pip", state: 2, hue: 0 }),
  friend({ id: 111, name: "Old Friend", state: 0, hue: 90, last: now - 3600 }),
  friend({ id: 112, name: "Rarely Here", state: 0, hue: 150, last: now - 86400 * 9 }),
];

// Steam's friend chats: unread counts by friend (ChatStore.FriendChatStore)
export const chats = [
  { m_unAccountIDFriend: 102, unread_message_count: 3, is_blocked_friend: false, time_last_message: now - 60 },
  { m_unAccountIDFriend: 107, unread_message_count: 1, is_blocked_friend: false, time_last_message: now - 600 },
];

export const app = {
  ChatStore: { FriendChatStore: { m_rgFriendChats: chats } },
  FriendStore: {
    all_friends: friends,
    self: {
      display_name: "Nikita",
      persona: { m_ePersonaState: 1, m_strPlayerName: "Nikita", get is_ingame() { return !!this.m_unGamePlayedAppID; }, m_unGamePlayedAppID: 0 },
    },
    EnsureFriendsListLoaded() {},
    dnd: false,
    SetUserPersonaState(s) { calls.push(["persona", s]); this.self.persona.m_ePersonaState = s; },
    GetUserDoNotDisturb() { return this.dnd; },
    SetUserDoNotDisturb(v) { calls.push(["dnd", v]); this.dnd = v; },
  },
  CMInterface: { BIsConnected: () => true },
  UIStore: { ShowFriendChatDialog(ctx, id) { calls.push(["uistore-chat", id]); } },
  GetDefaultBrowserContext: () => ({ m_eBrowserType: 0 }),
  SignOutOfFriends() { calls.push(["signout-friends"]); app.FriendStore.self.persona.m_ePersonaState = 0; },
};

// Steam's Games menu, as its menu-bar button's props carry it (a React fiber stand-in), each item
// recording what it was asked to do
export const gamesItems = [
  { name: "#Menu_ViewLibrary", route: "/library/home" },
  { name: "#Menu_ActivateRetail", onClick: () => calls.push(["games", "activate"]) },
  { name: "#Menu_RedeemWallet", onClick: () => calls.push(["games", "wallet"]) },
  { name: "#Menu_ManageGifts", steamURL: "steam://openurl/https://store.steampowered.com/account/gifts" },
  { name: "Separator1" },
  { name: "#Menu_AddNonSteam", onClick: () => calls.push(["games", "nonsteam"]) },
  { name: "#Menu_ProductCodes", onClick: () => calls.push(["games", "cdkeys"]) },
];
const markGamesRoot = () => {
  const node = document.getElementById("gamesRoot");
  if (node) node.__reactFiber$fixture = { memoizedProps: { title: "Games Root Menu", menuItems: gamesItems }, return: null };
  const img = document.querySelector("#account img.avatar");
  if (img) img.src = svgFace(260, "N");
};
markGamesRoot();

export const route = { path: "/library/home", url: "" };

window.g_FriendsUIApp = app;
window.SteamUIStore = {
  WindowStore: {
    MainWindowInstance: {
      get LocationPathName() { return route.path; },
      Navigate(p) { calls.push(["navigate", p]); },
    },
  },
};
window.SteamClient = { URL: { ExecuteSteamURL(u) { calls.push(["url", u]); } } };
// The browser view's address (Store, Community pages in the main window)
window.MainWindowBrowserManager = { get m_URL() { return route.url; } };
window.__fixture = { app, friends, calls, route, persona, GAMES, chats, gamesItems };
