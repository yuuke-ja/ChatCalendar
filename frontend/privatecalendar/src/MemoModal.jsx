import { useEffect, useRef, useState } from "react";

export default function MemoModal({ selectedDate, closeModal }) {
  const [memoList, setMemoList] = useState([]);
  const textareaRefs = useRef([]);

  useEffect(() => {
    if (!selectedDate) return;
    fetch(`/get-memo?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setMemoList(data.memoList || []);
      })
      .catch(() => alert("メモの読み込みに失敗しました"));
  }, [selectedDate]);

  const handleAddMemo = () => {
    setMemoList([...memoList, ""]);
  };

  const handleChange = (index, value) => {
    const newList = [...memoList];
    newList[index] = value;
    setMemoList(newList);
  };

  const autoResizeAll = () => {
    textareaRefs.current.forEach((el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  };

  useEffect(() => {
    autoResizeAll();
  }, [memoList]);

  const handleSave = async () => {
    // 空白や空欄を除く
    const filtered = memoList
      .map(m => m.trim())
      .filter(m => m.length > 0);

    const res = await fetch("/save-memo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, memoList: filtered }),
    });

    alert(res.ok ? "保存成功" : "保存失敗");
  };


  return (
    <div className="chatmodal">
      <div className="chatmodal-content">
        <button
          className="close"
          onClick={() => {
            closeModal();
          }}
        >✕</button>

        <h2>予定 ({selectedDate})</h2>

        {memoList.map((text, i) => (
          <textarea
            key={i}
            rows="3"
            cols="40"
            ref={(el) => (textareaRefs.current[i] = el)}
            value={text}
            onChange={(e) => handleChange(i, e.target.value)}
            onInput={autoResizeAll}
            style={{ display: "block", marginBottom: "8px" }}
          />
        ))}

        <button onClick={handleAddMemo}>＋ 追加</button>
        <button className="memo-save" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
}
