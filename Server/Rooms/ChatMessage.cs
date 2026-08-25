namespace Server.Rooms;

public record ChatMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Author { get; init; }
    public required string Text { get; init; }
    public long SentAt { get; init; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
