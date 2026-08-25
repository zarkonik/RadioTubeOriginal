using Microsoft.AspNetCore.SignalR;

namespace Server.Rooms;

// Single global room for now ("default"). Multi-room support means
// passing a roomId into each method and joining that group instead —
// the store is already keyed by roomId so that change stays local to
// this file.
public class RoomHub : Hub
{
    private const string DefaultRoomId = "default";

    private readonly IRoomStateStore _store;

    public RoomHub(IRoomStateStore store)
    {
        _store = store;
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, DefaultRoomId);
        await Clients.Caller.SendAsync("RoomState", _store.Get(DefaultRoomId));
        await base.OnConnectedAsync();
    }

    public async Task LoadVideo(string videoId)
    {
        var state = new RoomState
        {
            VideoId = videoId,
            IsPlaying = true,
            PositionAtBroadcast = 0,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        await Broadcast(state);
    }

    public async Task Play(double fromPosition)
    {
        var current = _store.Get(DefaultRoomId);
        var state = current with
        {
            IsPlaying = true,
            PositionAtBroadcast = fromPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        await Broadcast(state);
    }

    public async Task Pause(double atPosition)
    {
        var current = _store.Get(DefaultRoomId);
        var state = current with
        {
            IsPlaying = false,
            PositionAtBroadcast = atPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        await Broadcast(state);
    }

    public async Task Seek(double toPosition)
    {
        var current = _store.Get(DefaultRoomId);
        var state = current with
        {
            PositionAtBroadcast = toPosition,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };
        await Broadcast(state);
    }

    private async Task Broadcast(RoomState state)
    {
        _store.Set(DefaultRoomId, state);
        await Clients.Group(DefaultRoomId).SendAsync("RoomState", state);
    }
}
