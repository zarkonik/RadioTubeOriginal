// Shape of the message the server (SignalR hub) broadcasts.
export interface RoomState {
  videoId: string | null;
  isPlaying: boolean;
  // Position (in seconds) at the moment of the last broadcast.
  positionAtBroadcast: number;
  // Server timestamp (ms, Date.now()-style) when the broadcast was sent.
  serverTime: number;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  sentAt: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  listenerCount: number;
}

export type Role = "dj" | "listener";
