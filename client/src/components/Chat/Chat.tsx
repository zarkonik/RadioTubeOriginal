import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "../../store/roomStore";
import "./Chat.css";

const NICKNAME_KEY = "radio2gether-nickname";

export default function Chat() {
  const chat = useRoomStore((s) => s.chat);
  const sendMessage = useRoomStore((s) => s.sendMessage);

  const [nickname, setNickname] = useState(() => sessionStorage.getItem(NICKNAME_KEY) ?? "");
  const [nicknameInput, setNicknameInput] = useState("");
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat]);

  function handleSetNickname() {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(NICKNAME_KEY, trimmed);
    setNickname(trimmed);
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(nickname, trimmed);
    setText("");
  }

  if (!nickname) {
    return (
      <div className="chat">
        <h2>Chat</h2>
        <div className="chat-nickname-row">
          <input
            type="text"
            placeholder="Pick a nickname"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSetNickname()}
          />
          <button onClick={handleSetNickname}>Join chat</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <h2>Chat</h2>

      <div className="chat-messages" ref={listRef}>
        {chat.map((m) => (
          <div key={m.id} className="chat-message">
            <span className="chat-author">{m.author}:</span> {m.text}
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Say something…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
