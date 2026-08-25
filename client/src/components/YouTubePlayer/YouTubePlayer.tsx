import { forwardRef, useImperativeHandle, useRef } from "react";
import YouTube, { type YouTubePlayer as YTPlayer } from "react-youtube";
import "./YouTubePlayer.css";

export interface YouTubePlayerHandle {
  getPlayer: () => YTPlayer | null;
}

interface Props {
  videoId: string | null;
  controls: boolean; // DJ sees YouTube controls, listener doesn't
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (code: number) => void;
  onStateChange?: (state: number, currentTime: number) => void;
}

// Thin wrapper around react-youtube. The player instance is kept by the
// parent via a ref (getPlayer), instead of the player getting remounted
// on state changes higher up the tree — a remount kills the autoplay
// permission the user granted by clicking "Join"/"Start".
const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(
  ({ videoId, controls, onReady, onEnded, onError, onStateChange }, ref) => {
    const playerRef = useRef<YTPlayer | null>(null);

    useImperativeHandle(ref, () => ({
      getPlayer: () => playerRef.current,
    }));

    if (!videoId) {
      return (
        <div className="yt-placeholder">
          <p>No track loaded.</p>
        </div>
      );
    }

    return (
      <YouTube
        videoId={videoId}
        opts={{
          width: "100%",
          height: "360",
          playerVars: {
            controls: controls ? 1 : 0,
            disablekb: controls ? 0 : 1,
            modestbranding: 1,
            rel: 0,
            // Without this, YouTube's origin check on the embed can be
            // flaky over a LAN IP (vs. localhost/a real domain) and
            // surface as error 150 on some mobile browsers.
            origin: window.location.origin,
          },
        }}
        onReady={(e) => {
          playerRef.current = e.target;
          onReady?.();
        }}
        onEnd={() => onEnded?.()}
        onError={(e) => onError?.(e.data)}
        onStateChange={async (e) => {
          const time = await e.target.getCurrentTime();
          onStateChange?.(e.data, time);
        }}
      />
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;
