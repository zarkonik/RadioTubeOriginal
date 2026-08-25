import { useState } from "react";
import RoomPlayer from "../components/RoomPlayer/RoomPlayer";
import type { Role } from "../types/room";
import "./App.css";

// Each device picks its own role against the shared SignalR room, so a
// phone only ever sees the listener view.
function App() {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div className="room">
      <h1>RadioTube</h1>
      {role === null ? (
        <div className="role-picker">
          <button onClick={() => setRole("dj")}>I'm the DJ</button>
          <button onClick={() => setRole("listener")}>I'm a listener</button>
        </div>
      ) : (
        <RoomPlayer role={role} />
      )}
    </div>
  );
}

export default App;
