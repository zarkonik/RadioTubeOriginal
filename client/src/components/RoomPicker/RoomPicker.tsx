import { useEffect, useState } from "react";
import { useRoomStore } from "../../store/roomStore";
import type { Role } from "../../types/room";
import "./RoomPicker.css";

interface Props {
  role: Role;
}

// DJ: name a new room and create it. Listener: pick from the live list
// of rooms currently open (updated via RoomCreated/RoomRemoved
// broadcasts, seeded once here with a snapshot fetch).
export default function RoomPicker({ role }: Props) {
  const rooms = useRoomStore((s) => s.rooms);
  const listRooms = useRoomStore((s) => s.listRooms);
  const createRoom = useRoomStore((s) => s.createRoom);
  const joinRoom = useRoomStore((s) => s.joinRoom);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === "listener") listRooms();
  }, [role, listRooms]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createRoom(trimmed);
    } catch {
      setError("Couldn't create the room. Try again.");
    }
  }

  async function handleJoin(roomId: string) {
    try {
      await joinRoom(roomId);
    } catch {
      setError("That room is gone. Pick another one.");
      listRooms();
    }
  }

  if (role === "dj") {
    return (
      <div className="room-picker">
        <h2>Create a room</h2>
        <div className="room-picker-row">
          <input
            type="text"
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button onClick={handleCreate}>Create</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="room-picker">
      <h2>Pick a room</h2>
      {error && <p className="error">{error}</p>}
      {rooms.length === 0 ? (
        <p className="room-picker-empty">No rooms open right now.</p>
      ) : (
        <ul className="room-picker-list">
          {rooms.map((r) => (
            <li key={r.id}>
              <span>
                {r.name}
                <span className="room-picker-count">
                  {" "}
                  · {r.listenerCount} {r.listenerCount === 1 ? "listener" : "listeners"}
                </span>
              </span>
              <button onClick={() => handleJoin(r.id)}>Join</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
