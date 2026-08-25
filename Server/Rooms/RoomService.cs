using Microsoft.AspNetCore.SignalR;

namespace Server.Rooms;

// Broadcast logic shared by RoomHub (calls from connected clients) and
// the REST endpoint (calls from the browser extension, which isn't a
// SignalR client).
public class RoomService
{
    private const string DefaultRoomId = "default";

    private readonly IRoomStateStore _store;
    private readonly IHubContext<RoomHub> _hub;

    public RoomService(IRoomStateStore store, IHubContext<RoomHub> hub)
    {
        _store = store;
        _hub = hub;
    }

    public Task LoadVideo(string videoId)
    {
        var state = new RoomState
        {
            VideoId = videoId,
            IsPlaying = true,
            PositionAtBroadcast = 0,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(state);
    }

    public Task Play(double fromPosition)
    {
        var state = _store.Get(DefaultRoomId) with
        {
            IsPlaying = true,
            PositionAtBroadcast = fromPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(state);
    }

    public Task Pause(double atPosition)
    {
        var state = _store.Get(DefaultRoomId) with
        {
            IsPlaying = false,
            PositionAtBroadcast = atPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(state);
    }

    public Task Seek(double toPosition)
    {
        var state = _store.Get(DefaultRoomId) with
        {
            PositionAtBroadcast = toPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        return Broadcast(state);
    }

    public RoomState GetState() => _store.Get(DefaultRoomId);

    private async Task Broadcast(RoomState state)
    {
        _store.Set(DefaultRoomId, state);
        await _hub.Clients.Group(DefaultRoomId).SendAsync("RoomState", state);
    }
}
