// ==UserScript==
// @name         Radio2Gether — Next Video
// @namespace    https://radio2gether.com
// @version      1.1
// @description  Sends the YouTube video you're watching to your Radio2Gether DJ room automatically.
// @match        https://www.youtube.com/*
// @match        https://youtu.be/*
// @match        https://radio2gether.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // Kept in sync by hand with client/src/lib/youtube.ts extractVideoId.
  function extractVideoId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.slice(1) || null;
      }
      if (u.hostname.includes("youtube.com")) {
        if (u.pathname === "/watch") return u.searchParams.get("v");
        const match = u.pathname.match(/\/(embed|shorts)\/([\w-]{11})/);
        if (match) return match[2];
      }
    } catch {
      return null;
    }
    return null;
  }

  if (location.hostname.includes("radio2gether.com")) {
    // Reads the currently joined room's id and DJ token out of the DOM
    // (App.tsx sets data-role/data-room-id/data-dj-token once the DJ has
    // created/entered a room) into GM storage, which the YouTube-side
    // half of this same script reads back. GM_setValue/GM_getValue is
    // shared across every site this script runs on, standing in for the
    // background script a real extension would use to bridge the two tabs.
    let last;
    let hadRoom = false;

    function check() {
      const el = document.querySelector('[data-role="dj"][data-room-id]');
      const roomId = el?.getAttribute("data-room-id") || null;
      const djToken = el?.getAttribute("data-dj-token") || null;
      const key = `${roomId ?? ""}:${djToken ?? ""}`;
      if (key === last) return;
      last = key;

      if (roomId === null && !hadRoom) return; // never a DJ tab, stay quiet

      hadRoom = roomId !== null;
      GM_setValue("djRoomId", roomId);
      GM_setValue("djToken", djToken);
    }

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    check();
  } else {
    // Every YouTube tab reports its video changes — there's no per-tab
    // "arm" step here (no extension background script to track tab ids
    // against), so with multiple YouTube tabs open the last one to
    // change wins.
    //
    // The "already sent" check uses GM storage (not a plain JS
    // variable) because it must survive this script being re-injected —
    // Chrome can discard and reload a backgrounded YouTube tab (e.g. to
    // free memory when another tab opens), and a plain in-memory
    // variable would forget it already sent the current video, causing
    // a duplicate "load" that resets playback to 0 for the whole room.
    async function sendVideo(roomId, djToken, videoId) {
      try {
        const res = await fetch(`https://radio2gether.com/api/rooms/${roomId}/load-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Dj-Token": djToken ?? "" },
          body: JSON.stringify({ videoId }),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
      } catch (err) {
        console.error("Radio2Gether: failed to send video to room", err);
      }
    }

    function notify() {
      const videoId = extractVideoId(location.href);
      if (!videoId || videoId === GM_getValue("lastSentVideoId", null)) return;
      GM_setValue("lastSentVideoId", videoId);

      const roomId = GM_getValue("djRoomId", null);
      if (!roomId) return;
      sendVideo(roomId, GM_getValue("djToken", null), videoId);
    }

    document.addEventListener("yt-navigate-finish", notify);
    notify();
  }
})();
