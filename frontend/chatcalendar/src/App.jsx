import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import ChatCalendar from "./ChatCalendar.jsx";
import ChatModal from "./ChatModal.jsx";
import FriendModal from "./FriendModal.jsx";
import NewChatModal from "./NewChatModal.jsx";
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
  const [UserinformationOpen, setUserinformationOpen] = useState(false);
  const [Roomdetails, setRoomdetails] = useState(false)
  const chatroomIdRef = useRef(null);
  useEffect(() => {
    chatroomIdRef.current = chatroomId;
  }, [chatroomId]);
  const selectedDateRef = useRef(null);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  const myrole = participants.find(p => p.email === myEmail)?.role || "member";
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


  function makesubleader(email) {
    socketRef.current.emit("make-subleader", { chatroomId, userEmail: email });
  }
  function changeleader(email) {
    socketRef.current.emit("change-leader", { chatroomId, userEmail: email });
  }
  function deleteuser(email) {
    socketRef.current.emit("delete-member", { chatroomId, userEmail: email })
  }
  function deletemyuser() {
    socketRef.current.emit("delete-myuser", { chatroomId, userEmail: myEmail })
  }

  // ← カレンダー開始月を App に移動
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());
  const moveCalendarBlock = (delta) => {
    setCalendarStartDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };
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
      <div id="title" className="title">{chatroomName}</div>

      {/* カレンダーコントロールをここに移動 */}
      <div className="calendar-controls">
        <button id="prev" onClick={onPrev}>◀</button>
        <span>
          {calendarStartDate.getFullYear()}年{calendarStartDate.getMonth() + 1}月から1年分
        </span>
        <button id="next" onClick={onNext}>▶</button>
      </div>

      <button className="home" onClick={() => (window.location.href = "/home")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000" className="size-6">
          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
        </svg>
        ホーム</button>

      <button className="Userinformation" onClick={() => setUserinformationOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#999999"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" /></svg></button>

      <button className="userinvite" onClick={() => (window.location.href = "/userinvite")}>招待</button>
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
        setChatroomName(data.chatroomname);
        setMyEmail(data.useremail);
        setMyUsername(data.username);
        setMemodate(data.memodate || []);
        setparticipants(data.participants || [])

        socketRef.current = io("/", {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });
        const socket = socketRef.current;

        socket.on("connect", () => {
          setSocketReady(true);
          if (data.chatroomId) socket.emit("joinRoom", data.chatroomId);
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

        socket.on("newrole", ({ userEmail, newrole }) => {
          setparticipants(prev =>
            prev.map(p =>
              p.email === userEmail ? { ...p, role: newrole } : p
            )
          );
        });
        socket.on("member-removed", ({ chatroomId, userEmail }) => {
          setparticipants(prev => prev.filter(p => p.email !== userEmail));
        })
        socket.on("kicked", ({ chatroomId }) => {
          setChatList(prev => prev.filter(chat => chat.id !== chatroomId));
          console.log(`チャットID`, chatroomIdRef, chatroomId)
          if (chatroomIdRef.current === chatroomId) {
            window.location.href = "/privatecalendar";
          }
          setparticipants(prev => prev.filter(p => p.email !== myEmail));
        })

        socket.on("countbatchupdate", ({ chatroomId: updateroomId, date, count }) => {
          console.log("countbatchupdate 受信:", date);
          console.log("比較:", chatroomIdRef.current, typeof chatroomIdRef.current, updateroomId, typeof updateroomId);
          if (chatroomIdRef.current == updateroomId && selectedDateRef.current == date) {
            setcountbatch(prev => ({
              ...prev,
              [date]: 0
            }))
            setallcountbatch(prev => {
              const prevcount = { ...prev };
              const key = String(chatroomId);
              if (!prevcount[key]) prevcount[key] = {};
              prevcount[key][date] = 0;
              return prevcount;
            });
            fetch('/api/deletecount', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatroomId: updateroomId, date })
            }).catch(err => console.error('deletecount error', err));
            return;
          }
          setallcountbatch(prev => {
            const next = { ...prev };
            const key = String(updateroomId);
            if (!next[key]) next[key] = {};
            next[key][date] = count;
            return next;
          });
          if (chatroomIdRef.current != updateroomId) return;
          setcountbatch(prev => ({
            ...prev,
            [date]: count
          }))
        })
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
          const chatdate = payload?.date;
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
      socketRef.current.off("reflection-username");
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
      {/* 左サイドバー */}
      <aside className="sidebar">
        <button className="Room-details" onClick={() => setRoomdetails(true)}>ルーム詳細</button>
        <button
          className="participants-btn"
          onClick={() => setmembermodal(true)}
        >参加人数: {participants.length}人</button>
        <button onClick={() => setNewChatModalOpen(true)}>新規チャット作成</button>
        <button
          type="button" onClick={() => window.location.href = "/privatecalendar"}>プライベートカレンダー</button>
        <h2>チャットカレンダー</h2>
        {chatList.map(chat => {
          const counts = allcountbatch[chat.id] || {};
          console.log("chatList", chatList);
          console.log("allcountbatch", allcountbatch);
          const roomcount = Object.values(counts).filter(c => c > 0).length;
          return (
            <button key={chat.id} onClick={() => selectChatroom(chat.id)}>
              {chat.chatid}
              {roomcount > 0 && <span className="chatroombatch">{roomcount}</span>}
            </button>
          )
        })}
        <button onClick={() => setFriendModalOpen(true)}>フレンド</button>
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

            {/* ルーム情報 */}
            <div className="room-info">
              <p><span className="label">参加者数：</span>{participants.length}人</p>
              <p><span className="label">権限：</span>{authorityOn ? "ON" : "OFF"}</p>
            </div>

            {/*  操作ボタン */}
            <div className="room-actions">
              <button onClick={() => setmembermodal(true)}>参加者を見る</button>
              <button onClick={() => (window.location.href = "/userinvite")}>招待する</button>
              {myrole === "leader" && (
                <button onClick={chengeauthority}>
                  権限を{authorityOn ? "OFFにする" : "ONにする"}
                </button>
              )}
              <button className="deletemyuser" onClick={deletemyuser}>退出する</button>
            </div>
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
            onClick={(e) => e.stopPropagation()} // モーダル内クリックでは閉じない
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
          socket={socketRef.current}
          onClose={() => setFriendModalOpen(false)}
        />
      )}
      {newChatModalOpen && (
        <NewChatModal onClose={() => setNewChatModalOpen(false)} />
      )}
      {membermodal && (
        <div className="member-overlay">
          <div className="member">
            <div className="member-header">
              <h2>参加メンバー</h2>
              <button className="member-close" onClick={() => setmembermodal(false)}>✕</button>
            </div>
            {myrole === "leader" && (
              <div className="kenngenn">
                <button className="kenngenn-btn" onClick={chengeauthority}>{authorityOn ? "権限ON" : "権限OFF"}</button>
              </div>
            )}
            <ul className="member-list">
              {participants.map((p, i) => (
                <li key={i} className="member-item">
                  <div className="member-info">
                    <span className="member-name">{p.name}</span>
                    <span className={`member-role${p.role}`}>
                      {getRoleText(p.role)}
                    </span>
                  </div>

                  {/* 👑 リーダーだけ操作ボタン表示 */}
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


      {/* 右のメインビュー（ここに元のUI丸ごと入れる） */}
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
              myrole={myrole}             // 追加
              authorityOn={authorityOn}   // 追加
            />

          )}
        </div>
      </main>
    </div>
  );

}
