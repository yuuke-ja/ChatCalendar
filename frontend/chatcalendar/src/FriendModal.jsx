import { useState, useEffect } from "react";

export default function FriendModal({ socket, onClose }) {
  const [text, setText] = useState("");
  const [friendList, setFriendList] = useState([]);

  useEffect(() => {
    async function fetchFriends() {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setFriendList(data); // 初期フレンド一覧を保存
    }
    fetchFriends();
    if (!socket) return;

    socket.on("newfriend", (data) => {
      setFriendList((prev) => [...prev, data.friendname]);
    });

    return () => {
      socket.off("newfriend");
    };
  }, [socket]);

  const handleSave = () => {
    if (!text.trim()) return;
    socket.emit("friend", { friendlist: text });
    setText(""); // 入力クリア
  };

  return (
    <div className="friend-overlay">
      <div className="friend">
        <button className="close" onClick={onClose}>✕</button>
        <h2>Friend</h2>
        <input
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="友達を追加"
          className="friend-input"
        />
        <button onClick={handleSave}>追加</button>

        <div id="friendlist">
          {friendList.map((f, i) => (
            <p key={i} className="newfriend">{f}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
