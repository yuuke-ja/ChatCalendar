import { useEffect, useMemo, useState } from "react";

export default function InviteModal({ onClose, participants = [], myEmail }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [input, setInput] = useState("");
  const [inviting, setInviting] = useState({}); // {email: true}

  const memberEmails = useMemo(
    () => new Set(participants.map(p => p.email)),
    [participants]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/favorite");
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("お気に入り取得エラー:", e);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toast(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  async function inviteByEmail(email) {
    if (!email) return;
    if (memberEmails.has(email)) {
      toast("⚠️ すでに参加しています");
      return;
    }
    if (email === myEmail) {
      toast("❌ 自分自身は招待できません");
      return;
    }

    try {
      setInviting(prev => ({ ...prev, [email]: true }));
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        toast("✅ 招待しました");
      } else if (data?.reason === "already") {
        toast("⚠️ すでに参加しています");
      } else if (data?.reason === "notfound") {
        toast("❌ ユーザーが見つかりません");
      } else {
        toast("❌ 招待に失敗しました");
      }
    } catch (e) {
      console.error(e);
      toast("❌ エラーが発生しました");
    } finally {
      setInviting(prev => ({ ...prev, [email]: false }));
    }
  }

  return (
    <div className="invite-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={e => e.stopPropagation()}>
        <div className="invite-header">
          <h2>ユーザ招待</h2>
          <button className="invite-close" onClick={onClose}>✕</button>
        </div>

        {msg && <p className="invite-message">{msg}</p>}

        <div className="invite-input-row">
          <input
            type="email"
            placeholder="メールアドレスで招待"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="invite-input"
          />
          <button
            className="invite-btn"
            onClick={() => {
              const email = input.trim();
              if (!email) return;
              inviteByEmail(email);
              setInput("");
            }}
          >
            招待
          </button>
        </div>

        <div className="invite-divider" />

        <h3 className="invite-subtitle">お気に入りから招待</h3>

        {loading ? (
          <p className="invite-loading">読み込み中...</p>
        ) : favorites.length === 0 ? (
          <p className="invite-empty">お気に入りがありません</p>
        ) : (
          <ul className="invite-list">
            {favorites.map((f, i) => {
              const disabled =
                inviting[f.email] || memberEmails.has(f.email) || f.email === myEmail;
              const label = memberEmails.has(f.email)
                ? "参加済み"
                : inviting[f.email]
                  ? "送信中..."
                  : "招待";
              return (
                <li key={i} className="invite-item">
                  <div className="invite-user">
                    <span className="invite-name">{f.username}</span>
                    <span className="invite-email">{f.email}</span>
                  </div>
                  <button
                    className="invite-mini-btn"
                    disabled={disabled}
                    onClick={() => inviteByEmail(f.email)}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
