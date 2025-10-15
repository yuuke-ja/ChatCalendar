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


  // カレンダー開始月
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
          {calendarStartDate.getFullYear()}年{calendarStartDate.getMonth() + 1}月から1年分
        </span>
        <button id="next" onClick={onNext}>▶</button>
      </div>
      <button className="home" onClick={() => (window.location.href = "/home")}>ホーム</button>
      <button className="logout" onClick={() => (window.location.href = "/logout")}>ログアウト</button>
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

    // 新規チャット通知は残す
    socket.on("newchatlist", (chat) => setChatList(prev => [...prev, chat]));
    socket.on("invitelist", (chat) => setChatList(prev => [...prev, chat]));
    // "newchat" は削除
    socket.on("newmemo", (newdate) => {
      setMemodate(prev => prev.includes(newdate) ? prev : [...prev, newdate]);
      console.log(newdate)
    });
    socket.on("deletememo", (deletedDate) => {
      setMemodate(prev => prev.filter(d => d !== deletedDate));
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
      const data = await fetch('/get-date')
      const datas = await data.json()
      if (!mounted)
        return
      setMemodate(datas)
    }
    fetchmemodate()
    async function fetchAllCountBatch() {
      try {
        const res = await fetch('/api/mycountbatch/all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        setallcountbatch(data); // state に保存
      } catch (e) {
        console.error("allcountbatch fetch error", e);
      }
    }

    fetchAllCountBatch();


    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
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
        <button type="button" onClick={() => window.location.href = "/carender"}>プライベートカレンダー</button>
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
