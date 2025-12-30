import { useState, useEffect } from "react";
import "./ChatCalendar.css";

const youbi = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MonthCalendar({ year, month, memodate, onDateClick, countbatch }) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startDay = startDate.getDay();
  const endDay = endDate.getDate();
  const lastMonthEndDate = new Date(year, month - 1, 0);
  const lastMonthEndDayCount = lastMonthEndDate.getDate();

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const today = now.getDate();

  let dayCount = 1;
  const rows = [];

  for (let w = 0; w < 6; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < startDay) {
        const num = lastMonthEndDayCount - startDay + d + 1;
        cells.push(
          <td key={`prev-${w}-${d}`} className="kako">
            <span>{num}</span>
          </td>
        );
      } else if (dayCount > endDay) {
        const num = dayCount - endDay;
        cells.push(
          <td key={`next-${w}-${d}`} className="kako">
            <span>{num}</span>
          </td>
        );
        dayCount++;
      } else {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayCount).padStart(2, "0")}`;
        const havememo = memodate.includes(dateStr);
        const isToday = year === thisYear && month === thisMonth && dayCount === today;

        cells.push(
          <td
            key={dateStr}
            data-date={dateStr}
            className={havememo ? "irotuke" : ""}
            onClick={() => onDateClick(dateStr)}
          >
            <span className={isToday ? "today" : ""}>{dayCount}</span>
            {countbatch[dateStr] > 0 && (
              <span className="countbatch">{countbatch[dateStr]}</span>
            )}
          </td>
        );
        dayCount++;
      }
    }
    rows.push(<tr key={w}>{cells}</tr>);
  }

  return (
    <section>
      <h1>{year}/{month}</h1>
      <table>
        <thead>
          <tr>{youbi.map((d) => <th key={d}>{d}</th>)}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </section>
  );
}

export default function ChatCalendar({ memodate, onDateClick, startDate, countbatch }) {
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;

  return (
    <div id="chatcalendar">
      <MonthCalendar
        year={year}
        month={month}
        memodate={memodate}
        onDateClick={onDateClick}
        countbatch={countbatch}
      />
    </div>
  );
}
