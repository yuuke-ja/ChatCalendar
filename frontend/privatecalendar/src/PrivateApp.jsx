import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import ChatCalendar from "./PrivateCalendar.jsx";
import ChatModal from "./MemoModal.jsx";
import FriendModal from "./FriendModal.jsx";
import NewChatModal from "./NewChatModal.jsx";
import "./calendar.css";

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
  const [participants, setparticipants] = useState([]);
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [allcountbatch, setallcountbatch] = useState({});
  const [UserinformationOpen, setUserinformationOpen] = useState(false);
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

  useEffect(() => {
    async function fetchChatList() {
      const res = await fetch('/api/enterchat');
      const data = await res.json();
      setChatList(data);
    }
    fetchChatList();
  }, []);

  useEffect(() => {
    const today = new Date().getDate();
    const timer = setInterval(() => {
      const now = new Date().getDate();
      if (now !== today) window.location.reload();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const Header = ({ chatroomName, calendarStartDate, onPrev, onNext }) => (
    <header className="header">
      <div id="title" className="title">{chatroomName}</div>
      <div className="calendar-controls">
        <button id="prev" onClick={onPrev}>◀</button>
        <span>
          {calendarStartDate.getFullYear()}年{calendarStartDate.getMonth() + 1}月
        </span>
        <button id="next" onClick={onNext}>▶</button>
      </div>
      <button className="home" onClick={() => (window.location.href = "/home")}>ホーム</button>
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
    window.location.href = '/chatcalendar';

  }

  // 初期化 & socket 接続
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(new URL('/api/privatecalendar-info', window.location.origin), {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          const body = await res.text();
          console.error('privatecalendar-info NG', res.status, body.slice(0, 200));
          throw new Error(`/api/privatecalendar-info ${res.status}`);
        }

        const data = await res.json();
        setMyUsername(data.username);
        setMyEmail(data.useremail);


        socketRef.current = io("/", {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });
        const socket = socketRef.current;

        socket.on("connect", () => setSocketReady(true));
        socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));
        socket.on("reconnect_attempt", (attempts) => console.log(`Reconnection attempt #${attempts}`));
        socket.on("reconnect", (attempts) => console.log(`Reconnected after ${attempts} attempts`));
        socket.on("reconnect_failed", () => window.location.reload());

        socket.on("newchatlist", (chat) => setChatList(prev => [...prev, chat]));
        socket.on("invitelist", (chat) => setChatList(prev => [...prev, chat]));
        socket.on("newmemo", (newdate) => {
          setMemodate(prev => prev.includes(newdate) ? prev : [...prev, newdate]);
        });
        socket.on("deletememo", (deletedDate) => {
          setMemodate(prev => prev.filter(d => d !== deletedDate));
        });
        socket.on("reflection-username", (username) => {
          setMyUsername(username);
        });
        socket.on("countbatchupdate", ({ chatroomId: updateroomId, date, count }) => {
          setallcountbatch(prev => {
            const next = { ...prev };
            if (!next[updateroomId]) next[updateroomId] = {};
            next[updateroomId][date] = count;
            return next;
          });
        });

        async function fetchmemodate() {
          const data = await fetch('/get-date');
          const datas = await data.json();
          if (!mounted) return;
          setMemodate(datas);
        }
        fetchmemodate();

        async function fetchAllCountBatch() {
          try {
            const res = await fetch('/api/mycountbatch/all', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            setallcountbatch(data);
          } catch (e) {
            console.error("allcountbatch fetch error", e);
          }
        }
        fetchAllCountBatch();

      } catch (e) {
        console.error("初期化エラー:", e);
      }
    })();

    return () => {
      mounted = false;
      socketRef.current?.off("reflection-username");
      socketRef.current?.disconnect();
    };
  }, []);

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
        <button onClick={() => setNewChatModalOpen(true)}>新規チャット作成</button>
        <button type="button" onClick={() => window.location.href = "/privatecalendar"}>プライベートカレンダー</button>
        <h2>チャットカレンダー</h2>
        {chatList.map(chat => {
          const counts = allcountbatch[chat.id] || {};
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

      {friendModalOpen && <FriendModal socket={socketRef.current} onClose={() => setFriendModalOpen(false)} />}
      {newChatModalOpen && <NewChatModal onClose={() => setNewChatModalOpen(false)} />}

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
            onDateClick={(dateStr) => setSelectedDate(dateStr)}
            startDate={calendarStartDate}
          />
          {console.log('日付日付', memodate)}
          {socketReady && selectedDate && !isClosing && (
            <ChatModal
              selectedDate={selectedDate}
              closeModal={handleCloseModal}
            />
          )}
        </div>
      </main>
    </div>
  );
}
