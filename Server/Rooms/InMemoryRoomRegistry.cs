using System.Collections.Concurrent;

namespace Server.Rooms;

public class InMemoryRoomRegistry : IRoomRegistry
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new();

    public Room Create(string name, string djConnectionId)
    {
        var room = new Room
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            DjConnectionId = djConnectionId,
            DjToken = Guid.NewGuid().ToString("N"),
        };
        _rooms[room.Id] = room;
        return room;
    }

    public Room? Get(string roomId) => _rooms.GetValueOrDefault(roomId);

    public IReadOnlyList<Room> GetAll() => _rooms.Values.ToList();

    public Room? RemoveByConnection(string connectionId)
    {
        var room = _rooms.Values.FirstOrDefault(r => r.DjConnectionId == connectionId);
        if (room is not null) _rooms.TryRemove(room.Id, out _);
        return room;
    }
}
