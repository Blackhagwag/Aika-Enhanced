// Apply two visual conditions immediately while Millennium saves preferences.
// Native condition styles remain the startup source; this session-only bridge
// handles the editor not attaching/removing option CSS in already-open windows.
// Aika Enhanced: the Friends Dock switches too (the same root variables the
// options/fdock-*.css files set, written inline; js/friends-dock.js listens
// to "aika-visual-setting"), and the editor title "Aika Enhanced".
(() => {
  if (window.__aikaLiveSettingsBridge) return;
  const root = document.documentElement;
  let host = window;
  try {
    for (let i = 0; i < 5 && host.opener && host.opener !== host; i++) {
      if (new URL(host.opener.document.baseURI).origin !== "https://steamloopback.host") break;
      host = host.opener;
    }
  } catch { /* Cross-origin pages do not participate in client conditions. */ }
  const values = host.__aikaLiveSettingValues ||= Object.create(null);
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("aika-visual-settings") : null;
  const keys = ["Friends game banners", "Notification wordmark"];
  // The Friends Dock: a condition value → the root variables its option file sets
  const on = (name) => ({On: {[name]: "1"}, Off: {[name]: "0"}});
  const dockMotion = {
    On: {"--aika-fdock-dur": "var(--aika-dur-base)", "--aika-fdock-dur-text": "var(--aika-dur-fast)",
         "--aika-fdock-dur-enter": "var(--aika-dur-enter)", "--aika-fdock-text-delay": "60ms",
         "--aika-fdock-hover-scale": "var(--aika-dock-hover-scale)"},
    Off: {"--aika-fdock-dur": "0s", "--aika-fdock-dur-text": "0s", "--aika-fdock-dur-enter": "0s",
          "--aika-fdock-text-delay": "0s", "--aika-fdock-hover-scale": "1"},
  };
  const dockKeys = {
    "Friends Dock": on("--aika-fdock-enabled"),
    "Expand on hover": on("--aika-fdock-hover"),
    "Dock: friends in game": on("--aika-fdock-ingame"),
    "Dock: friends online": on("--aika-fdock-online"),
    "Dock: offline friends": on("--aika-fdock-offline"),
    "Dock: group by game": on("--aika-fdock-bygame"),
    "Dock: friend count": on("--aika-fdock-count"),
    "Dock animations": dockMotion,
    "Dock: in the library": on("--aika-fdock-library"),
    "Dock: in the store": on("--aika-fdock-store"),
    "Dock: in the community": on("--aika-fdock-community"),
    "Dock: on other pages": on("--aika-fdock-other"),
    "Built-in chat": on("--aika-fdock-chat"),
    "Chat window button": on("--aika-fdock-popout"),
    "Unread badges": on("--aika-fdock-unread"),
    "Message alerts": on("--aika-fdock-alerts"),
    "Scroll to new messages": on("--aika-fdock-autoscroll"),
    "Keep the open chat": on("--aika-fdock-keepchat"),
  };
  keys.push(...Object.keys(dockKeys));
  const markProps = {
    Gothic: ['"Aika"', 'var(--aika-font-gothic)', "54px", "0px", "-6deg", "block"],
    Japanese: ['"Aika"', 'var(--aika-font-brush)', "40px", "6px", "-3deg", "block"],
    Katakana: ['"アイカ"', '"Yuji Syuku Aika", var(--aika-font-display)', "44px", "5px", "-3deg", "block"],
    Off: ['"Aika"', 'var(--aika-font-gothic)', "54px", "0px", "-6deg", "none"],
  };
  const valid = (key, value) => Object.hasOwn(dockKeys, key) ? Object.hasOwn(dockKeys[key], value) :
    key === keys[0] ? ["On", "Off"].includes(value) : key === keys[1] && Object.hasOwn(markProps, value);
  const apply = (key, value) => {
    if (!valid(key, value)) return;
    if (Object.hasOwn(dockKeys, key)) {
      for (const [name, v] of Object.entries(dockKeys[key][value])) root.style.setProperty(name, v);
    } else if (key === keys[0]) {
      root.style.setProperty("--aika-fl-game-banners", value === "Off" ? "0" : "1");
      root.classList.toggle("aika-fl-banners-off", value === "Off");
    } else {
      const names = ["text", "font", "size", "bottom", "tilt", "display"];
      markProps[value].forEach((entry, i) => root.style.setProperty("--aika-toast-mark-" + names[i], entry));
      const nativeFont = document.querySelector('link[href*="/options/toast-mark-katakana.css"], link[href*="/options/wordmark-syuku.css"]');
      if (value === "Katakana" && !nativeFont && !document.getElementById("aika-live-toast-font")) {
        const style = document.createElement("style"); style.id = "aika-live-toast-font";
        style.textContent = '@font-face{font-family:"Yuji Syuku Aika";src:url("' + new URL("../assets/fonts/YujiSyuku-Aika.woff2", import.meta.url).href + '") format("woff2");font-weight:400;font-style:normal;font-display:block}';
        document.head.append(style);
      }
    }
    window.dispatchEvent(new CustomEvent("aika-visual-setting", {detail: {key, value}}));
  };
  const publish = (key, value) => {
    if (!valid(key, value) || values[key] === value) return;
    values[key] = value; apply(key, value); channel?.postMessage({key, value});
  };
  if (channel) channel.onmessage = ({data}) => {
    if (!data || !valid(data.key, data.value)) return;
    values[data.key] = data.value; apply(data.key, data.value);
  };
  for (const key of keys) if (valid(key, values[key])) apply(key, values[key]);

  const aliases = {"Вкл.": "On", "Выкл.": "Off", "Готический": "Gothic", "Японский": "Japanese", "Кисть (Aika)": "Japanese", "Катакана (アイカ)": "Katakana"};
  let field = null, observer = null;
  const read = () => {
    if (!field?.isConnected) {observer?.disconnect(); field = null; return;}
    const label = field.querySelector(".DialogDropDown_CurrentDisplay")?.textContent.trim();
    publish(field.dataset.condition, aliases[label] || label);
  };
  const watch = next => {
    if (!next || !keys.includes(next.dataset.condition)) return;
    const side = next.closest(".MillenniumDesktopSidebar");
    if (!/^Aika( Enhanced)?$/.test(side?.querySelector(".MillenniumDesktopSidebar_Title")?.textContent.trim() || "")) return;
    if (next !== field) {
      observer?.disconnect(); field = next;
      observer = new MutationObserver(read);
      observer.observe(field, {subtree: true, childList: true, characterData: true});
    }
    read();
  };
  const onEditor = event => watch(event.target.closest?.("[data-condition]"));
  document.addEventListener("click", onEditor, true);
  document.addEventListener("focusin", onEditor, true);
  for (const node of document.querySelectorAll(".MillenniumDesktopSidebar [data-condition]")) watch(node);
  const destroy = () => {
    observer?.disconnect(); channel?.close();
    document.removeEventListener("click", onEditor, true);
    document.removeEventListener("focusin", onEditor, true);
    window.removeEventListener("pagehide", destroy);
    delete window.__aikaLiveSettingsBridge;
  };
  window.addEventListener("pagehide", destroy);
  window.__aikaLiveSettingsBridge = {destroy, publish, keys};
})();
