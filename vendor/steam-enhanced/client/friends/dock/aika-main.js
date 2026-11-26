/*
 * Aika Enhanced — stands in for Steam Enhanced's client/friends/dock/main.js.
 *
 * Wires Steam Enhanced's chat engine to the Aika Friends Dock, in the order Steam Enhanced's
 * main.js does: the chat's own controls (close, minimize, and Aika Enhanced's "open in a Steam
 * window"), the minimized chat chip, the error line, the listeners on Steam's own Friends & Chat
 * tree, the chat routing, the watchers and the friends poll, then the API. Steam Enhanced's panel,
 * rail, "+N" flyouts, search and resize handle are left out: the Aika dock (js/friends-dock.js)
 * is the list, and calls in here (window.__aikaFdockChat) to open a chat.
 *
 * The rest of the logic is Steam Enhanced's, unchanged: a friend's chat opens as a tab of
 * Steam's own chat (ui.js openChat → routing.js openDockChat), shown beside the dock on the
 * Library and in a popup window over Store and Community pages (chat-popup.js); clicks on chat
 * notifications and chats opened elsewhere are routed to it (routing.js); the open chat follows
 * page changes (chat-popup.js beginChatNavigation).
 */
((SE) => {
  const ns = window.__seFriendsDockParts;
  if (!ns) return;
  const {
    app, browserClickListeners, cancelChatNavigation, chatBack, chatChip, chatError, chatErrorText,
    chatMinimize, chipAvatar, chipChevron, chipCount, chipName, chipText, closeChat,
    closeChatPopup, noteNavigation, deadAvatars, dismissChatError, disposeSteam, dock,
    flyoutOwnedTabs, gameInForeground, installChatRouting,
    interactionEvents, keepLibraryManagers, markDesktopInteraction, markDockInteraction,
    minimizeChat, onAvatarError, onDesktopChatFocus, onLibrary,
    onNativeChannelClick, onNativeFriendClick, onStore, openFriendNotification,
    pendingOverlayChats, place, releaseFlyoutTabs,
    requestChatHandoff, resetMinimized, restoreChat, restoreChatRenderer, restoreChatRouting,
    resumeOverlayChat, schedule, state, steamHost, svg, sync, syncBrowserClicks, syncChatTabs,
    unguardLibraryManagers,
  } = ns;
  const { live } = ns;
  const { run } = SE;
  const aika = () => window.__aikaFriendsDock;

  /* ---------- The chat's controls, in the dock (moved into the chat popup with it) ---------- */

  dock.addEventListener('error', onAvatarError, true);
  steamHost.className = 'se-fd-steam friendsui-container client_chat_frame fullheight';
  chatBack.type = 'button';
  chatBack.className = 'se-fd-chat-back';
  chatBack.textContent = '×';
  chatBack.setAttribute('aria-label', 'Close chat');
  chatBack.hidden = true;
  dock.appendChild(chatBack);
  chatMinimize.type = 'button';
  chatMinimize.className = 'se-fd-chat-back se-fd-chat-minimize';
  chatMinimize.textContent = '−';
  chatMinimize.hidden = true;
  chatMinimize.setAttribute('aria-label', 'Minimize chat');
  dock.appendChild(chatMinimize);
  /* Aika Enhanced: the open conversation in Steam's own chat window, when asked for ("Chat
     window button" setting). Steam Enhanced's openWindow() path, so the dock lets it go. */
  const chatPopout = document.createElement('button');
  chatPopout.type = 'button';
  chatPopout.className = 'se-fd-chat-back se-fd-chat-popout';
  chatPopout.setAttribute('aria-label', 'Open in a Steam chat window');
  chatPopout.title = 'Open in a Steam chat window';
  chatPopout.hidden = true;
  dock.appendChild(chatPopout);
  ns.chatPopout = chatPopout;
  chatChip.type = 'button';
  chatChip.className = 'se-fd-chat-chip';
  chatChip.hidden = true;
  chipAvatar.className = 'se-fd-chat-chip-avatar';
  chipText.className = 'se-fd-chat-chip-text';
  chipName.className = 'se-fd-chat-chip-name';
  chipCount.className = 'se-fd-chat-chip-count';
  chipChevron.className = 'se-fd-chat-chip-chevron';
  chipChevron.innerHTML = svg('chev', 16);
  chipText.append(chipName, chipCount);
  chatChip.append(chipAvatar, chipText, chipChevron);
  chatChip.addEventListener('error', onAvatarError, true);
  dock.append(chatChip);
  chatChip.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.stopPropagation();
    if (dock.dataset.chatMinimized === '1') restoreChat();
  });
  chatChip.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dock.dataset.chatMinimized === '1') restoreChat();
  });
  chatMinimize.addEventListener('click', minimizeChat);
  chatBack.addEventListener('click', closeChat);
  addEventListener('beforeunload', releaseFlyoutTabs);
  chatError.className = 'se-fd-chat-error';
  chatError.setAttribute('role', 'alert');
  chatError.hidden = true;
  dismissChatError.type = 'button';
  dismissChatError.textContent = '×';
  dismissChatError.setAttribute('aria-label', 'Dismiss chat error');
  dismissChatError.addEventListener('click', () => {
    chatError.hidden = true;
    place();
  });
  chatError.append(chatErrorText, dismissChatError);
  dock.append(chatError);
  for (const type of interactionEvents) {
    steamHost.addEventListener(type, markDockInteraction, true);
    dock.addEventListener(type, markDockInteraction, true);
    document.addEventListener(type, markDesktopInteraction, true);
  }
  document.addEventListener('contextmenu', markDesktopInteraction, true);
  steamHost.addEventListener('click', onNativeFriendClick, true);
  steamHost.addEventListener('dblclick', onNativeFriendClick, true);
  steamHost.addEventListener('click', onNativeChannelClick);
  addEventListener('click', noteNavigation, true);

  /* ---------- Watchers, routing, the friends poll ---------- */

  const watcher = SE.watch(sync, { ignore: SE.inSide, throttle: 100 });
  const chatWatcher = SE.watch(syncChatTabs, { scope: '.se-fd-steam', throttle: 100 });
  window.addEventListener('focus', onDesktopChatFocus);
  document.addEventListener('visibilitychange', requestChatHandoff);
  const focusRegistration = run(() => window.SteamClient?.System?.UI?.RegisterForFocusChangeEvents?.((event) => {
    const focused = event?.focusedApp;
    state.foregroundApp = focused ? { appid: Number(focused.appid), pid: Number(focused.pid) } : null;
    if (gameInForeground()) state.focusedBrowserView = null;
    requestChatHandoff();
    schedule();
  }));
  const notificationRegistration = run(() => window.SteamClient?.Messaging?.RegisterForMessages?.(
    'SteamEnhanced.Chat',
    (channel, message, accountId) => {
      if (channel === 'SteamEnhanced.Chat' && message === 'OpenFriendNotification') {
        openFriendNotification(accountId);
      }
    },
  ));

  /*
   * Steam Enhanced's refreshFriends without its list: the routing and the chat tabs kept up, the
   * friends list kept loaded. The Aika dock reads the store itself; nothing is drawn here.
   */
  function refreshFriends() {
    syncBrowserClicks();
    syncChatTabs();
    installChatRouting();
    resumeOverlayChat();
    const a = app();
    const connected = run(() => a.CMInterface.BIsConnected()) ?? run(() => a.CMInterface.logged_on);
    // Only while the list is empty: once loaded, Steam keeps it up itself (the Aika dock asks the
    // same way, js/friends-dock.js tick)
    if (connected && !(run(() => a.FriendStore.all_friends.length) > 0)) run(() => a.FriendStore.EnsureFriendsListLoaded?.(false));
    keepLibraryManagers();
    place();
  }
  const timer = SE.poll(refreshFriends, 1000, {
    active: () => SE.railMode() && (pendingOverlayChats.size || dock.dataset.chat === '1' || onLibrary() || onStore()),
  });

  installChatRouting();
  syncBrowserClicks();
  place();

  /* ---------- Aika Enhanced: the open chat as the Aika dock sees it ---------- */

  // "Scroll to new messages": the open conversation follows what arrives, even scrolled up
  let historyObserver = null;
  let watchedHistory = null;
  const chatRootNode = () => live.chatPopup?.chatHost || steamHost;
  function scrollerOf(node) {
    for (let el = node; el && el !== dock; el = el.parentElement) {
      const view = el.ownerDocument.defaultView;
      const { overflowY } = view.getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return null;
  }
  function followHistory() {
    const history = dock.dataset.chat === '1' ? chatRootNode().querySelector('.chatWindow:not([data-activechat="false"]) .chatHistory, .chatHistory') : null;
    if (history === watchedHistory) return;
    historyObserver?.disconnect();
    watchedHistory = history;
    if (!history) return;
    const View = history.ownerDocument.defaultView;
    // A new message only scrolls: the history's scroller is found once (computed styles up the
    // tree) and kept while it stays in the history's tree
    let box = null;
    historyObserver = new View.MutationObserver(() => {
      if (aika()?.setting?.('autoscroll') === '0') return;
      if (!box?.isConnected || !box.contains(history)) box = scrollerOf(history.lastElementChild || history) || scrollerOf(history);
      if (box) box.scrollTop = box.scrollHeight;
    });
    historyObserver.observe(history, { childList: true });
  }

  function activeFriend() {
    if (dock.dataset.chat !== '1') return null;
    const id = state.activeChatFriend;
    return id != null && !String(id).startsWith('cg') ? String(id).replace(/^f/, '') : null;
  }

  // Called on every placement pass: writes only what changed
  let keptChat = null;
  function chatChanged() {
    const open = dock.dataset.chat === '1';
    const noPopout = !open || dock.dataset.chatMinimized === '1' || aika()?.setting?.('popout') === '0';
    if (chatPopout.hidden !== noPopout) chatPopout.hidden = noPopout;
    followHistory();
    const id = open ? activeFriend() : null;
    if (id && id !== keptChat) {
      keptChat = id;
      try { localStorage.setItem('aika-fdock-chat', id); } catch {}
    } else if (!open && keptChat && !live.chatNavigation) {
      // closed by its own ×: not brought back at the next start
      keptChat = null;
      try { localStorage.removeItem('aika-fdock-chat'); } catch {}
    }
  }

  // The open conversation in Steam's window: Steam Enhanced's openWindow(), then Steam's own
  // OpenChatDialog for that friend
  function popOut() {
    const id = activeFriend();
    const f = id && ns.findFriend(id);
    const a = app();
    window.__seFriendsDock.openWindow(() => {
      const ctx = run(() => a.GetDefaultBrowserContext());
      if (f && ctx) run(() => f.OpenChatDialog(ctx));
    });
    keptChat = null;
    try { localStorage.removeItem('aika-fdock-chat'); } catch {}
    aika()?.refresh?.();
  }
  chatPopout.addEventListener('click', (event) => {
    event.stopPropagation();
    popOut();
  });

  window.__aikaFdockChat = {
    // A friend's chat in the dock; false when it could not open there (the caller opens Steam's window)
    open(id) {
      if (state.destroyed || !SE.railMode()) return false;
      resetMinimized();
      // routing.js openDockChat (what ui.js openChat calls), without its "unable to open" notice:
      // when the chat cannot show in the dock the Aika dock opens Steam's window itself
      const opened = Boolean(run(() => ns.openDockChat(id)));
      schedule();
      return opened && dock.dataset.chat === '1';
    },
    close() {
      if (dock.dataset.chat === '1') closeChat();
      keptChat = null;
      try { localStorage.removeItem('aika-fdock-chat'); } catch {}
    },
    minimize() {
      if (dock.dataset.chat === '1' && dock.dataset.chatMinimized !== '1') minimizeChat();
    },
    popOut,
    get active() {
      return activeFriend();
    },
    get showing() {
      return dock.dataset.chat === '1';
    },
    get minimized() {
      return dock.dataset.chatMinimized === '1';
    },
    changed: chatChanged,
  };

  /* ---------- The API (Steam Enhanced's, which its other parts call) ---------- */

  window.__seFriendsDock = {
    prepareModal: keepLibraryManagers,
    get mode() {
      return dock.dataset.mode || 'open';
    },
    get hidden() {
      return !aika()?.shown;
    },
    toggleMode() {
      aika()?.toggle?.();
      return dock.dataset.mode;
    },
    toggle() {
      aika()?.toggle?.();
      return Boolean(aika()?.shown);
    },
    openWindow(openNative) {
      state.allowNativeWindow = true;
      pendingOverlayChats.clear();
      chatError.hidden = true;
      closeChatPopup();
      restoreChatRenderer();
      delete dock.dataset.chat;
      resetMinimized();
      chatBack.hidden = true;
      state.activeChatFriend = null;
      flyoutOwnedTabs.clear();
      run(() => app()?.UIStore.SerializePopupState?.());
      if (state.chatContext) {
        run(() => state.chatContext.data.SetFriendsListSingleWindowMode(state.chatContext.previous));
        state.chatContext = null;
      }
      state.manualWindowOpen++;
      try {
        return openNative();
      } finally {
        state.manualWindowOpen--;
        chatChanged();
      }
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      for (const [browser, listener] of browserClickListeners) {
        run(() => browser.off?.('message', listener));
      }
      browserClickListeners.clear();
      historyObserver?.disconnect();
      cancelChatNavigation();
      ns.holdChatError();
      clearTimeout(state.statusTimer);
      watcher.disconnect();
      chatWatcher.disconnect();
      timer?.disconnect();
      if (live.frame) cancelAnimationFrame(live.frame);
      window.removeEventListener('focus', onDesktopChatFocus);
      document.removeEventListener('visibilitychange', requestChatHandoff);
      run(() => focusRegistration?.unregister?.());
      run(() => notificationRegistration?.unregister?.());
      removeEventListener('click', noteNavigation, true);
      removeEventListener('beforeunload', releaseFlyoutTabs);
      closeChatPopup();
      releaseFlyoutTabs();
      for (const type of interactionEvents) {
        steamHost.removeEventListener(type, markDockInteraction, true);
        dock.removeEventListener(type, markDockInteraction, true);
        document.removeEventListener(type, markDesktopInteraction, true);
      }
      document.removeEventListener('contextmenu', markDesktopInteraction, true);
      disposeSteam();
      unguardLibraryManagers();
      ns.showOfflineMembers?.();
      restoreChatRouting();
      steamHost.removeEventListener('click', onNativeFriendClick, true);
      steamHost.removeEventListener('dblclick', onNativeFriendClick, true);
      steamHost.removeEventListener('click', onNativeChannelClick);
      dock.removeEventListener('error', onAvatarError, true);
      live.fold?.destroy();
      for (const node of [chatBack, chatMinimize, chatPopout, chatChip, chatError]) node.remove();
      deadAvatars.clear();
      state.geometryCache = null;
      delete window.__aikaFdockChat;
      delete window.__seFriendsDock;
    },
  };
  aika()?.chatReady?.();
  dispatchEvent(new Event('aika-fdock-chat-ready'));
})(window.__se);
