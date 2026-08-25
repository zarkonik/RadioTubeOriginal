// Shape of the message the server (SignalR hub) will broadcast.
// For now it's populated by the mock broadcast store; later it's filled
// by the SignalR client.
export interface RoomState {
  videoId: string | null;
  isPlaying: boolean;
  // Position (in seconds) at the moment of the last broadcast.
  positionAtBroadcast: number;
  // Server timestamp (ms, Date.now()-style) when the broadcast was sent.
  serverTime: number;
}

export type Role = "dj" | "listener";
