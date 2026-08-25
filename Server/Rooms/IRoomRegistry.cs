namespace Server.Rooms;

public interface IRoomRegistry
{
    Room Create(string name, string djConnectionId);
    Room? Get(string roomId);
    IReadOnlyList<Room> GetAll();

    // Called on DJ disconnect to clean up the room they created.
    Room? RemoveByConnection(string connectionId);
}
