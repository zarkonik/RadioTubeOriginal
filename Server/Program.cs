using Server.Rooms;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRoomStateStore, InMemoryRoomStateStore>();

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

app.Run();
