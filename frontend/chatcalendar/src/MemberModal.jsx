import "./MemberModal.css";

export default function MemberModal({
  participants,
  myrole,
  getRoleText,
  onMakeSubleader,
  onChangeLeader,
  onDeleteUser,
  onClose,
}) {
  return (
    <div className="member-overlay">
      <div className="member">
        <div className="member-header">
          <h2>参加メンバー</h2>
          <button className="member-close" onClick={onClose}>✕</button>
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

              {myrole === "leader" && p.role !== "leader" && (
                <div className="member-actions">
                  <button
                    className="btn-subleader"
                    onClick={() => onMakeSubleader(p.email)}
                  >
                    {p.role === "member" ? "サブリーダー任命" : "サブリーダーから外す"}
                  </button>
                  <button
                    className="btn-leader"
                    onClick={() => onChangeLeader(p.email)}
                  >
                    リーダーにする
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => onDeleteUser(p.email)}
                  >
                    削除
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
