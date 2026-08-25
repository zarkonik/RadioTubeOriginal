using System.Collections.Concurrent;

namespace Server.Rooms;

public class InMemoryRoomStateStore : IRoomStateStore
{
    private readonly ConcurrentDictionary<string, RoomState> _rooms = new();

    public RoomState Get(string roomId) =>
        _rooms.GetOrAdd(roomId, _ => new RoomState());

    public RoomState Set(string roomId, RoomState state)
    {
        _rooms[roomId] = state;
        return state;
    }
}
