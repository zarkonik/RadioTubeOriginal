using Microsoft.AspNetCore.SignalR;

namespace Server.Rooms;

// Single global room for now ("default"). Multi-room support means
// passing a roomId into each method and joining that group instead —
// the store is already keyed by roomId so that change stays local to
// this file.
public class RoomHub : Hub
{
    private const string DefaultRoomId = "default";

    private readonly RoomService _room;

    public RoomHub(RoomService room)
    {
        _room = room;
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, DefaultRoomId);
        await Clients.Caller.SendAsync("RoomState", _room.GetState());
        await base.OnConnectedAsync();
    }

    public Task LoadVideo(string videoId) => _room.LoadVideo(videoId);
    public Task Play(double fromPosition) => _room.Play(fromPosition);
    public Task Pause(double atPosition) => _room.Pause(atPosition);
    public Task Seek(double toPosition) => _room.Seek(toPosition);
}
