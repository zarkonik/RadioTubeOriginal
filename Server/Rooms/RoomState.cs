namespace Server.Rooms;

// Mirrors client/src/types/room.ts — keep both in sync by hand for now.
public record RoomState
{
    public string? VideoId { get; init; }
    public bool IsPlaying { get; init; }
    public double PositionAtBroadcast { get; init; }
    public long ServerTime { get; init; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
