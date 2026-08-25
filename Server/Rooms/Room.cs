namespace Server.Rooms;

public record Room
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string DjConnectionId { get; init; }
    // Proves REST calls (from the browser extension) actually come from
    // this room's DJ — SignalR hub calls are authorized via
    // DjConnectionId instead, since those have a real connection to
    // check against.
    public required string DjToken { get; init; }
}

// What listeners see in the room list — no internal connection details.
public record RoomSummary(string Id, string Name, int ListenerCount);

// Returned only to the DJ when they create the room — includes the
// token nobody else ever sees.
public record RoomCreatedResult(string Id, string Name, string DjToken);
