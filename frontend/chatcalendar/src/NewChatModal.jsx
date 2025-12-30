import React, { useState } from "react";
import "./NewChatModal.css";

export default function NewChatModal({ onClose, socket }) {
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= 20) {
      setChatId(value);
      setError("");
    } else {
      setError("チャット名は20文字以内で入力してください");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (chatId.trim() === "") {
      setError("チャット名を入力してください");
      return;
    }

    const chatid = chatId;
    setChatId("");   // 入力欄リセット
    onClose();       // モーダル即閉じ
    if (!socket) {
      alert("接続中です。しばらくしてから再度お試しください。");
      return;
    }
    socket.emit("/newchat", { chatid })

  };

  return (
    <div className="newchatoverlay">
      <div className="newchat">
        <button className="newchatclose" onClick={onClose}>
          ✖️
        </button>
        <h1>新規ルーム作成</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="chatid">チャット名</label>
          <input
            type="text"
            name="chatid"
            value={chatId}
            onChange={handleChange}
            required
            placeholder="20文字以内"
          />
          <p
            style={{
              fontSize: "0.9em",
              color: chatId.length >= 18 ? "red" : "gray",
              marginTop: "4px",
            }}
          >
            {chatId.length}/20
          </p>

          <button type="submit">
            作成
          </button>
        </form>

        {error && <p style={{ color: "red", marginTop: "8px" }}>{error}</p>}
      </div>
    </div>
  );
}
