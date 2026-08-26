using Microsoft.AspNetCore.SignalR;

namespace Server.Rooms;

// Broadcast logic shared by RoomHub (calls from connected clients) and
// the REST endpoint (calls from the browser extension, which isn't a
// SignalR client). Only handles per-room playback/chat state — group
// membership (who's in which room) is the Hub's job, since that needs
// the Hub's Context/Groups.
public class RoomService
{
    private readonly IRoomStateStore _store;
    private readonly IChatStore _chat;
    private readonly IHubContext<RoomHub> _hub;

    public RoomService(IRoomStateStore store, IChatStore chat, IHubContext<RoomHub> hub)
    {
        _store = store;
        _chat = chat;
        _hub = hub;
    }

    public Task LoadVideo(string roomId, string videoId)
    {
        var state = new RoomState
        {
            VideoId = videoId,
            IsPlaying = true,
            PositionAtBroadcast = 0,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(roomId, state);
    }

    public Task Play(string roomId, double fromPosition)
    {
        var state = _store.Get(roomId) with
        {
            IsPlaying = true,
            PositionAtBroadcast = fromPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(roomId, state);
    }

    public Task Pause(string roomId, double atPosition)
    {
        var state = _store.Get(roomId) with
        {
            IsPlaying = false,
            PositionAtBroadcast = atPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(roomId, state);
    }

    public Task Seek(string roomId, double toPosition)
    {
        var state = _store.Get(roomId) with
        {
            PositionAtBroadcast = toPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(roomId, state);
    }

    public RoomState GetState(string roomId) => _store.Get(roomId);

    public IReadOnlyList<ChatMessage> GetChatHistory(string roomId) => _chat.Get(roomId);

    public async Task SendMessage(string roomId, string author, string text)
    {
        var message = new ChatMessage { Author = author, Text = text };
        _chat.Add(roomId, message);
        await _hub.Clients.Group(roomId).SendAsync("ChatMessage", message);
    }

    private async Task Broadcast(string roomId, RoomState state)
    {
        _store.Set(roomId, state);
        await _hub.Clients.Group(roomId).SendAsync("RoomState", state);
    }
}
