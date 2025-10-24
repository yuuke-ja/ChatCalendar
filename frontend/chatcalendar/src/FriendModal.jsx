import { useState, useEffect } from "react";

export default function FriendModal({ socketRef, socketReady, myEmail, onClose }) {
  const [text, setText] = useState("");
  const [friendList, setFriendList] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch('/api/favorite');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setFriendList(data || []);
      } catch (err) {
        console.error('お気に入り取得エラー:', err);
        setFriendList([]);
      }
    }

    fetchFavorites();

    // 🔄 ソケットイベント（リアルタイム追加）はそのまま維持
    const socket = socketRef?.current;
    if (!socket || !myEmail) return;

    socket.on("favorite-added", (data) => {
      if (data?.success) {
        setFriendList(prev => {
          if (prev.some(p => p.email === data.email)) return prev;
          return [...prev, { username: data.username, email: data.email }];
        });
        setMessage("✅ お気に入りに追加しました");
      } else if (data?.reason === "already") {
        setMessage("⚠️ すでに追加済みです");
      } else if (data?.reason === "notfound") {
        setMessage("❌ ユーザーが見つかりません");
      } else if (data?.reason === "self") {
        setMessage("❌ 自分自身は追加できません");
      } else {
        setMessage("❌ 追加に失敗しました");
      }
      setText("");
      setTimeout(() => setMessage(""), 3000);
    });

    return () => {
      socket.off("favorite-added");
    };
  }, [socketRef, socketReady, myEmail]);


  const handleSave = () => {
    if (!text.trim()) return;
    const socket = socketRef?.current;
    if (!socket) return;
    socket.emit("favorite-save", { targetEmail: text.trim(), myEmail });
  };

  return (
    <div className="friend-overlay">
      <div className="friend-modal">
        <div className="friend-header">
          <h2>お気に入り</h2>
          <button className="friend-close" onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        {message && <p className="favorite-message">{message}</p>}

        <div className="friend-form">
          <input
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="メールアドレスを入力"
            className="friend-input"
          />
          <button className="friend-add" onClick={handleSave}>追加</button>
        </div>

        <div className="friend-divider" />

        <div id="friendlist" className="friend-list">
          {friendList.length === 0 ? (
            <p className="friend-empty">お気に入りメンバーを追加しよう</p>
          ) : (
            friendList.map((f, i) => (
              <div key={i} className="friend-item">
                <span className="friend-name">{f.username}</span>
                <span className="friend-email">{f.email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
