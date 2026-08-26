// Runs on youtube.com pages. YouTube is a SPA — navigating to a new
// video (manually or via autoplay) doesn't reload the page, it fires a
// custom "yt-navigate-finish" event on `document` instead. That's the
// reliable hook for catching every video change, autoplay included.
(function () {
  const runtime = (typeof browser !== "undefined" ? browser : chrome).runtime;

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

  function notify() {
    const videoId = extractVideoId(location.href);
    if (!videoId) return;
    // No response expected; the background script silently drops this
    // if the tab isn't currently armed as the DJ source.
    runtime.sendMessage({ type: "VIDEO_CHANGED", videoId }).catch(() => {});
  }

  document.addEventListener("yt-navigate-finish", notify);
  notify();
})();
