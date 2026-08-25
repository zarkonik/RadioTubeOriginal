import { create } from "zustand";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { RoomState } from "../types/room";

// Same host the page was loaded from (works for both localhost and a
// phone hitting the laptop's LAN IP). Matches the page's protocol —
// an https page can't open a plain ws:// connection to an http backend
// (mixed content), so the backend exposes both ports and this picks
// whichever one lines up.
const isHttps = window.location.protocol === "https:";
const hubUrl = `${isHttps ? "https" : "http"}://${window.location.hostname}:${isHttps ? 7181 : 5181}/hubs/room`;

const connection = new HubConnectionBuilder()
  .withUrl(hubUrl)
  .withAutomaticReconnect()
  .configureLogging(LogLevel.Warning)
  .build();

const started = connection.start();

interface RoomStore {
  room: RoomState;
  connected: boolean;
  loadVideo: (videoId: string) => void;
  play: (fromPosition: number) => void;
  pause: (atPosition: number) => void;
  seek: (toPosition: number) => void;
}

export const useRoomStore = create<RoomStore>((set) => {
  connection.on("RoomState", (state: RoomState) => set({ room: state }));
  connection.onreconnected(() => set({ connected: true }));
  connection.onreconnecting(() => set({ connected: false }));
  started.then(() => set({ connected: true }));

  // Fire-and-forget hub calls: the RoomState broadcast that comes back
  // from the server is what actually updates `room`, not the return
  // value of invoke() itself.
  const call = (method: string, ...args: unknown[]) =>
    started.then(() => connection.invoke(method, ...args));

  return {
    room: {
      videoId: null,
      isPlaying: false,
      positionAtBroadcast: 0,
      serverTime: Date.now(),
    },
    connected: false,

    loadVideo: (videoId) => void call("LoadVideo", videoId),
    play: (fromPosition) => void call("Play", fromPosition),
    pause: (atPosition) => void call("Pause", atPosition),
    seek: (toPosition) => void call("Seek", toPosition),
  };
});
