/*
 * Aika Enhanced — stands in for Steam Enhanced's client/friends/dock/dock.js.
 *
 * Steam Enhanced's dock parts (templates, data, ui, routing, flyouts, member-list, embed,
 * chat-popup) run as they are; they expect a dock element and its placement from dock.js. In Aika
 * Enhanced the dock is the Aika Friends Dock (js/friends-dock.js, Aika's look, its own list), so
 * this part hands them that element and its state instead of building Steam Enhanced's panel and
 * rail:
 *   dock     the Aika dock's <aside> (window.__aikaFdockElement, shared with js/friends-dock.js,
 *            whichever runs first creates it); Steam's Friends & Chat tree (embed.js) mounts in
 *            it, hidden, and its chat shows as Steam Enhanced's flyout beside the dock
 *   place    the chat's part of placement: the popup over a browser page (chat-popup.js), the
 *            minimize button; the dock itself is placed by js/friends-dock.js
 *   render   the Aika dock's refresh
 * own, fly: detached stand-ins for Steam Enhanced's panel and "+N" flyout, which Aika does not use.
 *
 * Also: SE.railMode() — "the dock is up and the built-in chat is on" here (Steam Enhanced's rail
 * mode is what lets its routing open chats in the dock), and the chat setting behind
 * SE.settings.get('chat-open') comes from Aika Enhanced's "Built-in chat" (aika-settings.js).
 */
((SE) => {
  const ns = window.__seFriendsDockParts;
  if (!ns) return;
  const { state } = ns;
  const { live } = ns;

  const dock = (window.__aikaFdockElement ||= document.createElement('aside'));
  dock.classList.add('aika-fdock', 'se-fdock');
  const own = document.createElement('div');
  const fly = document.createElement('div');

  const aika = () => window.__aikaFriendsDock;
  const chatOn = () => aika()?.chatEnabled?.() !== false;

  // Steam Enhanced's routing opens a chat in the dock only in its rail mode
  SE.railMode = () => Boolean(aika()?.shown) && chatOn();

  const onLibrary = SE.libraryShown;
  const onStore = SE.browserShown;

  // A friend's picture that failed: Steam Enhanced's chip and chat faces (not the Aika rows,
  // which keep their initials themselves)
  function onAvatarError(event) {
    const img = event.target;
    const tile = img?.tagName === 'IMG' ? img.closest('.se-fd-gav, .se-fd-av') : null;
    if (!tile) return;
    const src = img.getAttribute('src');
    if (src) {
      if (ns.deadAvatars.size >= ns.DEAD_AVATAR_LIMIT) ns.deadAvatars.delete(ns.deadAvatars.values().next().value);
      ns.deadAvatars.add(src);
    }
    if (tile.dataset.initials || tile.classList.contains('se-fd-gav')) img.outerHTML = ns.groupInitials(tile.dataset.initials || '#');
    else img.remove();
  }

  function onSearch() {}

  // The Aika dock draws the list; Steam Enhanced's parts ask for a refresh after a status change
  function render() {
    if (state.destroyed) return;
    aika()?.refresh?.();
  }

  function place() {
    if (state.destroyed) return;
    const shown = Boolean(aika()?.shown);
    // Over a Store or Community page the chat goes into a popup window (a browser view covers
    // the main window's own DOM); on the Library it stays the flyout beside the dock
    const browser = shown && onStore();
    if (ns.chatMinimize) ns.chatMinimize.hidden = dock.dataset.chat !== '1' || dock.dataset.chatMinimized === '1';
    ns.syncChatOverlay?.(browser && chatOn());
    aika()?.chatChanged?.();
  }

  live.localObserver = undefined;
  live.releaseBar = () => {};

  Object.assign(ns, { dock, fly, onAvatarError, onLibrary, onSearch, onStore, own, place, render });
})(window.__se);
