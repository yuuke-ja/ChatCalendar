import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import ChatCalendar from "./ChatCalendar.jsx";
import ChatModal from "./ChatModal.jsx";
import FriendModal from "./FriendModal.jsx";
import NewChatModal from "./NewChatModal.jsx";
import InviteModal from "./InviteModal.jsx";
import "./App.css";

export default function App() {
  const [chatroomId, setChatroomId] = useState(null);
  const [chatroomName, setChatroomName] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [myUsername, setMyUsername] = useState("");
  const [chatList, setChatList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [memodate, setMemodate] = useState([]);
  const socketRef = useRef(null);
  const [socketReady, setSocketReady] = useState(false);
  const [participants, setparticipants] = useState([])
  const [membermodal, setmembermodal] = useState(false)
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [countbatch, setcountbatch] = useState({})
  const [allcountbatch, setallcountbatch] = useState({})
  const [authorityOn, setAuthorityOn] = useState(false);
  const [invitationauthorityOn, setinvitationauthorityOn] = useState(false)
  const [UserinformationOpen, setUserinformationOpen] = useState(false);
  const [Roomdetails, setRoomdetails] = useState(false)
  const [viewdatelist, setviewdatelist] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    // localStorage から保存された日付を復元
    const savedDate = localStorage.getItem("calendarStartDate");
    return savedDate ? new Date(savedDate) : new Date();
  });
  const moveCalendarBlock = (delta) => {
    setCalendarStartDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      localStorage.setItem("calendarStartDate", d.toISOString()); // 保存
      return d;
    });
  };
  useEffect(() => {
    const savedDate = localStorage.getItem("calendarStartDate");
    if (savedDate) setCalendarStartDate(new Date(savedDate));
  }, []);

  const chatroomIdRef = useRef(null);
  useEffect(() => {
    chatroomIdRef.current = chatroomId;
  }, [chatroomId]);
  const selectedDateRef = useRef(null);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  const myrole = participants.find(p => p.email === myEmail)?.role || "member";
  const canSeeinvitationButton = invitationauthorityOn
    ? (myrole === "leader" || myrole === "subleader")
    : true;
  const getRoleText = (role) => {
    switch (role) {
      case 'leader':
        return 'リーダー';
      case 'subleader':
        return 'サブリーダー';
      case 'member':
        return 'メンバー';
      default:
        // 未知のロールの場合のデフォルト値
        return role;
    }
  };
  function chengeauthority() {
    const newVal = !authorityOn;
    setAuthorityOn(newVal);
    socketRef.current.emit("chenge-authority", { chatroomId, val: newVal });
  }
  function chengeinvitationauthority() {
    const newVal = !invitationauthorityOn;
    setinvitationauthorityOn(newVal);
    socketRef.current.emit("chenge-invitation-authority", { chatroomId, val: newVal });
  }



  function makesubleader(email) {
    socketRef.current.emit("make-subleader", { chatroomId, userEmail: email });
  }
  function changeleader(email) {
    if (!window.confirm("本当にリーダーにしますか？")) return;
    socketRef.current.emit("change-leader", { chatroomId, userEmail: email });
  }
  function deleteuser(email) {
    if (!window.confirm("本当にこのユーザを削除しますか？")) return
    socketRef.current.emit("delete-member", { chatroomId, userEmail: email })
  }
  function deletemyuser() {
    if (myrole == "leader") {
      alert("リーダーを変更してから退出してください");
      return;
    }
    if (!window.confirm("本当にこのルームから退出しますか？")) return
    socketRef.current.emit("delete-myuser", { chatroomId, userEmail: myEmail })
  }


  useEffect(() => {
    async function fetchChatList() {
      const res = await fetch('/api/enterchat'); // 参加一覧取得用API
      const data = await res.json();
      setChatList(data); // stateに保存
    }
    fetchChatList();
  }, []);


  // 当日変更チェック（10秒毎）
  useEffect(() => {
    const today = new Date().getDate();
    const timer = setInterval(() => {
      const now = new Date().getDate();
      if (now !== today) {
        window.location.reload();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const Header = ({ chatroomName, calendarStartDate, onPrev, onNext }) => (
    <header className="header">
      <div className="calendar-controls">
        <button id="prev" onClick={onPrev}>◀</button>
        <span>
          {calendarStartDate.getFullYear()}年{calendarStartDate.getMonth() + 1}月
        </span>
        <button id="next" onClick={onNext}>▶</button>
        <button
          id="today"
          onClick={() => {
            const today = new Date();
            setCalendarStartDate(today);
            localStorage.setItem("calendarStartDate", today.toISOString());
          }}
          style={{
            marginLeft: "10px",
            backgroundColor: "#33c595",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          今日
        </button>
      </div>
      <button className="Userinformation" onClick={() => setUserinformationOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#666666"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" /></svg></button>
      <button className="datelist-button" onClick={() => setviewdatelist(true)}><svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#666666"><path d="M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" /></svg></button>
      <button className="checkuser" onClick={() => setFriendModalOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666666"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z" /></svg></button>
    </header>
  );
  const selectChatroom = async (chatId) => {
    await fetch('/api/sessionchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatroomid: chatId }),
    });
    const res = await fetch('/api/chatcalendar-info');
    const data = await res.json();

    setChatroomId(data.chatroomId);
    setAuthorityOn(data.authority)
    setinvitationauthorityOn(data.invitationauthority)
    setChatroomName(data.chatroomname);
    setMyEmail(data.useremail);
    setMyUsername(data.username);
    setMemodate(data.memodate || []);
    setparticipants(data.participants || [])
    setSelectedDate(null);
    socketRef.current?.emit("joinRoom", data.chatroomId);
    const countRes = await fetch('/api/mycountbatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatroomId: data.chatroomId })
    });
    const counts = await countRes.json();
    setcountbatch(counts);



  };



  // 初期化 & socket 接続
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/chatcalendar-info");
        const data = await res.json();
        if (!mounted) return;

        setChatroomId(data.chatroomId);
        setAuthorityOn(data.authority)
        setinvitationauthorityOn(data.invitationauthority)
        setChatroomName(data.chatroomname);
        setMyEmail(data.useremail);
        setMyUsername(data.username);
        setMemodate(data.memodate || []);
        setparticipants(data.participants || [])

        socketRef.current = io("/", {
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });
        const socket = socketRef.current;

        const rejoinActiveRoom = () => {
          const activeId = chatroomIdRef.current || data.chatroomId;
          if (activeId) socket.emit("joinRoom", activeId);
        };

        socket.on("connect", () => {
          setSocketReady(true);
          rejoinActiveRoom();
        });
        socket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
        });

        // 再接続試行中
        socket.on("reconnect_attempt", (attempts) => {
          console.log(`Reconnection attempt #${attempts}`);
        });

        // 再接続成功
        socket.on("reconnect", (attempts) => {
          console.log(`Reconnected after ${attempts} attempts`);
          rejoinActiveRoom();
        });

        socket.on("reconnect_failed", () => {
          console.log("再接続失敗！ページをリロードします");
          window.location.reload(); // 上限に達したらリロード
        });
        socket.on("reflection-username", (username) => {
          setMyUsername(username)
        })

        socket.on("newchatlist", (chat) => {
          setChatList(prev => [...prev, chat]);
        });
        socket.on("invitelist", (chat) => {
          setChatList(prev => [...prev, chat])
        })
        socket.on("participants", ({ participants }) => {
          setparticipants(participants || []);
        });
        socket.on("authority-changed", ({ chatroomId, val }) => {
          setAuthorityOn(val);
        });
        socket.on("invitation-authority-changed", ({ chatroomId, val }) => {
          setinvitationauthorityOn(val);
        });

        socket.on("newrole", ({ userEmail, newrole }) => {
          setparticipants(prev =>
            prev.map(p =>
              p.email === userEmail ? { ...p, role: newrole } : p
            )
          );
        });
        socket.on("member-removed", ({ chatroomId, userEmail }) => {
          setparticipants(prev => prev.filter(p => p.email !== userEmail));
          if (myEmail === userEmail) {
            setChatList(prev => prev.filter(chat => chat.id !== chatroomId));
            if (chatroomIdRef.current === chatroomId) {
              window.location.href = "/privatecalendar";
            }
          }
        })
        socket.on("user-rename", ({ email, newName }) => {
          setparticipants(prev =>
            prev.map(p => {
              if (p.email === email) {
                return { ...p, name: newName, username: newName };
              }
              return p;
            })
          );
        });


        socket.on("kicked", ({ chatroomId }) => {
          setChatList(prev => prev.filter(chat => chat.id !== chatroomId));
          if (chatroomIdRef.current === chatroomId) {
            window.location.href = "/privatecalendar";
          }
          setparticipants(prev => prev.filter(p => p.email !== myEmail));
        })
        socket.on("chat-date-cleared", ({ chatroomId: updateroomId, date }) => {
          setallcountbatch(prev => {
            const next = { ...prev };
            const key = String(updateroomId);
            if (next[key]) {
              const updated = { ...next[key] };
              delete updated[date];
              if (Object.keys(updated).length === 0) {
                delete next[key];
              } else {
                next[key] = updated;
              }
            }
            return next;
          });

          if (chatroomIdRef.current !== updateroomId) return;

          setcountbatch(prev => {
            const next = { ...prev };
            delete next[date];
            return next;
          });

          setMemodate(prev => prev.filter(d => d !== date));

          if (selectedDateRef.current === date) {
            setIsClosing(true);
            setTimeout(() => {
              setSelectedDate(null);
              setIsClosing(false);
            }, 300);
          }
        });

        socket.on("countbatchupdate", ({ chatroomId: updateroomId, date, count }) => {
          const activeRoom = chatroomIdRef.current;
          const activeDate = selectedDateRef.current;

          // 閲覧中は常に既読扱い（UIもDBも0）
          if (String(activeRoom) === String(updateroomId) && activeDate === date) {
            setcountbatch(prev => ({ ...prev, [date]: 0 }));
            setallcountbatch(prev => {
              const next = { ...prev };
              const key = String(updateroomId);
              if (!next[key]) next[key] = {};
              next[key][date] = 0;
              return next;
            });
            fetch('/api/deletecount', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatroomId: updateroomId, date })
            }).catch(err => console.error('deletecount error', err));
            return;
          }

          // 閲覧していないときだけサーバ値を反映
          setallcountbatch(prev => {
            const next = { ...prev };
            const key = String(updateroomId);
            if (!next[key]) next[key] = {};
            next[key][date] = count;
            return next;
          });
          if (String(activeRoom) === String(updateroomId)) {
            setcountbatch(prev => ({ ...prev, [date]: count }));
          }
        });

        const countres = await fetch('/api/mycountbatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatroomId: data.chatroomId })
        });
        const counts = await countres.json();
        setcountbatch(counts);
        const roomcountres = await fetch('/api/mycountbatch/all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const allcounts = await roomcountres.json();
        setallcountbatch(allcounts);


        socket.on("newchat", (payload) => {
          if (!payload || String(payload.chatroomId) !== String(chatroomIdRef.current)) {
            return;
          }
          const chatdate = payload.date;
          if (chatdate) {
            setMemodate((prev) =>
              prev.includes(chatdate) ? prev : [...prev, chatdate]
            );
          }
        });
      } catch (e) {
        console.error("初期化エラー:", e);
      }
    })();

    return () => {
      mounted = false;
      socketRef.current.off("member-removed");
      socketRef.current.off("kicked");
      socketRef.current.off("chat-date-cleared");
      socketRef.current.off("reflection-username");
      socketRef.current.off("user-rename");
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // 閉じる処理
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedDate(null);
      setIsClosing(false);
    }, 300);
  };


  return (
    <div className={`app-layout${selectedDate ? " with-modal" : ""} ${isClosing ? " closing-modal" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-section sidebar-top">
          <div className="sidebar-section-header">
            <h3 className="sidebar-heading">ルーム管理</h3>
            <span className="sidebar-subtext">情報とマイカレンダー</span>
          </div>
          <div className="sidebar-action-group">
            <button className="sidebar-action-button" onClick={() => setRoomdetails(true)}>ルーム詳細</button>
            <button className="sidebar-action-button" onClick={() => setmembermodal(true)}>
              参加人数: {participants.length}人
            </button>
            <button type="button" className="sidebar-action-button sidebar-action-link" onClick={() => window.location.href = "/privatecalendar"}>マイカレンダー</button>
          </div>
        </div>

        <div className="sidebar-section sidebar-chatlist">
          <div className="sidebar-section-header">
            <h3 className="sidebar-heading">ルームリスト</h3>
            <span className="sidebar-subtext">{chatList.length}件</span>
          </div>
          <div className="sidebar-chatlist-body">
            {chatList.map(chat => {
              const view = chat.id === chatroomId;
              const counts = allcountbatch[chat.id] || {};
              const roomcount = Object.values(counts).filter(c => c > 0).length;
              return (
                <button
                  key={chat.id}
                  className={`sidebar-chat-button${view ? " is-active" : ""}`}
                  onClick={() => selectChatroom(chat.id)}
                >
                  <span className="sidebar-chat-name">{chat.chatid}</span>
                  {roomcount > 0 && <span className="chatroombatch">{roomcount}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-section sidebar-bottom">
          <button className="sidebar-primary-button" onClick={() => setNewChatModalOpen(true)}>
            ルーム作成
          </button>
        </div>
      </aside>

      {Roomdetails && (
        <div className="roomdetails-overlay" onClick={() => setRoomdetails(false)}>
          <div
            className="roomdetails-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/*  モーダルヘッダー */}
            <div className="roomdetails-header">
              <h2>{chatroomName}</h2>
              <button
                className="roomdetailsclose-btn"
                onClick={() => setRoomdetails(false)}
              >
                ✕
              </button>
            </div>

            <div className="room-info">
              <p><span className="label">参加者：</span>{participants.length}人</p>
              <p><span className="label">⭐️権限：</span>{authorityOn ? "OFF" : "ON"}</p>
              <p><span className="label">招待権限：</span>{invitationauthorityOn ? "OFF" : "ON"}</p>
            </div>

            <div className="room-actions">
              <button onClick={() => { setRoomdetails(false); setTimeout(() => setmembermodal(true), 50); }}>参加者を見る</button>
              {canSeeinvitationButton && (<button onClick={() => { setRoomdetails(false); setTimeout(() => setInviteModalOpen(true), 50); }}>招待</button>)}
              {myrole === "leader" && (
                <button onClick={chengeauthority}>
                  ⭐️権限を{authorityOn ? "ONにする" : "OFFにする"}
                </button>
              )}
              {myrole == "leader" && (
                <button onClick={chengeinvitationauthority}>招待の権限を{invitationauthorityOn ? "ONにする" : "OFFにする"}</button>
              )}
              <button className="deletemyuser" onClick={deletemyuser}>退出する</button>
            </div>
          </div>
        </div>
      )}
      {viewdatelist && (
        <div
          className="datelist-overlay"
          onClick={() => setviewdatelist(false)}
        >
          <div
            className="datelist-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="datelist-header">
              <span>日付一覧</span>
              <button
                type="button"
                className="datelist-close"
                onClick={() => setviewdatelist(false)}
              >
                ✕
              </button>
            </div>
            <ul className="datelist-list">
              {memodate.length === 0 && (
                <li className="datelist-empty">表示できる日付はありません</li>
              )}
              {memodate.map((d) => (
                <li
                  key={d}
                  className="datemove"
                  onClick={() => {
                    const dt = new Date(d + "T00:00:00");
                    setCalendarStartDate(() => {
                      const nd = new Date(dt);
                      localStorage.setItem("calendarStartDate", nd.toISOString());
                      return nd;
                    });
                    setcountbatch((count) => {
                      const updated = { ...count };
                      updated[d] = 0;
                      return updated;
                    });
                    setallcountbatch((prev) => {
                      const prevcount = { ...prev };
                      const key = String(chatroomId);
                      if (!prevcount[key]) prevcount[key] = {};
                      prevcount[key][d] = 0;
                      return prevcount;
                    });

                    fetch("/api/deletecount", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ chatroomId, date: d }),
                    });

                    setSelectedDate(d);
                    setviewdatelist(false);
                  }}
                >
                  <span>{d}</span>
                  {countbatch[d] > 0 && (
                    <span className="datelistbatch">{countbatch[d]}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}



      {UserinformationOpen && (
        <div
          className="userinfo-overlay"
          onClick={() => setUserinformationOpen(false)} // 背景クリックで閉じる
        >
          <div
            className="userinfo-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setUserinformationOpen(false)}>閉じる</button>
            <h2>ユーザー情報</h2>
            <div className="userinfo-item">
              <label>ユーザー名</label>
              <input
                type="text"
                value={myUsername}
                onChange={(e) => setMyUsername(e.target.value)}
              />
            </div>
            <div className="userinfo-buttons">
              <button
                onClick={async () => {
                  socketRef.current.emit("update-username", myUsername)
                  alert(`ユーザー名を変更しました！`);
                }}
              >
                変更
              </button>
            </div>

            <div className="userinfo-item">
              <label>メールアドレス</label>
              <span>{myEmail}</span>
            </div>
            <div className="userinfo-buttons">
              <a href="/logout" className="logout">
                ログアウト
              </a>
            </div>


          </div>
        </div>

      )
      }
      {friendModalOpen && (
        <FriendModal
          socketRef={socketRef}
          socketReady={socketReady}
          myEmail={myEmail}
          onClose={() => setFriendModalOpen(false)}
        />
      )}
      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          participants={participants}
          myEmail={myEmail}
        />
      )}
      {newChatModalOpen && (
        <NewChatModal
          onClose={() => setNewChatModalOpen(false)}
          socket={socketRef.current}
        />
      )}
      {membermodal && (
        <div className="member-overlay">
          <div className="member">
            <div className="member-header">
              <h2>参加メンバー</h2>
              <button className="member-close" onClick={() => setmembermodal(false)}>✕</button>
            </div>
            <ul className="member-list">
              {participants.map((p, i) => (
                <li key={i} className="member-item">
                  <div className="member-info">
                    <span className="member-name">{p.name}</span>
                    <span className={`member-role${p.role}`}>
                      {getRoleText(p.role)}
                    </span>
                  </div>

                  {/* リーダーだけ操作ボタン表示 */}
                  {myrole === "leader" && p.role !== "leader" && (
                    <div className="member-actions">
                      <button className="btn-subleader" onClick={() => makesubleader(p.email)}>{p.role === "member" ? "サブリーダー任命" : "サブリーダーから外す"}</button>
                      <button className="btn-leader" onClick={() => changeleader(p.email)}>リーダーにする</button>
                      <button className="btn-remove" onClick={() => deleteuser(p.email)}>削除</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}


      <main className={`main-view${selectedDate ? (isClosing ? " closing-modal" : " with-modal") : ""}`}>
        <div className={`chatcalendar-page ${isClosing ? "closing-modal" : ""}`}>

          <Header
            chatroomName={chatroomName}
            calendarStartDate={calendarStartDate}
            onPrev={() => moveCalendarBlock(-1)}
            onNext={() => moveCalendarBlock(1)}
          />

          <ChatCalendar

            memodate={memodate}
            onDateClick={(dateStr) => {
              setSelectedDate(dateStr);
              setcountbatch((count) => {
                const updated = { ...count };
                updated[dateStr] = 0;
                return updated;
              });
              setallcountbatch(prev => {
                const prevcount = { ...prev };
                const key = String(chatroomId);
                if (!prevcount[key]) prevcount[key] = {};
                prevcount[key][dateStr] = 0;
                return prevcount;
              });
              fetch('/api/deletecount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatroomId, date: dateStr }),
              })
            }}

            startDate={calendarStartDate}
            countbatch={countbatch || {}}
          />

          {socketReady && selectedDate && chatroomId && !isClosing && (
            <ChatModal
              socket={socketRef.current}
              roomId={chatroomId}
              selectedDate={selectedDate}
              closeModal={handleCloseModal}
              myEmail={myEmail}
              myrole={myrole}
              authorityOn={authorityOn}
            />

          )}
        </div>
      </main>
    </div>
  );

}
