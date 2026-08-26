const BACKEND_BASE = "https://radio2gether.com";

function loadVideoUrl(roomId) {
  return `${BACKEND_BASE}/api/rooms/${roomId}/load-video`;
}

// Kept in sync by hand with client/src/lib/youtube.ts extractVideoId —
// this is a separate codebase (extension, not bundled with the app), so
// no shared import.
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

// Persisted (not just in-memory) because the MV3 service worker can be
// killed and restarted between events.
//
// armedTabId/lastVideoId track the YouTube tab the DJ picked as their
// source. djRoomId/djToken are separate and global (not per-tab):
// whatever room+token app-content.js last reported from the Radio2Gether
// app tab — there's realistically one DJ app tab open at a time, so the
// two content scripts (running in two different tabs) meet here instead
// of trying to match tab ids against each other.
async function getState() {
  const { armedTabId, lastVideoId, djRoomId, djToken } = await browser.storage.local.get([
    "armedTabId",
    "lastVideoId",
    "djRoomId",
    "djToken",
  ]);
  return {
    armedTabId: armedTabId ?? null,
    lastVideoId: lastVideoId ?? null,
    djRoomId: djRoomId ?? null,
    djToken: djToken ?? null,
  };
}

async function setArmedState(armedTabId, lastVideoId = null) {
  const { djRoomId, djToken } = await getState();
  await browser.storage.local.set({ armedTabId, lastVideoId, djRoomId, djToken });
}

async function setDjRoom(roomId, djToken) {
  const { armedTabId, lastVideoId } = await getState();
  await browser.storage.local.set({ armedTabId, lastVideoId, djRoomId: roomId, djToken });
}

async function postVideoId(roomId, djToken, videoId) {
  const res = await fetch(loadVideoUrl(roomId), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Dj-Token": djToken ?? "" },
    body: JSON.stringify({ videoId }),
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
}

// Blue = armed and last send (if any) succeeded. Orange = armed but
// something's wrong (no room known yet, or the last send failed) —
// visible instead of failing silently.
async function setArmedBadge(tabId, ok) {
  await browser.action.setBadgeText({ text: "DJ", tabId });
  await browser.action.setBadgeBackgroundColor({ color: ok ? "#4a7dff" : "#e0a555", tabId });
}

async function clearBadge(tabId) {
  await browser.action.setBadgeText({ text: "", tabId });
}

async function sendVideo(tabId, roomId, djToken, videoId) {
  try {
    await postVideoId(roomId, djToken, videoId);
    await setArmedBadge(tabId, true);
  } catch (err) {
    console.error("Radio2Gether: failed to send video to room", err);
    await setArmedBadge(tabId, false);
  }
}

// Click toggles auto-tracking for that tab: first click arms it (and
// sends whatever video is currently open, if a room is already known),
// second click on the same tab disarms it. Only one tab can be armed at
// a time.
browser.action.onClicked.addListener(async (tab) => {
  const { armedTabId, djRoomId, djToken } = await getState();

  if (armedTabId === tab.id) {
    await setArmedState(null);
    await clearBadge(tab.id);
    return;
  }

  if (armedTabId !== null) await clearBadge(armedTabId);

  const videoId = extractVideoId(tab.url);
  await setArmedState(tab.id, videoId);

  if (!djRoomId) {
    await setArmedBadge(tab.id, false);
    return;
  }

  await setArmedBadge(tab.id, true);
  if (videoId) await sendVideo(tab.id, djRoomId, djToken, videoId);
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (!sender.tab) return;

  // From app-content.js, running on the Radio2Gether app tab: which room
  // (if any) the DJ currently has open there, and their proof of
  // ownership for it.
  if (msg?.type === "DJ_ROOM") {
    await setDjRoom(msg.roomId, msg.djToken);
    const { armedTabId } = await getState();
    if (armedTabId !== null) await setArmedBadge(armedTabId, Boolean(msg.roomId));
    return;
  }

  // From content.js, running on a YouTube tab: the video there changed.
  if (msg?.type !== "VIDEO_CHANGED") return;

  const { armedTabId, lastVideoId, djRoomId, djToken } = await getState();
  if (sender.tab.id !== armedTabId) return; // not the DJ's tracked tab
  if (msg.videoId === lastVideoId) return; // duplicate, ignore

  if (!djRoomId) {
    await setArmedBadge(armedTabId, false); // armed, but no room known yet
    return;
  }

  await setArmedState(armedTabId, msg.videoId);
  await sendVideo(armedTabId, djRoomId, djToken, msg.videoId);
});

// Don't leave a stale armed badge pointing at a tab that's gone.
browser.tabs.onRemoved.addListener(async (tabId) => {
  const { armedTabId } = await getState();
  if (tabId === armedTabId) await setArmedState(null);
});
