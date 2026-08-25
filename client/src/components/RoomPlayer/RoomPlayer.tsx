import { useEffect, useRef, useState } from "react";
import YouTubePlayer, { type YouTubePlayerHandle } from "../YouTubePlayer/YouTubePlayer";
import { useRoomStore } from "../../store/roomStore";
import { getTargetPosition, resolveDrift } from "../../lib/sync";
import { extractVideoId } from "../../lib/youtube";
import type { Role } from "../../types/room";
import "./RoomPlayer.css";

// YT.PlayerState codes (iframe API)
const YT_PLAYING = 1;
const YT_PAUSED = 2;

const RESYNC_INTERVAL_MS = 1000;

interface Props {
  role: Role;
}

// One player component for both roles. The DJ's own play/pause/seek
// actions get written to the room store (a broadcast, later a SignalR
// call); everyone else's player reacts to that same store and continuously
// corrects drift against it. Only `role` changes the behavior.
export default function RoomPlayer({ role }: Props) {
  const isDj = role === "dj";

  const room = useRoomStore((s) => s.room);
  const loadVideo = useRoomStore((s) => s.loadVideo);
  const play = useRoomStore((s) => s.play);
  const pause = useRoomStore((s) => s.pause);
  const seek = useRoomStore((s) => s.seek);

  const playerRef = useRef<YouTubePlayerHandle>(null);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Browsers block autoplay-with-sound until the user interacts with the
  // page. The DJ's "Load" click already is that gesture; a listener needs
  // an explicit "Join" click before the player mounts.
  const [joined, setJoined] = useState(isDj);
  const [muted, setMuted] = useState(!isDj);

  // Follower-only: when a new broadcast arrives (play/pause/seek/new
  // track), jump to the correct position immediately instead of waiting
  // for the next correction tick.
  useEffect(() => {
    if (isDj || !joined) return;
    const player = playerRef.current?.getPlayer();
    if (!player) return;

    const target = getTargetPosition(room, Date.now());
    player.seekTo(target, true);
    if (room.isPlaying) player.playVideo();
    else player.pauseVideo();

    // Loading a new video can silently re-mute the player even after the
    // listener already unmuted — re-assert it so a new track doesn't go
    // quiet again.
    if (!muted) player.unMute();
  }, [isDj, joined, muted, room.videoId, room.isPlaying, room.positionAtBroadcast, room.serverTime]);

  // Follower-only: continuous drift correction while playing — small gap
  // -> gentle playback-rate nudge, large gap -> hard seek. See lib/sync.ts.
  useEffect(() => {
    if (isDj || !joined || !room.isPlaying) return;

    const id = setInterval(async () => {
      const player = playerRef.current?.getPlayer();
      if (!player) return;

      const actual = await player.getCurrentTime();
      const target = getTargetPosition(room, Date.now());
      const action = resolveDrift(actual, target);

      if (action.type === "seek") player.seekTo(action.to, true);
      else if (action.type === "rate") player.setPlaybackRate(action.rate);
      else player.setPlaybackRate(1);
    }, RESYNC_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isDj, joined, room.isPlaying, room.videoId, room.positionAtBroadcast, room.serverTime]);

  // DJ-only: since a hidden tab's spontaneous pause is now ignored
  // (above) instead of broadcast, the room keeps playing for everyone
  // while the DJ's own copy sits frozen. Catch it back up the moment the
  // tab is visible again, the same way a listener resyncs.
  useEffect(() => {
    if (!isDj) return;

    function handleVisibility() {
      if (document.hidden) return;
      const player = playerRef.current?.getPlayer();
      if (!player || !room.isPlaying) return;

      const target = getTargetPosition(room, Date.now());
      player.seekTo(target, true);
      player.playVideo();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isDj, room]);

  function handleLoad() {
    const id = extractVideoId(urlInput);
    if (!id) {
      setError("Doesn't look like a YouTube link or ID.");
      return;
    }
    setError(null);
    loadVideo(id);
    setUrlInput("");
  }

  // DJ-only: the DJ's own action in the player (clicking play/pause/seek
  // in the YT controls) becomes a broadcast to all listeners. This is the
  // spot that later gets changed to call connection.invoke(...) instead
  // of the local store.
  //
  // Background tabs get silently paused by YouTube/the browser to save
  // resources — without the document.hidden guard, that non-action gets
  // mistaken for the DJ clicking pause and broadcast as a real Pause to
  // the whole room.
  function handleStateChange(state: number, currentTime: number) {
    if (!isDj || document.hidden) return;
    if (state === YT_PLAYING) play(currentTime);
    else if (state === YT_PAUSED) pause(currentTime);
  }

  function handleReady() {
    if (isDj) return;
    const player = playerRef.current?.getPlayer();
    if (!player) return;
    // Starts muted (always allowed by autoplay policy), then the listener
    // can unmute right away within the same user-gesture flow.
    player.mute();
    const target = getTargetPosition(room, Date.now());
    player.seekTo(target, true);
    if (room.isPlaying) player.playVideo();
  }

  function handleUnmute() {
    const player = playerRef.current?.getPlayer();
    if (!player) return; // not ready yet — button stays put, user can retry
    player.unMute();
    setMuted(false);
  }

  if (!joined) {
    return (
      <div className="room-player">
        <h2>Listener</h2>
        <button onClick={() => setJoined(true)}>Join room</button>
      </div>
    );
  }

  return (
    <div className="room-player">
      <h2>{isDj ? "DJ" : "Listener"}</h2>

      {isDj && (
        <div className="load-row">
          <input
            type="text"
            placeholder="Paste a YouTube link or video ID"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          <button onClick={handleLoad}>Load</button>
        </div>
      )}

      {!isDj && muted && <button onClick={handleUnmute}>Unmute</button>}
      {error && <p className="error">{error}</p>}

      <YouTubePlayer
        ref={playerRef}
        videoId={room.videoId}
        controls={isDj}
        locked={!isDj}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onEnded={() => isDj && pause(0)}
        onError={(code) => setError(`Playback error (code ${code}).`)}
      />

      {isDj && (
        <button
          onClick={async () => {
            const p = playerRef.current?.getPlayer();
            if (!p) return;
            const t = await p.getCurrentTime();
            seek(t);
          }}
        >
          Resync now
        </button>
      )}
    </div>
  );
}
