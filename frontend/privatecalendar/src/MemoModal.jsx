import { useEffect, useState } from "react";

export default function MemoModal({ selectedDate, closeModal }) {
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  // 日付が変更されたらメモを取得
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`/get-memo?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setMemo(data.memo || "");
      })
      .catch(() => {
        alert("メモの読み込みに失敗しました");
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // 保存処理
  const handleSave = async () => {
    try {
      const res = await fetch("/save-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, memo }),
      });
      if (res.ok) {
        alert("サーバーに保存されました");
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    }
  };

  if (!selectedDate) return null;

  return (
    <div className="chatmodal">
      <div className="chatmodal-content">
        {/* モーダルヘッダー */}
        <button className="close" onClick={closeModal}>
          ✕
        </button>
        <h2>予定</h2>
        <p id="modal-date" style={{ margin: 0, fontWeight: "bold" }}>
          {selectedDate}
        </p>
        <br />

        {/* メモ入力欄 */}

        <textarea
          id="memo"
          className="memotextarea"
          rows="10"
          cols="40"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />


        {/* 保存ボタン */}
        <div className="button-style">
          <button id="save" className="button-style" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
