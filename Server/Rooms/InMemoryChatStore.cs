using System.Collections.Concurrent;

namespace Server.Rooms;

public class InMemoryChatStore : IChatStore
{
    private const int MaxMessagesPerRoom = 50;

    private readonly ConcurrentDictionary<string, List<ChatMessage>> _rooms = new();

    public IReadOnlyList<ChatMessage> Add(string roomId, ChatMessage message)
    {
        var messages = _rooms.GetOrAdd(roomId, _ => []);
        lock (messages)
        {
            messages.Add(message);
            if (messages.Count > MaxMessagesPerRoom)
                messages.RemoveAt(0);
            return messages.ToList();
        }
    }

    public IReadOnlyList<ChatMessage> Get(string roomId)
    {
        var messages = _rooms.GetOrAdd(roomId, _ => []);
        lock (messages)
        {
            return messages.ToList();
        }
    }
}
