import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import ChatCalendar from "./ChatCalendar.jsx";
import ChatModal from "./ChatModal.jsx";
import FriendModal from "./FriendModal.jsx";
import NewChatModal from "./NewChatModal.jsx";
import InviteModal from "./InviteModal.jsx";
import MemberModal from "./MemberModal.jsx";
import Sidebar from "./Sidebar.jsx";
import RoomDetailsModal from "./RoomDetailsModal.jsx";
import Header from "./Header.jsx";
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
  const [isMobile, setIsMobile] = useState(false);
  const [listorcalendar, setlistorcalendar] = useState("calendar");
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
  const pendingRequestRef = useRef(0);
  const myrole = participants.find(p => p.email === myEmail)?.role || "member";
  const canSeeinvitationButton = invitationauthorityOn
    ? (myrole === "leader" || myrole === "subleader")
    : true;
  const fetchAbortRef = useRef(null);
  const getRoleText = (role) => {
    switch (role) {
      case 'leader':
        return 'リーダー';
      case 'subleader':
        return 'サブリーダー';
      case 'member':
        return 'メンバー';
      default:
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
      const res = await fetch('/api/enterchat');
      const data = await res.json();
      setChatList(data);
    }
    fetchChatList();
  }, []);


  // 当日変更チェック（10秒毎)
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

  const handleTodayClick = () => {
    const today = new Date();
    setCalendarStartDate(today);
    localStorage.setItem("calendarStartDate", today.toISOString());
  };
  const selectChatroom = async (chatId) => {
    const seq = ++pendingRequestRef.current; // このリクエストが最新か判定するための番号
    // 即座に選択を反映させる
    setChatroomId(chatId);
    window.history.replaceState(null, "", `/chatcalendar?roomId=${chatId}`);
    // 直前のリクエストが残っていればキャンセル
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    let res;
    try {
      res = await fetch(`/api/chatcalendar-info?roomId=${encodeURIComponent(chatId)}`, {
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") return;
      throw e;
    }
    if (!res.ok || res.redirected) {
      window.location.href = res.url || '/privatecalendar';
      return;
    }
    const data = await res.json();
    // 他の選択リクエストに追い抜かれていたら破棄
    if (seq !== pendingRequestRef.current) return;

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
    let countRes;
    try {
      countRes = await fetch('/api/mycountbatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatroomId: data.chatroomId }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") return;
      throw e;
    }
    const counts = await countRes.json();
    setcountbatch(counts);
  };



  // 初期化 & socket 接続
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const urlRoomId = new URLSearchParams(window.location.search).get("roomId");
        if (!urlRoomId) return;
        const res = await fetch(`/api/chatcalendar-info?roomId=${encodeURIComponent(urlRoomId)}`);
        if (!res.ok || res.redirected) {
          window.location.href = res.url || '/privatecalendar';
          return;
        }
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
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handler = (e) => {
      setIsMobile(e.matches);
    };

    // 初期値セット
    setIsMobile(mediaQuery.matches);

    // 変更を監視
    mediaQuery.addEventListener("change", handler);

    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);
  const isMobileList = isMobile && listorcalendar === "list";
  const isMobileCalendar = isMobile && listorcalendar === "calendar";


  // 閉じる処理
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedDate(null);
      setIsClosing(false);
    }, 300);
  };



  return (
    <div className={`app-layout${selectedDate ? " with-modal" : ""} ${isClosing ? " closing-modal" : ""}${isMobileList ? " mobile-list" : ""}${isMobileCalendar ? " mobile-calendar" : ""}`}>
      <Sidebar
        chatList={chatList}
        chatroomId={chatroomId}
        participantsCount={participants.length}
        allcountbatch={allcountbatch}
        onOpenRoomDetails={() => setRoomdetails(true)}
        onOpenMemberModal={() => setmembermodal(true)}
        onGoPrivateCalendar={() => { window.location.href = "/privatecalendar"; }}
        onSelectChatroom={(id) => { selectChatroom(id); setlistorcalendar("calendar"); }}
        onOpenNewChatModal={() => setNewChatModalOpen(true)}
      />

      {Roomdetails && (
        <RoomDetailsModal
          chatroomName={chatroomName}
          participantsCount={participants.length}
          authorityOn={authorityOn}
          invitationauthorityOn={invitationauthorityOn}
          myrole={myrole}
          canSeeInvitationButton={canSeeinvitationButton}
          onClose={() => setRoomdetails(false)}
          onOpenMemberModal={() => { setRoomdetails(false); setTimeout(() => setmembermodal(true), 50); }}
          onOpenInviteModal={() => { setRoomdetails(false); setTimeout(() => setInviteModalOpen(true), 50); }}
          onToggleAuthority={chengeauthority}
          onToggleInvitationAuthority={chengeinvitationauthority}
          onLeaveRoom={deletemyuser}
        />
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
                maxLength={19}
                placeholder="19文字まで入力できます"
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
            <div>
              <button className="googleclandar" onClick={() => window.location.href = "/auth/google/link"}>Googleカレンダー連携</button>
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
          myUsername={myUsername}
          chatroomName={chatroomName}
          chatroomId={chatroomId}
        />
      )}
      {newChatModalOpen && (
        <NewChatModal
          onClose={() => setNewChatModalOpen(false)}
          socket={socketRef.current}
        />
      )}
      {membermodal && (
        <MemberModal
          participants={participants}
          myrole={myrole}
          getRoleText={getRoleText}
          onMakeSubleader={makesubleader}
          onChangeLeader={changeleader}
          onDeleteUser={deleteuser}
          onClose={() => setmembermodal(false)}
        />
      )}


      <main className={`main-view${selectedDate ? (isClosing ? " closing-modal" : " with-modal") : ""}`}>
        <div className={`chatcalendar-page ${isClosing ? "closing-modal" : ""}`}>

          <Header
            isMobile={isMobile}
            calendarStartDate={calendarStartDate}
            onOpenList={() => setlistorcalendar("list")}
            onPrev={() => moveCalendarBlock(-1)}
            onNext={() => moveCalendarBlock(1)}
            onToday={handleTodayClick}
            onOpenUserInfo={() => setUserinformationOpen(true)}
            onOpenDateList={() => setviewdatelist(true)}
            onOpenFriendModal={() => setFriendModalOpen(true)}
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
