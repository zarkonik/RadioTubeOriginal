import { create } from "zustand";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { ChatMessage, RoomState, RoomSummary } from "../types/room";

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

const emptyRoomState = (): RoomState => ({
  videoId: null,
  isPlaying: false,
  positionAtBroadcast: 0,
  serverTime: Date.now(),
});

interface RoomStore {
  rooms: RoomSummary[];
  currentRoom: RoomSummary | null;
  // Only set for the DJ who created the room — proves REST calls (from
  // the browser extension) to that room are actually from them.
  djToken: string | null;
  room: RoomState;
  chat: ChatMessage[];
  connected: boolean;
  // Set when the DJ leaves and everyone else gets kicked back to the
  // room picker — shown once, then cleared.
  notice: string | null;

  listRooms: () => Promise<void>;
  createRoom: (name: string) => Promise<RoomSummary>;
  joinRoom: (roomId: string) => Promise<RoomSummary>;
  leaveRoom: () => Promise<void>;
  clearNotice: () => void;
  loadVideo: (videoId: string) => void;
  play: (fromPosition: number) => void;
  pause: (atPosition: number) => void;
  seek: (toPosition: number) => void;
  sendMessage: (author: string, text: string) => void;
}

export const useRoomStore = create<RoomStore>((set, get) => {
  connection.on("RoomState", (state: RoomState) => set({ room: state }));
  connection.on("ChatHistory", (messages: ChatMessage[]) => set({ chat: messages }));
  connection.on("ChatMessage", (message: ChatMessage) =>
    set((s) => ({ chat: [...s.chat, message] }))
  );
  connection.on("RoomCreated", (summary: RoomSummary) =>
    set((s) => (s.rooms.some((r) => r.id === summary.id) ? s : { rooms: [...s.rooms, summary] }))
  );
  connection.on("RoomRemoved", (roomId: string) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) }))
  );
  connection.on("RoomCountChanged", (summary: RoomSummary) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === summary.id ? summary : r)),
      currentRoom: s.currentRoom?.id === summary.id ? summary : s.currentRoom,
    }))
  );
  connection.on("DjLeft", () =>
    set({
      currentRoom: null,
      djToken: null,
      room: emptyRoomState(),
      chat: [],
      notice: "The DJ left this room.",
    })
  );
  connection.onreconnected(() => set({ connected: true }));
  connection.onreconnecting(() => set({ connected: false }));
  started.then(() => set({ connected: true }));

  // Fire-and-forget hub calls: the RoomState/ChatMessage broadcast that
  // comes back from the server is what actually updates state, not the
  // return value of invoke() itself (except for the room-picker calls
  // below, which do return something useful).
  const call = (method: string, ...args: unknown[]) =>
    started.then(() => connection.invoke(method, ...args));

  return {
    rooms: [],
    currentRoom: null,
    djToken: null,
    room: emptyRoomState(),
    chat: [],
    connected: false,
    notice: null,

    listRooms: async () => {
      const rooms = await call("ListRooms");
      set({ rooms });
    },
    createRoom: async (name) => {
      const result: { id: string; name: string; djToken: string } = await call("CreateRoom", name);
      const summary: RoomSummary = { id: result.id, name: result.name, listenerCount: 0 };
      set({ currentRoom: summary, djToken: result.djToken });
      return summary;
    },
    joinRoom: async (roomId) => {
      const summary: RoomSummary = await call("JoinRoom", roomId);
      set({ currentRoom: summary, djToken: null });
      return summary;
    },
    leaveRoom: async () => {
      const roomId = get().currentRoom?.id;
      if (roomId) await call("LeaveRoom", roomId);
      set({ currentRoom: null, djToken: null, room: emptyRoomState(), chat: [] });
    },
    clearNotice: () => set({ notice: null }),

    loadVideo: (videoId) => {
      const roomId = get().currentRoom?.id;
      if (roomId) void call("LoadVideo", roomId, videoId);
    },
    play: (fromPosition) => {
      const roomId = get().currentRoom?.id;
      if (roomId) void call("Play", roomId, fromPosition);
    },
    pause: (atPosition) => {
      const roomId = get().currentRoom?.id;
      if (roomId) void call("Pause", roomId, atPosition);
    },
    seek: (toPosition) => {
      const roomId = get().currentRoom?.id;
      if (roomId) void call("Seek", roomId, toPosition);
    },
    sendMessage: (author, text) => {
      const roomId = get().currentRoom?.id;
      if (roomId) void call("SendMessage", roomId, author, text);
    },
  };
});
