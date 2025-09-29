import { useEffect, useRef, useState } from "react";

export default function ChatModal({ socket, roomId, selectedDate, myEmail, closeModal }) {

  const [chatList, setChatList] = useState(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const previewRef = useRef(null);
  const chatHistoryRef = useRef(null); // 👈 追加：チャット履歴へのref
  const [screenImage, setscreenImage] = useState(null);

  // 一番下にスクロールする関数
  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  // 日付変更 or 初回でチャット読み込み
  useEffect(() => {
    if (!selectedDate) return;
    console.log("📥 ChatModal 初期化:", { roomId, selectedDate, socketConnected: socket?.connected });
    (async () => {
      try {
        const res = await fetch(`/getchat?date=${selectedDate}`);
        const { chat } = await res.json();
        setChatList(Array.isArray(chat) ? chat : []);
        console.log("💬 チャット履歴取得結果:", chat);
        setTimeout(scrollToBottom, 50); // 👈 読み込み後にスクロール
      } catch (e) {
        console.error("チャット取得失敗:", e);
      }
    })();
  }, [selectedDate]);

  // newchat を受けて同日の場合のみ追記
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      console.log("✨ newchat受信:", data);
      if (data?.date === selectedDate && data?.chat) {
        setChatList((prev) => [...prev, data.chat]);
        setTimeout(scrollToBottom, 50); // 👈 新規メッセージ受信後にスクロール
      }
    };
    socket.on("newchat", handler);
    return () => socket.off("newchat", handler);
  }, [socket, selectedDate]);

  // 画像プレビュー
  const onPickImage = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    const preview = previewRef.current;
    if (preview) {
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.src = ev.target.result;
          preview.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        preview.src = "";
        preview.style.display = "none";
      }
    }
  };

  const handleSend = async () => {
    if (!socket) return;
    if ((!text || text.trim() === "") && !imageFile) {
      return;
    }
    let imageUrl = null;

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      try {
        const res = await fetch("/upload-image", { method: "POST", body: formData });
        const result = await res.json();
        imageUrl = result.imageUrl;
      } catch (err) {
        alert("画像のアップロードに失敗しました");
        return;
      }
    }
    console.log("送信前のchatデータ:", {
      roomId,
      date: selectedDate,
      chat: text.trim(),
      imageUrl,
      email: myEmail
    });

    socket.emit("savechat", {
      roomId,
      date: selectedDate,
      chat: text.trim(),
      imageUrl,
      email: myEmail
    });

    setText("");
    setImageFile(null);
    if (previewRef.current) {
      previewRef.current.src = "";
      previewRef.current.style.display = "none";
    }
  };

  return (
    <div id="chatmodal" className="chatmodal" style={{ display: "block" }}>
      <div className="modal-header">
        <span id="modal-date">{selectedDate}</span>
        <button onClick={closeModal}>閉じる</button>
      </div>

      {/* 👇 chatHistoryRef をバインド */}
      <div id="chatwrite" className="chat-history" ref={chatHistoryRef}>
        {chatList === null ? null : chatList.length > 0 ? (
          chatList.map((c, i) => {
            const hasContent = c.content && c.content.trim() !== "";
            const hasImage = c.imageUrl && c.imageUrl.trim() !== "";
            let userclass = "none";
            if (hasContent || hasImage) {
              userclass = c.email === myEmail ? "myuser" : "othersuser";
              console.log(`${c.email},${myEmail}`)
            }
            return (
              <div key={i} className={userclass}>
                <p className="date">{new Date(c.createdAt).toLocaleString()}</p>
                <p className="user">{c.postedBy}</p>
                {hasContent && <p className="content">{c.content}</p>}
                {hasImage && <img src={c.imageUrl} alt="投稿画像" className="chat-image" onClick={() => setscreenImage(c.imageUrl)} />}
              </div>

            );
          })
        ) : (
          <p>この日のチャットはありません。</p>
        )}
      </div>
      {screenImage && (
        <div className="screen-overlay" onClick={() => setscreenImage(null)}>
          <img src={screenImage} alt="拡大画像" className="screen-image" onClick={(e) => e.stopPropagation()} />
          <button className="screen-close" onClick={() => setscreenImage(null)}>x</button>
          <a href={screenImage} download className="download-button" onClick={(e) => e.stopPropagation()}>⬇ ダウンロード</a>
        </div>
      )}
      <div className="modal-input">
        <textarea
          id="chat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
        />
        <input id="image-upload" type="file" accept="image/png,image/jpeg" onChange={onPickImage} />
        <img id="preview" ref={previewRef} alt="プレビュー" style={{ display: "none", maxWidth: 240 }} />
        <button id="save" onClick={handleSend}>送信</button>
      </div>
    </div>
  );
}
