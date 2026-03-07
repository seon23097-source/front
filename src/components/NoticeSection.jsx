import { useState, useEffect, useCallback } from 'react';
import { fetchEvents } from '../api/timetable';

const DAYS = ['월', '화', '수', '목', '금'];

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getThisMonday() {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(mondayBase) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayBase);
    d.setDate(mondayBase.getDate() + i);
    return { month: d.getMonth() + 1, date: d.getDate(), full: toLocalDateStr(d) };
  });
}

const STORAGE_KEY = 'schosche_notices';

function loadNotices() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveNotices(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function NoticeSection({ adminMode, weekOffset = 0 }) {
  const [notices, setNotices] = useState(loadNotices);
  const [events, setEvents] = useState([]);

  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);

  useEffect(() => {
    fetchEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  // 날짜별 noSchool 판정
  const noSchoolDateSet = new Set();
  events.forEach(ev => {
    if (!ev.isNoSchool) return;
    const start = ev.startDate;
    const end = ev.endDate || ev.startDate;
    weekDates.forEach(wd => {
      if (wd.full >= start && wd.full <= end) noSchoolDateSet.add(wd.full);
    });
  });

  const updateNotice = (dateStr, field, value) => {
    const updated = {
      ...notices,
      [dateStr]: { ...(notices[dateStr] || {}), [field]: value },
    };
    setNotices(updated);
    saveNotices(updated);
  };

  return (
    <div className="notice-wrapper">
      <table className="notice-table">
        <colgroup>
          <col style={{ width: '52px' }} />
          {DAYS.map((_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="notice-th-label" />
            {weekDates.map((wd, i) => (
              <th key={i} className={`notice-th-day${noSchoolDateSet.has(wd.full) ? ' notice-th-noschool' : ''}`}>
                {DAYS[i]} {wd.month}/{wd.date}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="notice-row-label">📄 안내장</td>
            {weekDates.map((wd, i) => {
              const isNoSchool = noSchoolDateSet.has(wd.full);
              const val = notices[wd.full]?.notice || '';
              return (
                <td key={i} className={`notice-cell${isNoSchool ? ' notice-cell-noschool' : ''}`}>
                  {adminMode && !isNoSchool ? (
                    <textarea
                      className="notice-input"
                      value={val}
                      onChange={e => updateNotice(wd.full, 'notice', e.target.value)}
                      placeholder="안내장 내용"
                    />
                  ) : (
                    <div className="notice-text">{val}</div>
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="notice-row-label">📬 제출마감</td>
            {weekDates.map((wd, i) => {
              const isNoSchool = noSchoolDateSet.has(wd.full);
              const val = notices[wd.full]?.deadline || '';
              return (
                <td key={i} className={`notice-cell${isNoSchool ? ' notice-cell-noschool' : ''}`}>
                  {adminMode && !isNoSchool ? (
                    <textarea
                      className="notice-input"
                      value={val}
                      onChange={e => updateNotice(wd.full, 'deadline', e.target.value)}
                      placeholder="제출 서류"
                    />
                  ) : (
                    <div className="notice-text">{val}</div>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
