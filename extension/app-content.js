// Runs on the RadioTube app itself (not YouTube) — on EVERY tab open to
// the app, both DJ and listener tabs alike, since content_scripts can't
// tell them apart by URL. Reads the currently joined room's id and DJ
// token straight out of the DOM (App.tsx sets
// data-role/data-room-id/data-dj-token once the DJ has created/entered a
// room) and quietly reports them to the background script, so the DJ
// never has to type anything into the extension.
(function () {
  const runtime = (typeof browser !== "undefined" ? browser : chrome).runtime;
  let last;
  // Only true once THIS tab has actually reported a real DJ room. Guards
  // against a listener tab's "no DJ here" (null) report clobbering the
  // real room a DJ tab already reported — each tab only gets to send a
  // null once it had previously sent something real.
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
    runtime.sendMessage({ type: "DJ_ROOM", roomId, djToken }).catch(() => {});
  }

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  check();
})();
