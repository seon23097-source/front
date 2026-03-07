import { useState, useEffect } from 'react';
import { fetchEvents } from '../api/timetable';
import { getThisMonday, getWeekDates } from './Timetable';

const DAYS = ['월', '화', '수', '목', '금'];

const STORAGE_KEY = 'schosche_notices';
function loadNotices() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveNotices(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

export default function NoticeSection({ adminMode, weekOffset = 0 }) {
  const [notices, setNotices] = useState(loadNotices);
  const [events, setEvents] = useState([]);

  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);

  useEffect(() => { fetchEvents().then(setEvents).catch(() => setEvents([])); }, []);

  const noSchoolDateSet = new Set();
  events.forEach(ev => {
    if (!ev.isNoSchool) return;
    const start = ev.startDate;
    const end = ev.endDate || ev.startDate;
    weekDates.forEach(wd => { if (wd.full >= start && wd.full <= end) noSchoolDateSet.add(wd.full); });
  });

  const updateNotice = (dateStr, field, value) => {
    const updated = { ...notices, [dateStr]: { ...(notices[dateStr] || {}), [field]: value } };
    setNotices(updated);
    saveNotices(updated);
  };

  const rows = [
    { key: 'notice',   label: '안내장',   rowClass: 'notice-row-notice',   labelLines: ['안','내','장'] },
    { key: 'deadline', label: '제출마감', rowClass: 'notice-row-deadline', labelLines: ['제출','마감'] },
  ];

  return (
    <div className="notice-wrapper">
      <table className="notice-table">
        <colgroup>
          {/* 시간표의 th-nav-prev 열과 맞춤 */}
          <col className="notice-col-nav" />
          {/* 레이블 열 */}
          <col style={{ width: '44px' }} />
          {DAYS.map((_, i) => <col key={i} />)}
          {/* 시간표의 th-nav-next 열과 맞춤 */}
          <col className="notice-col-nav" />
        </colgroup>
        <tbody>
          {rows.map(({ key, label, rowClass, labelLines }) => (
            <tr key={key} className={rowClass}>
              {/* 왼쪽 nav 빈 칸 */}
              <td className="notice-nav-cell" />
              <td className="notice-row-label">
                {labelLines.map((line, i) => <span key={i} className="notice-label-char">{line}</span>)}
              </td>
              {weekDates.map((wd, i) => {
                const isNoSchool = noSchoolDateSet.has(wd.full);
                const val = notices[wd.full]?.[key] || '';
                return (
                  <td key={i} className={`notice-cell${isNoSchool ? ' notice-cell-noschool' : ''}`}>
                    {adminMode && !isNoSchool ? (
                      <textarea
                        className="notice-input"
                        value={val}
                        onChange={e => updateNotice(wd.full, key, e.target.value)}
                        placeholder={label}
                      />
                    ) : (
                      <div className="notice-text">{val}</div>
                    )}
                  </td>
                );
              })}
              {/* 오른쪽 nav 빈 칸 */}
              <td className="notice-nav-cell" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
