using System.Collections.Concurrent;

namespace Server.Rooms;

public class InMemoryRoomPresenceStore : IRoomPresenceStore
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _rooms = new();

    public void Join(string roomId, string connectionId)
    {
        var members = _rooms.GetOrAdd(roomId, _ => new ConcurrentDictionary<string, byte>());
        members[connectionId] = 0;
    }

    public void Leave(string roomId, string connectionId)
    {
        if (_rooms.TryGetValue(roomId, out var members))
            members.TryRemove(connectionId, out _);
    }

    public void Clear(string roomId) => _rooms.TryRemove(roomId, out _);

    public IReadOnlyList<string> LeaveAll(string connectionId)
    {
        var affected = new List<string>();
        foreach (var (roomId, members) in _rooms)
        {
            if (members.TryRemove(connectionId, out _)) affected.Add(roomId);
        }
        return affected;
    }

    public int Count(string roomId) => _rooms.TryGetValue(roomId, out var members) ? members.Count : 0;
}
