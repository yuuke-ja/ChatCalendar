import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function ChatModal({ socket, roomId, selectedDate, myEmail, closeModal, myrole, authorityOn }) {
  const [chatList, setChatList] = useState(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const previewRef = useRef(null);
  const chatHistoryRef = useRef(null);
  const [screenImage, setscreenImage] = useState(null);
  const [reactionmessageid, setreactionmessageid] = useState(null);
  const [viewpicker, setviewpicker] = useState(false);
  const [Important, setImportant] = useState(false);
  const [showImportantList, setShowImportantList] = useState(false);
  const [importantMessages, setImportantMessages] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [showopensavecalendar, setshowopensavecalendar] = useState(false)
  const [googletitle, setgoogletitle] = useState(false)
  const [titlee, setTitlee] = useState("");
  const [googleSaveTarget, setGoogleSaveTarget] = useState(null);
  const [googleAccessToken, setgoogleAccessToken] = useState("")
  const [googleRefreshToken, setgoogleRefreshToken] = useState("")




  const pickerRef = useRef(null);

  const [showAllReactions, setShowAllReactions] = useState(null); // null or { messageId, reactions }
  const canSeeImportantButton = authorityOn
    ? (myrole === "leader" || myrole === "subleader")
    : true;

  const makeDownloadUrl = (url) => {
    if (!url) return url;
    try {
      const pattern = /\/upload\//;
      if (!pattern.test(url)) return url;
      return url.replace(pattern, "/upload/fl_attachment/");
    } catch (err) {
      console.error("ダウンロードURL生成に失敗しました", err);
      return url;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setviewpicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  function toggleImportant() {
    setImportant(prev => !prev)
  }

  const closeGoogleModal = () => {
    setgoogletitle(false);
    setGoogleSaveTarget(null);
    setTitlee("");
  };

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
    const closeOnOutside = (e) => {
      const menu = document.querySelector(".content-sub");
      if (menu && menu.contains(e.target)) return;
      setDeleteTarget(null);
      setshowopensavecalendar(false);
    };
    if (deleteTarget) {
      document.addEventListener("mousedown", closeOnOutside);
    }
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [deleteTarget]);
  useEffect(() => {
    fetch('/getgooglelist', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        setgoogleAccessToken(data.googleAccessToken)
        setgoogleRefreshToken(data.googleRefreshToken)
      })
  }, [])

  useEffect(() => {
    if (!socket) return;

    const reactionHandler = (data) => {
      if (!data || String(data.chatroomId) !== String(roomId)) return;
      console.log("ユーザ情報", data.reaction);
      setChatList((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((chat) => {
          if (chat.id === data.reaction.messageId) {
            if (data.type === "true") {
              return { ...chat, reactions: [...(chat.reactions || []), data.reaction] };
            }
            return {
              ...chat,
              reactions: (chat.reactions || []).filter((r) => r.id !== data.reaction.id),
            };
          }
          return chat;
        });
      });
    };

    socket.on("newreaction", reactionHandler);
    return () => socket.off("newreaction", reactionHandler);
  }, [socket, roomId]);

  useEffect(() => {
    if (!selectedDate || !roomId) return;
    (async () => {
      try {
        const res = await fetch(`/getchat?date=${selectedDate}&roomId=${encodeURIComponent(roomId)}`);
        const { chat } = await res.json();
        setChatList(prev => {
          const serverChats = Array.isArray(chat) ? chat : [];
          const merged = new Map();
          if (Array.isArray(prev)) {
            prev.forEach(item => {
              if (item && item.id != null && item.date === selectedDate) {
                merged.set(item.id, item);
              }
            });
          }
          serverChats.forEach(item => {
            if (item && item.id != null) {
              merged.set(item.id, item);
            }
          });
          return Array.from(merged.values()).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
        setTimeout(scrollToBottom, 50);
      } catch (e) {
        console.error("チャット取得失敗:", e);
      }
    })();
  }, [selectedDate, roomId]);
  useEffect(() => {
    if (!socket) return;
    const onDeleted = ({ messageId }) => {
      setChatList(prev => {
        if (!Array.isArray(prev)) return prev;
        const updated = prev.map(c =>
          c.id === messageId ? { ...c, deleted: true, content: "", imageUrl: null, important: false } : c
        );
        // 削除されたメッセージを末尾に移動
        const index = updated.findIndex(c => c.id === messageId);
        if (index !== -1) {
          const [msg] = updated.splice(index, 1);
          updated.push(msg);
        }
        return updated;
      });
    };
    socket.on("message-deleted", onDeleted);
    return () => socket.off("message-deleted", onDeleted);
  }, [socket]);





  useEffect(() => {
    const elements = document.querySelectorAll(".importantuser .content");
    elements.forEach((el) => {
      const lines = el.innerText.split(/\n/);
      if (lines.length > 1) {
        el.classList.add("left-align");
      } else {
        el.classList.remove("left-align");
      }
    });
  }, [chatList]);


  useEffect(() => {
    if (chatList) {
      const importants = chatList.filter(c => c.important);
      setImportantMessages(importants);
    }
  }, [chatList]);



  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      if (!data || String(data.chatroomId) !== String(roomId)) return;
      if (data.date === selectedDate && data.chat) {
        setChatList((prev) => {
          const next = Array.isArray(prev) ? [...prev, data.chat] : [data.chat];
          return next;
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    socket.on("newchat", handler);
    return () => socket.off("newchat", handler);
  }, [socket, selectedDate, roomId]);

  const onPickImage = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewSrc(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewSrc(null);
    }
    e.target.value = null;
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
      important: Important,
    });
    setText("");
    setImportant(false);
    setImageFile(null);
    setPreviewSrc(null);
  };

  return (
    <div id="chatmodal" className="chatmodal" style={{ display: "block" }}>
      <div style={{ position: "relative" }}></div>
      <div className="modal-header">
        <span id="modal-date">{selectedDate}</span>
        {importantMessages.length > 0 && (
          <button
            className="important-btn"
            onClick={() => setShowImportantList(prev => !prev)}
          >
            <span className="important-btn-icon" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="22"
                width="22"
                viewBox="0 0 960 960"
              >
                <path
                  d="M480 72l126 255 281 41-203 197 48 280-252-132-252 132 48-280-203-197 281-41L480 72z"
                  fill="gold"
                  stroke="gold"
                  strokeWidth="30"
                  strokeLinejoin="miter"
                />
              </svg>
            </span>
            <span className="important-btn-count">{importantMessages.length}</span>
          </button>
        )}
        <button onClick={closeModal}>閉じる</button>
      </div>

      {showImportantList && (
        <div
          className="important-overlay"
          onClick={() => setShowImportantList(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "transparent",
            zIndex: 9998,
          }}
        >
          <div
            id="important-list"
            className="important-list"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "60px",
              left: "50%",
              transform: "translate(-50%,0)",
              minWidth: "200px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              zIndex: 9999,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              padding: "4px 0",
            }}
          >
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {importantMessages.map(msg => (
                <li
                  key={msg.id}
                  style={{ padding: "4px 12px", cursor: "pointer" }}
                  onClick={() => {
                    const el = document.getElementById(`msg-${msg.id}`);
                    const header = document.querySelector(".modal-header");
                    const headerHeight = header ? header.offsetHeight : 0;

                    if (el && chatHistoryRef.current) {
                      const scrollContainer = chatHistoryRef.current;
                      const targetTop = el.offsetTop - scrollContainer.offsetTop - headerHeight - 10;

                      scrollContainer.scrollTo({
                        top: targetTop,
                        behavior: "smooth",
                      });
                    }
                    setShowImportantList(false);
                  }}
                >
                  {msg.content.slice(0, 20) || "画像"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}




      <div id="chatwrite" className="chat-history" ref={chatHistoryRef}>
        {chatList === null ? null : chatList.length > 0 ? (
          chatList.map((c) => {
            const isDeleted = c.deleted;
            const hasContent = c.content && c.content.trim() !== "";
            const hasImage = c.imageUrl && c.imageUrl.trim() !== "";

            let userclass = "none";
            if (isDeleted) {
              userclass = "deletechat"; // 削除済み
            } else if (hasContent || hasImage) {
              if (c.important) {
                userclass = "importantuser";
              } else {
                userclass = c.email === myEmail ? "myuser" : "othersuser";
              }
            }


            return (
              <div key={c.id} id={`msg-${c.id}`} className={userclass}>
                {isDeleted ? (
                  // 削除済みメッセージ
                  <div className="content-deletechat">
                    {c.user.username} さんが {new Date(c.createdAt).toLocaleString()} の投稿を削除しました
                  </div>
                ) : (
                  <>
                    <p className="date">{new Date(c.createdAt).toLocaleString()}</p>
                    <p className="user">{c.user.username}</p>

                    {/* テキスト内容 */}
                    {hasContent && (
                      <div className="content-body">
                        <div
                          className="content"
                          onMouseEnter={() => setreactionmessageid(c.id)}
                          onMouseLeave={() => setreactionmessageid(null)}
                          onContextMenu={(e) => {
                            e.preventDefault();

                            if (c.deleted) return;

                            // 自分のメッセージ  削除も保存も出す
                            if (c.email === myEmail) {
                              setDeleteTarget({
                                id: c.id,
                                action: "both",
                                content: c.content,
                              });
                              return;
                            }
                            // 他人のメッセージ 保存のみ
                            setDeleteTarget({
                              id: c.id,
                              action: "calendar",
                              content: c.content,
                            });
                          }}
                        >
                          {c.content}
                        </div>
                        {deleteTarget && deleteTarget.id === c.id && (
                          <div className="content-sub"  >
                            {!showopensavecalendar && (
                              <>
                                {(deleteTarget.action === "delete" || deleteTarget.action === "both") && (
                                  <button
                                    onClick={() => {
                                      if (!window.confirm("本当に削除しますか？")) return;
                                      socket.emit("delete-message", {
                                        messageId: deleteTarget.id,
                                        roomId,
                                        email: myEmail,
                                      });
                                      setDeleteTarget(null);
                                    }}
                                  >
                                    削除
                                  </button>
                                )}
                                {(deleteTarget.action === "calendar" || deleteTarget.action === "both") && (
                                  <button
                                    onClick={() => { setshowopensavecalendar(prev => !prev); }}
                                  >
                                    カレンダーに保存
                                  </button>
                                )}
                              </>
                            )}
                            {showopensavecalendar && (
                              <div className="save-options">
                                <button onClick={async () => {
                                  if (!deleteTarget.content) return;
                                  const date = selectedDate;
                                  try {
                                    await fetch("/add-memo", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ date: date, memoList: [deleteTarget.content] }),
                                    });
                                    alert("マイカレンダーに保存しました");
                                  } catch (err) {
                                    console.error(err);
                                    alert("保存に失敗しました");
                                  }
                                  setshowopensavecalendar(false);
                                  setDeleteTarget(null);
                                }}>マイカレンダー</button>
                                <button
                                  onClick={() => {
                                    if (!deleteTarget?.content) return;
                                    if (!selectedDate) {
                                      alert("日付を選択してください");
                                      return;
                                    }
                                    if (!googleAccessToken || !googleRefreshToken) {
                                      alert("Googleカレンダーに連携してください。")
                                      return
                                    }
                                    setGoogleSaveTarget({
                                      content: deleteTarget.content,
                                      date: selectedDate,
                                    });
                                    setgoogletitle(true);
                                    setshowopensavecalendar(false);
                                    setDeleteTarget(null);
                                  }}
                                >
                                  Googleカレンダー
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    )}

                    {/* 画像 */}
                    {hasImage && (
                      <img
                        src={c.imageUrl}
                        alt="投稿画像"
                        className="chat-image"
                        onClick={() => setscreenImage(c.imageUrl)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (c.email === myEmail && !c.deleted) {
                            setDeleteTarget({
                              id: c.id,
                              action: "delete",
                            });
                            return;
                          }
                        }}
                      />
                    )}
                  </>
                )}

                {!isDeleted && (
                  <div className="reactions-area">
                    {(() => {
                      const u = Object.entries(gropReactions(c.reactions || []))
                        .map(([emoji, data]) => ({ emoji, users: data.users, emails: data.emails }));
                      const visibleReactions = u.slice(-5);
                      const hiddenCount = Math.max(0, u.length - visibleReactions.length);

                      return (
                        <>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
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

                          {/* 全リアクション表示*/}
                          {showAllReactions?.messageId === c.id && (
                            createPortal(
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
                              </div>,
                              document.body)
                          )}

                          {viewpicker && reactionmessageid === c.id && (
                            createPortal(
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
                              </>,
                              document.body)
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}




              </div>
            );
          })
        ) : (
          <p>チャットはありません。</p>
        )}
      </div>

      {
        screenImage &&
        createPortal(
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
              href={makeDownloadUrl(screenImage)}
              download
              className="download-button"
              onClick={(e) => e.stopPropagation()}
            >
              ⬇ ダウンロード
            </a>
          </div>,
          document.body
        )
      }

      {
        googletitle && googleSaveTarget &&
        createPortal(
          <div className="member-overlay" onClick={closeGoogleModal}>
            <div className="googletitlemodal" onClick={(e) => e.stopPropagation()}>
              <button
                className="newchatclose"
                onClick={closeGoogleModal}
                aria-label="閉じる"
              >
                ×
              </button>
              <h2>タイトル</h2>
              <input
                type="text"
                value={titlee}
                onChange={(e) => setTitlee(e.target.value)}
                placeholder="ここに入力"
              />
              <button
                onClick={async () => {
                  if (!googleSaveTarget?.content || !googleSaveTarget?.date) return;
                  try {
                    const res = await fetch("/save-googlecalendar", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: titlee,
                        content: googleSaveTarget.content,
                        date: googleSaveTarget.date,
                      }),
                    });
                    const body = await res.json().catch(() => null);
                    if (!res.ok || !body?.success) {
                      const message = body?.message || "Googleカレンダーへの保存に失敗しました";
                      alert(message);
                      return;
                    }
                    console.log("タイトル", titlee);
                    alert("Googleカレンダーに保存しました");
                    closeGoogleModal();
                  } catch (err) {
                    console.error(err);
                    alert("保存に失敗しました");
                  }
                }}
              >
                保存
              </button>
            </div>
          </div>,
          document.body
        )
      }

      {
        previewSrc && (
          <div className="preview-line">
            <img
              id="preview"
              src={previewSrc}
              alt="プレビュー"
              style={{ maxHeight: 80 }}
            />
            <button
              className="preview-cancel-btn"
              onClick={() => {
                setImageFile(null);
                setPreviewSrc(null);
              }}
            >
              ×
            </button>
          </div>
        )
      }


      <div className="modal-input">
        <textarea
          id="chat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メッセージを入力"
        />
        {canSeeImportantButton && (
          <button
            className="important-star"
            onClick={toggleImportant}
            aria-label="重要マーク"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="28px"
              width="28px"
              viewBox="0 0 960 960"
            >
              <path
                d="M480 72l126 255 281 41-203 197 48 280-252-132-252 132 48-280-203-197 281-41L480 72z"
                fill={Important ? "gold" : "none"}
                stroke={Important ? "gold" : "#666"}
                strokeWidth="30"
                strokeLinejoin="miter"
              />
            </svg>
          </button>
        )}

        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg"
          onChange={onPickImage}
        />
        <button id="save" onClick={handleSend}>
          送信
        </button>
      </div>
    </div>
  );
}
