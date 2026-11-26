// TEST FIXTURE ONLY — never loaded by the theme. A stand-in for Steam's popup windows, as Steam
// Enhanced's popup layer (vendor/steam-enhanced/client/shared/popup-layer.js) finds and drives
// them: a webpack chunk whose module cache holds React, ReactDOM (createPortal, flushSync) and a
// context-menu manager (m_mapManagers → CreateContextMenuInstance). Each "window" is an <iframe>
// with a document of its own, placed where SteamClient.Window.PositionWindowRelative puts it and
// stacked over everything (Steam's popups are windows of their own, above the browser view).
// Needs React 18 and ReactDOM UMD loaded first. Windows are listed in window.__popupWindows.
(() => {
  if (window.__popupStub) return;
  window.__popupStub = true;
  window.__popupWindows = [];
  try { localStorage.setItem("se-layer-offset-v2", JSON.stringify({ x: 0, y: 0 })); } catch {}
  window.SteamClient ||= {};
  window.SteamClient.Window = Object.assign(window.SteamClient.Window || {}, {
    GetWindowRestoreDetails: () => Promise.resolve("details"),
    BringToFront() {},
  });

  const manager = {
    ActiveMenu: null,
    CreateContextMenuInstance(element, anchor, _a, _b, options) {
      const frame = document.createElement("iframe");
      frame.className = "test-popup-window";
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;border:0;z-index:100000;background:transparent";
      document.documentElement.append(frame);
      const doc = frame.contentDocument;
      doc.open();
      doc.write("<!doctype html><html><head><meta charset='utf-8'><title>Popup Menu</title></head><body style='margin:0;background:transparent'></body></html>");
      doc.close();
      frame.contentWindow.SteamClient = {
        Window: {
          PositionWindowRelative(details, left, top, width, height) {
            Object.assign(frame.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
          },
          BringToFront() {},
        },
      };
      let root = null;
      let onHide = null;
      const handle = {
        visible: false,
        m_element: doc.body,
        Show() {
          root = ReactDOM.createRoot(doc.body);
          ReactDOM.flushSync(() => root.render(element));
          this.visible = true;
        },
        Hide() {
          if (!this.visible && !frame.isConnected) return;
          this.visible = false;
          try { root?.unmount(); } catch {}
          frame.remove();
          window.__popupWindows = window.__popupWindows.filter((w) => w !== frame);
          onHide?.();
        },
        SetOnHideCallback(fn) { onHide = fn; },
        TakeFocus() {},
        OnCancel() {},
      };
      frame.__handle = handle;
      window.__popupWindows.push(frame);
      return handle;
    },
    ReleaseHiddenMenu() {},
  };

  const modules = {
    react: { exports: window.React },
    reactDom: { exports: { createPortal: window.ReactDOM.createPortal, flushSync: window.ReactDOM.flushSync } },
    menus: { exports: { m_mapManagers: new Map([[window, manager]]) } },
  };
  const req = (id) => modules[id]?.exports;
  req.c = modules;
  req.m = {};
  const chunks = [];
  chunks.push = (chunk) => { chunk?.[2]?.(req); return 1; };
  window.webpackChunkpopupstub = chunks;
})();
