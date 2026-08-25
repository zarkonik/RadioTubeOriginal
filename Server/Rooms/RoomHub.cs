using Microsoft.AspNetCore.SignalR;

namespace Server.Rooms;

// Every connection joins a "lobby" group on connect, used only to
// broadcast room list changes (created/removed/listener count) to
// everyone — both people still browsing the picker and people already
// inside a room, since nobody is ever removed from "lobby" once joined.
// Joining an actual room's group happens explicitly via
// CreateRoom/JoinRoom, once the client has picked one.
public class RoomHub : Hub
{
    private const string LobbyGroup = "lobby";

    private readonly RoomService _room;
    private readonly IRoomRegistry _registry;
    private readonly IRoomPresenceStore _presence;

    public RoomHub(RoomService room, IRoomRegistry registry, IRoomPresenceStore presence)
    {
        _room = room;
        _registry = registry;
        _presence = presence;
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, LobbyGroup);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var removed = _registry.RemoveByConnection(Context.ConnectionId);
        if (removed is not null)
        {
            await CloseRoom(removed);
        }
        else
        {
            // Not a DJ — might still have been a listener in one or more
            // rooms (browser refresh, tab close, etc.).
            foreach (var roomId in _presence.LeaveAll(Context.ConnectionId))
            {
                if (_registry.Get(roomId) is { } room) await BroadcastCount(room);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public IReadOnlyList<RoomSummary> ListRooms() => _registry.GetAll().Select(Summarize).ToList();

    public async Task<RoomCreatedResult> CreateRoom(string name)
    {
        name = name.Trim();
        if (name.Length == 0) throw new HubException("Room name can't be empty.");
        if (name.Length > 50) name = name[..50];

        var room = _registry.Create(name, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, room.Id);
        _presence.Join(room.Id, Context.ConnectionId);
        await Clients.Caller.SendAsync("RoomState", _room.GetState(room.Id));
        await Clients.Caller.SendAsync("ChatHistory", _room.GetChatHistory(room.Id));

        // Broadcast to the lobby carries no token — only the caller
        // (the DJ) gets that, in the return value below.
        await Clients.Group(LobbyGroup).SendAsync("RoomCreated", Summarize(room));
        return new RoomCreatedResult(room.Id, room.Name, room.DjToken);
    }

    public async Task<RoomSummary> JoinRoom(string roomId)
    {
        var room = _registry.Get(roomId) ?? throw new HubException("Room not found.");

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        _presence.Join(roomId, Context.ConnectionId);
        await Clients.Caller.SendAsync("RoomState", _room.GetState(roomId));
        await Clients.Caller.SendAsync("ChatHistory", _room.GetChatHistory(roomId));
        await BroadcastCount(room);

        return Summarize(room);
    }

    // If the DJ leaves, the room closes for everyone (there's no video
    // source without them) — otherwise it's just this one listener
    // stepping out, room keeps going for the rest.
    public async Task LeaveRoom(string roomId)
    {
        var room = _registry.Get(roomId);
        if (room is not null && room.DjConnectionId == Context.ConnectionId)
        {
            _registry.RemoveByConnection(Context.ConnectionId);
            await CloseRoom(room);
        }
        else
        {
            _presence.Leave(roomId, Context.ConnectionId);
            if (room is not null) await BroadcastCount(room);
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    public Task LoadVideo(string roomId, string videoId)
    {
        RequireDj(roomId);
        return _room.LoadVideo(roomId, videoId);
    }

    public Task Play(string roomId, double fromPosition)
    {
        RequireDj(roomId);
        return _room.Play(roomId, fromPosition);
    }

    public Task Pause(string roomId, double atPosition)
    {
        RequireDj(roomId);
        return _room.Pause(roomId, atPosition);
    }

    public Task Seek(string roomId, double toPosition)
    {
        RequireDj(roomId);
        return _room.Seek(roomId, toPosition);
    }

    public Task SendMessage(string roomId, string author, string text)
    {
        author = author.Trim();
        text = text.Trim();
        if (author.Length == 0 || text.Length == 0) return Task.CompletedTask;

        if (author.Length > 30) author = author[..30];
        if (text.Length > 500) text = text[..500];

        return _room.SendMessage(roomId, author, text);
    }

    // Only the connection that created the room may control its
    // playback — everyone else connected is a listener, no matter what
    // hub method they try to call directly.
    private void RequireDj(string roomId)
    {
        var room = _registry.Get(roomId) ?? throw new HubException("Room not found.");
        if (room.DjConnectionId != Context.ConnectionId)
            throw new HubException("Only the DJ can control playback.");
    }

    // Listener count excludes the DJ themself — it's "how many people
    // are listening", not "how many connections are in the group".
    private RoomSummary Summarize(Room room) =>
        new(room.Id, room.Name, Math.Max(0, _presence.Count(room.Id) - 1));

    private Task BroadcastCount(Room room) =>
        Clients.Group(LobbyGroup).SendAsync("RoomCountChanged", Summarize(room));

    private async Task CloseRoom(Room room)
    {
        _presence.Clear(room.Id);
        await Clients.Group(LobbyGroup).SendAsync("RoomRemoved", room.Id);
        await Clients.Group(room.Id).SendAsync("DjLeft");
    }
}
