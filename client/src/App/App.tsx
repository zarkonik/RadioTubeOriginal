import { useState } from "react";
import RoomPlayer from "../components/RoomPlayer/RoomPlayer";
import RoomPicker from "../components/RoomPicker/RoomPicker";
import Chat from "../components/Chat/Chat";
import { useRoomStore } from "../store/roomStore";
import type { Role } from "../types/room";
import "./App.css";

// Public YouTube video explaining the site, shown above the role picker.
// Replace with the real video's id once it's uploaded.
const EXPLAINER_VIDEO_ID = "CJAVnFITGTg";

// Each device picks its own role, then either creates a room (DJ) or
// picks one from the live list (listener) before entering the player.
function App() {
  const [role, setRole] = useState<Role | null>(null);
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const djToken = useRoomStore((s) => s.djToken);
  const notice = useRoomStore((s) => s.notice);
  const clearNotice = useRoomStore((s) => s.clearNotice);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  return (
    <div className="page">
      <div className="room">
        <h1>Radio2Gether</h1>

        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={clearNotice}>Dismiss</button>
          </div>
        )}

        {role === null ? (
          <div className="landing">
            {EXPLAINER_VIDEO_ID && (
              <div className="explainer yt-aspect">
                <iframe
                  src={`https://www.youtube.com/embed/${EXPLAINER_VIDEO_ID}`}
                  title="How Radio2Gether works"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <div className="role-picker">
              <button className="btn-primary" onClick={() => setRole("dj")}>
                I'm the DJ
              </button>
              <button className="btn-primary" onClick={() => setRole("listener")}>
                I'm a listener
              </button>
            </div>
          </div>
        ) : currentRoom === null ? (
          <RoomPicker role={role} />
        ) : (
          // data-role/data-room-id/data-dj-token: read by the browser
          // extension's content script (extension/app-content.js) so it
          // knows which room — and with what proof of DJ ownership — to
          // send auto-detected videos to.
          <div
            data-role={role}
            data-room-id={currentRoom.id}
            data-dj-token={djToken ?? undefined}
          >
            <div className="room-header">
              <p className="room-name">
                {currentRoom.name}
                <span className="room-count">
                  {" "}
                  · {currentRoom.listenerCount}{" "}
                  {currentRoom.listenerCount === 1 ? "listener" : "listeners"}
                </span>
              </p>
              <button className="btn-ghost" onClick={() => leaveRoom()}>
                Leave room
              </button>
            </div>
            <div className="room-layout">
              <RoomPlayer role={role} />
              <Chat />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
