import "./Header.css";

export default function Header({
  isMobile,
  calendarStartDate,
  onOpenList,
  onPrev,
  onNext,
  onToday,
  onOpenUserInfo,
  onOpenDateList,
  onOpenFriendModal,
}) {
  return (
    <header className="header">
      {isMobile && (
        <div className="mobile-header">
          <button className="menu-button" onClick={onOpenList}>
            ☰
          </button>
        </div>
      )}
      <div className="calendar-controls">
        <button id="prev" onClick={onPrev}>◀</button>
        <span>
          {calendarStartDate.getFullYear()}年{calendarStartDate.getMonth() + 1}月
        </span>
        <button id="next" onClick={onNext}>▶</button>
        <button
          id="today"
          onClick={onToday}
          style={{
            marginLeft: "10px",
            backgroundColor: "#33c595",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          今日
        </button>
      </div>
      <button className="Userinformation" onClick={onOpenUserInfo}><svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#666666"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z" /></svg></button>
      <button className="datelist-button" onClick={onOpenDateList}><svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#666666"><path d="M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" /></svg></button>
      <button className="checkuser" onClick={onOpenFriendModal}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666666"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z" /></svg></button>
    </header>
  );
}
