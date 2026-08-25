namespace Server.Rooms;

// Abstracted so the in-memory implementation can be swapped for a
// Redis-backed one later without touching RoomHub.
public interface IRoomStateStore
{
    RoomState Get(string roomId);
    RoomState Set(string roomId, RoomState state);
}
