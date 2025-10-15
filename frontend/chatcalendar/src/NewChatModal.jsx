import React, { useState } from "react";

export default function NewChatModal({ onClose }) {
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/newchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatid: chatId })
      });
      if (res.ok) {
        onClose();
        setChatId("");
      } else {
        setError(await res.text() || "チャット作成に失敗しました");
      }
    } catch (err) {
      console.error("チャット作成エラー:", err);
      setError("通信エラーが発生しました");
    }
  };

  return (
    <div className="newchatoverlay">
      <div className="newchat">
        <button className="newchatclose" onClick={onClose}>✖️</button>
        <h1>新規カレンダー作成</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="chatid">チャット名</label>
          <input type="text" name="chatid" value={chatId} onChange={(e) => setChatId(e.target.value)} required />
          <button type="submit">作成</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
}
