import type { RoomState } from "../types/room";

// Where the player SHOULD be right now, based on the last broadcast.
export function getTargetPosition(room: RoomState, now: number): number {
  if (!room.isPlaying) return room.positionAtBroadcast;
  const elapsedSec = (now - room.serverTime) / 1000;
  return room.positionAtBroadcast + elapsedSec;
}

export const DRIFT_HARD_SEEK_SEC = 1.0; // beyond this -> hard seek
export const DRIFT_SOFT_CORRECT_SEC = 0.3; // beyond this -> gentle rate correction

export type DriftAction =
  | { type: "none" }
  | { type: "seek"; to: number }
  | { type: "rate"; rate: number };

// Decides what to do with the player based on the gap between actual and target position.
export function resolveDrift(actual: number, target: number): DriftAction {
  const diff = target - actual; // positive = we're behind, speed up / jump forward

  if (Math.abs(diff) > DRIFT_HARD_SEEK_SEC) {
    return { type: "seek", to: target };
  }
  if (Math.abs(diff) > DRIFT_SOFT_CORRECT_SEC) {
    return { type: "rate", rate: diff > 0 ? 1.02 : 0.98 };
  }
  return { type: "none" };
}
