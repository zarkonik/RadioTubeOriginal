using Server.Rooms;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRoomStateStore, InMemoryRoomStateStore>();
builder.Services.AddSingleton<IChatStore, InMemoryChatStore>();
builder.Services.AddSingleton<IRoomRegistry, InMemoryRoomRegistry>();
builder.Services.AddSingleton<IRoomPresenceStore, InMemoryRoomPresenceStore>();
builder.Services.AddScoped<RoomService>();

// Dev-only: SignalR's negotiate request sends credentials, which is
// incompatible with AllowAnyOrigin — so any origin is allowed via
// SetIsOriginAllowed instead, letting the phone (LAN IP:5173) and
// laptop (localhost:5173) both connect.
const string DevCorsPolicy = "DevCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(DevCorsPolicy);

app.MapHub<RoomHub>("/hubs/room");

// Called by the browser extension, which isn't a SignalR client — it
// just fires a one-off "load this video" request into whichever room
// the DJ armed the extension for. X-Dj-Token proves the caller actually
// is that room's DJ (the extension picks it up automatically from the
// app page — see extension/app-content.js).
app.MapPost("/api/rooms/{roomId}/load-video", async (string roomId, LoadVideoRequest req, HttpRequest http, RoomService room, IRoomRegistry registry) =>
{
    if (string.IsNullOrWhiteSpace(req.VideoId)) return Results.BadRequest();

    var target = registry.Get(roomId);
    if (target is null) return Results.NotFound();

    var token = http.Headers["X-Dj-Token"].ToString();
    if (token != target.DjToken) return Results.Unauthorized();

    await room.LoadVideo(roomId, req.VideoId);
    return Results.Ok();
});

app.Run();

record LoadVideoRequest(string VideoId);
