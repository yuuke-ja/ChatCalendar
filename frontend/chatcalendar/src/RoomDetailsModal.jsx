import "./RoomDetailsModal.css";

export default function RoomDetailsModal({
  chatroomName,
  participantsCount,
  authorityOn,
  invitationauthorityOn,
  myrole,
  canSeeInvitationButton,
  onClose,
  onOpenMemberModal,
  onOpenInviteModal,
  onToggleAuthority,
  onToggleInvitationAuthority,
  onLeaveRoom,
  onDeletingRoom
}) {
  return (
    <div className="roomdetails-overlay" onClick={onClose}>
      <div
        className="roomdetails-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="roomdetails-header">
          <h2>{chatroomName}</h2>
          <button
            className="roomdetailsclose-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="room-info">
          <p><span className="label">参加者：</span>{participantsCount}人</p>
          <p><span className="label">⭐️権限：</span>{authorityOn ? "OFF" : "ON"}</p>
          <p><span className="label">招待権限：</span>{invitationauthorityOn ? "OFF" : "ON"}</p>
        </div>

        <div className="room-actions">
          <button onClick={onOpenMemberModal}>参加者を見る</button>
          {canSeeInvitationButton && (
            <button onClick={onOpenInviteModal}>招待</button>
          )}
          {myrole === "leader" && (
            <button onClick={onToggleAuthority}>
              ⭐️権限を{authorityOn ? "ONにする" : "OFFにする"}
            </button>
          )}
          {myrole === "leader" && (
            <button onClick={onToggleInvitationAuthority}>
              招待の権限を{invitationauthorityOn ? "ONにする" : "OFFにする"}
            </button>
          )}
          <button className="deletemyuser" onClick={onLeaveRoom}>退出する</button>
          {myrole === "leader" && (
            <button onClick={onDeletingRoom}>ルーム削除</button>
          )}
        </div>
      </div>
    </div>
  );
}
