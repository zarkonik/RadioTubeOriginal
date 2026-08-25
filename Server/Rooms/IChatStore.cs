namespace Server.Rooms;

// In-memory only, on purpose — chat is ephemeral like a live stream's
// chat, not a persisted record. A rolling buffer just gives new joiners
// some recent context.
public interface IChatStore
{
    IReadOnlyList<ChatMessage> Add(string roomId, ChatMessage message);
    IReadOnlyList<ChatMessage> Get(string roomId);
}
