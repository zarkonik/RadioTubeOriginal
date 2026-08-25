using Server.Rooms;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRoomStateStore, InMemoryRoomStateStore>();
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
// just fires a one-off "load this video" request.
app.MapPost("/api/room/load-video", async (LoadVideoRequest req, RoomService room) =>
{
    if (string.IsNullOrWhiteSpace(req.VideoId)) return Results.BadRequest();
    await room.LoadVideo(req.VideoId);
    return Results.Ok();
});

app.Run();

record LoadVideoRequest(string VideoId);
