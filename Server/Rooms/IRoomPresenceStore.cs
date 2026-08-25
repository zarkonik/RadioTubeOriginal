namespace Server.Rooms;

// Tracks which connections are currently inside which room's group, so
// a listener count can be shown without SignalR itself exposing group
// membership queries.
public interface IRoomPresenceStore
{
    void Join(string roomId, string connectionId);
    void Leave(string roomId, string connectionId);
    void Clear(string roomId);

    // For disconnects: which rooms (if any) had this connection in
    // them, removed from all of them in one pass.
    IReadOnlyList<string> LeaveAll(string connectionId);

    int Count(string roomId);
}
