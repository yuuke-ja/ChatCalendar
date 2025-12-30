import "./Sidebar.css";

export default function Sidebar({
  chatList,
  chatroomId,
  participantsCount,
  allcountbatch,
  onOpenRoomDetails,
  onOpenMemberModal,
  onGoPrivateCalendar,
  onSelectChatroom,
  onOpenNewChatModal
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section sidebar-top">
        <div className="sidebar-section-header">
          <h3 className="sidebar-heading">ルーム管理</h3>
          <span className="sidebar-subtext">情報とマイカレンダー</span>
        </div>
        <div className="sidebar-action-group">
          <button className="sidebar-action-button" onClick={onOpenRoomDetails}>ルーム詳細</button>
          <button className="sidebar-action-button" onClick={onOpenMemberModal}>
            参加人数: {participantsCount}人
          </button>
          <button type="button" className="sidebar-action-button sidebar-action-link" onClick={onGoPrivateCalendar}>マイカレンダー</button>
        </div>
      </div>

      <div className="sidebar-section sidebar-chatlist">
        <div className="sidebar-section-header">
          <h3 className="sidebar-heading">ルームリスト</h3>
          <span className="sidebar-subtext">{chatList.length}件</span>
        </div>
        <div className="sidebar-chatlist-body">
          {chatList.map(chat => {
            const counts = allcountbatch[chat.id] || {};
            const roomcount = Object.values(counts).filter(c => c > 0).length;
            return (
              <button
                key={chat.id}
                className={`sidebar-chat-button${chat.id === chatroomId ? " is-active" : ""}`}
                onClick={() => onSelectChatroom(chat.id)}
              >
                <span className="sidebar-chat-name">{chat.chatid}</span>
                {roomcount > 0 && <span className="chatroombatch">{roomcount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-section sidebar-bottom">
        <button className="sidebar-primary-button" onClick={onOpenNewChatModal}>
          ルーム作成
        </button>
      </div>
    </aside>
  )
}
