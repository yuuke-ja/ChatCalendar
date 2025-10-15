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
  const chatroomIdRef = useRef(null);
  useEffect(() => {
    chatroomIdRef.current = chatroomId;
  }, [chatroomId]);
  const selectedDateRef = useRef(null);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);


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
      <button className="logout" onClick={() => (window.location.href = "/logout")}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000" className="logoutcontent">
          <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" />
        </svg>
        ログアウト</button>

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

        socket.on("newchatlist", (chat) => {
          setChatList(prev => [...prev, chat]);
        });
        socket.on("invitelist", (chat) => {
          setChatList(prev => [...prev, chat])
        })
        socket.on("participants", ({ participants }) => {
          setparticipants(participants || []);
        });
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
            <h2>参加メンバー</h2>
            <ul>
              {participants.map((p, i) => (
                <li key={i}>
                  {p.name} ({p.email})
                </li>
              ))}
            </ul>
            <button onClick={() => setmembermodal(false)}>閉じる</button>
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
            />

          )}
        </div>
      </main>
    </div>
  );

}
