import { useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function ChatModal({ socket, roomId, selectedDate, myEmail, closeModal }) {
  const [chatList, setChatList] = useState(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const previewRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const [screenImage, setscreenImage] = useState(null);
  const [reactionmessageid, setreactionmessageid] = useState(null);
  const [viewpicker, setviewpicker] = useState(false);
  const pickerRef = useRef(null);

  const [showAllReactions, setShowAllReactions] = useState(null); // null or { messageId, reactions }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setviewpicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 絵文字をグループ化
  function gropReactions(reactions) {
    const group = {};
    reactions.forEach((r) => {
      if (!group[r.emoji]) group[r.emoji] = { users: [], emails: [] };
      group[r.emoji].users.push(r.user.username);
      group[r.emoji].emails.push(r.user.email)
    });
    return group;
  }

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const reactionHandler = (data) => {
      console.log("ユーザ情報", data.reaction);
      setChatList((prev) =>
        prev.map((chat) => {
          if (chat.id === data.reaction.messageId) {
            if (data.type === "true") {
              return { ...chat, reactions: [...(chat.reactions || []), data.reaction] };
            } else {
              return {
                ...chat,
                reactions: (chat.reactions || []).filter((r) => r.id !== data.reaction.id),
              };
            }
          }
          return chat;
        })
      );
    };

    socket.on("newreaction", reactionHandler);
    return () => socket.off("newreaction", reactionHandler);
  }, [socket]);

  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      try {
        const res = await fetch(`/getchat?date=${selectedDate}`);
        const { chat } = await res.json();
        setChatList(Array.isArray(chat) ? chat : []);//配列かどうか調べる。一応
        setTimeout(scrollToBottom, 50);
      } catch (e) {
        console.error("チャット取得失敗:", e);
      }
    })();
  }, [selectedDate]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      if (data?.date === selectedDate && data?.chat) {
        setChatList((prev) => [...prev, data.chat]);//コピーして保存
        setTimeout(scrollToBottom, 50);
      }
    };

    socket.on("newchat", handler);
    return () => socket.off("newchat", handler);
  }, [socket, selectedDate]);

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

  const saveReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit("savereaction", { messageId, emoji, roomId, email: myEmail });
  };

  const handleSend = async () => {
    if (!socket) return;
    if ((!text || text.trim() === "") && !imageFile) return;

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

    socket.emit("savechat", {
      roomId,
      date: selectedDate,
      chat: text.trim(),
      imageUrl,
      email: myEmail,
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

      <div id="chatwrite" className="chat-history" ref={chatHistoryRef}>
        {chatList === null ? null : chatList.length > 0 ? (
          chatList.map((c) => {
            const hasContent = c.content && c.content.trim() !== "";
            const hasImage = c.imageUrl && c.imageUrl.trim() !== "";
            let userclass = "none";
            if (hasContent || hasImage) {
              userclass = c.email === myEmail ? "myuser" : "othersuser";
            }

            return (
              <div key={c.id} className={userclass}>
                <p className="date">{new Date(c.createdAt).toLocaleString()}</p>
                <p className="user">{c.postedBy}</p>

                {hasContent && (
                  <div
                    className="content"
                    onMouseEnter={() => setreactionmessageid(c.id)}
                    onMouseLeave={() => setreactionmessageid(null)}
                  >
                    {c.content}
                  </div>
                )}

                {hasImage && (
                  <img
                    src={c.imageUrl}
                    alt="投稿画像"
                    className="chat-image"
                    onClick={() => setscreenImage(c.imageUrl)}
                  />
                )}
                <div className="reactions-area">
                  {(() => {
                    const u = Object.entries(gropReactions(c.reactions || []))
                      .map(([emoji, data]) => ({ emoji, users: data.users, emails: data.emails }));
                    const visibleReactions = u.slice(-5);
                    const hiddenCount = Math.max(0, u.length - visibleReactions.length);

                    return (
                      <>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          {/* ここがピッカーを出す元の + ボタン（常に表示） */}
                          <button
                            key={`picker-add-${c.id}`}
                            className="reaction-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              setreactionmessageid(c.id);
                              setviewpicker(true);
                            }}
                            title="リアクションを追加"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#999999"><path d="M620-520q25 0 42.5-17.5T680-580q0-25-17.5-42.5T620-640q-25 0-42.5 17.5T560-580q0 25 17.5 42.5T620-520Zm-280 0q25 0 42.5-17.5T400-580q0-25-17.5-42.5T340-640q-25 0-42.5 17.5T280-580q0 25 17.5 42.5T340-520Zm140 260q68 0 123.5-38.5T684-400h-66q-22 37-58.5 58.5T480-320q-43 0-79.5-21.5T342-400h-66q25 63 80.5 101.5T480-260Zm0 180q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z" /></svg>
                          </button>
                          {/* visible reactions */}
                          {visibleReactions.map((item, idx) => {
                            const reacted = (item.emails || []).includes(myEmail);
                            return (
                              <button
                                key={`${item.emoji}-${idx}`}
                                className={`reaction-btn ${reacted ? "reacted" : ""}`}
                                onClick={() => saveReaction(c.id, item.emoji)}
                                title={(item.users || []).join(", ")}
                              >
                                <span className="emoji">{item.emoji}</span>
                                <span className="count">{(item.users || []).length}</span>
                              </button>
                            );
                          })}


                          {/* 5個以上がある場合、隠れている数を示す＋Xボタン（全リアクションを表示するモーダルを開く） */}
                          {hiddenCount > 0 && (
                            <button
                              key={`more-${c.id}`}
                              className="reaction-more"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAllReactions({ messageId: c.id, reactions: u });
                              }}
                              style={{
                                width: "10px",
                                height: "10px",
                              }}
                            >
                              …
                            </button>
                          )}
                        </div>

                        {/* 全リアクション表示モーダル */}
                        {showAllReactions?.messageId === c.id && (
                          <div
                            className="reaction-modal-overlay"
                            onClick={() => setShowAllReactions(null)}
                            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9998 }}
                          >
                            <div
                              className="reaction-modal"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "fixed",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                background: "#fff",
                                padding: "16px",
                                borderRadius: "8px",
                                zIndex: 9999,
                                maxWidth: "90%",
                                maxHeight: "80%",
                                overflow: "auto",
                              }}
                            >
                              <h4 style={{ marginTop: 0 }}>リアクション</h4>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {u.map((item, idx) => {
                                  const reacted = (item.users || []).includes(myEmail);
                                  return (
                                    <button
                                      key={`${item.emoji}-modal-${idx}`}
                                      className={`reaction-btn ${reacted ? "reacted" : ""}`}
                                      onClick={() => saveReaction(c.id, item.emoji)}
                                      title={(item.users || []).join(", ")}
                                    >
                                      <span className="emoji">{item.emoji}</span>
                                      <span className="count">{(item.users || []).length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 既存のピッカー表示（変更なし） */}
                        {viewpicker && reactionmessageid === c.id && (
                          <>
                            <div
                              className="emoji-overlay"
                              onMouseDown={() => setviewpicker(false)}
                              style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.3)" }}
                            />
                            <div
                              ref={pickerRef}
                              className="picker-wrapper-fixed"
                              style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 }}
                            >
                              <Picker
                                data={data}
                                onEmojiSelect={(emoji) => {
                                  saveReaction(c.id, emoji.native);
                                  setviewpicker(false);
                                }}
                              />
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })
        ) : (
          <p>この日のチャットはありません。</p>
        )}
      </div>

      {screenImage && (
        <div className="screen-overlay" onClick={() => setscreenImage(null)}>
          <img
            src={screenImage}
            alt="拡大画像"
            className="screen-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="screen-close" onClick={() => setscreenImage(null)}>
            x
          </button>
          <a
            href={screenImage}
            download
            className="download-button"
            onClick={(e) => e.stopPropagation()}
          >
            ⬇ ダウンロード
          </a>
        </div>
      )}

      <div className="modal-input">
        <textarea
          id="chat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
        />
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg"
          onChange={onPickImage}
        />
        <img
          id="preview"
          ref={previewRef}
          alt="プレビュー"
          style={{ display: "none", maxWidth: 240 }}
        />
        <button id="save" onClick={handleSend}>
          送信
        </button>
      </div>
    </div>
  );
}
