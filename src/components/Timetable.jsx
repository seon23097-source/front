import { useState, useEffect, useCallback } from 'react';
import { fetchTimetableByClasses, fetchColors, upsertEntry, deleteEntry } from '../api/timetable';

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const ALL_CLASSES = ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9','전담1','전담2','전담3'];
const SPECIAL_CLASSES = ['전담1','전담2','전담3'];

// 기준 월요일(Date) → 해당 주 월~금 날짜 배열 반환
function getWeekDates(mondayBase) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayBase);
    d.setDate(mondayBase.getDate() + i);
    return {
      month: d.getMonth() + 1,
      date: d.getDate(),
      full: d.toISOString().split('T')[0], // YYYY-MM-DD
    };
  });
}

// 오늘 기준 이번 주 월요일 반환 (주말이면 다음 주 월요일)
function getThisMonday() {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getInitial(subject) {
  if (!subject) return '';
  const abbrevMap = {
    '국어': '국', '수학': '수', '영어': '영', '과학': '과', '사회': '사',
    '도덕': '도', '체육': '체', '음악': '음', '미술': '미', '실과': '실',
    '창체': '창', '자율': '자', '동아리': '동', '진로': '진', '봉사': '봉',
    '안전': '안', '즐거운생활': '즐', '바른생활': '바', '슬기로운생활': '슬',
  };
  return abbrevMap[subject] || subject[0];
}

// API 응답(camelCase)을 내부 snake_case로 정규화
function normalizeEntry(e) {
  return {
    id: e.id,
    class_name: e.className ?? e.class_name,
    day_of_week: e.dayOfWeek ?? e.day_of_week,
    period: e.period,
    subject: e.subject,
    teacher_name: e.teacherName ?? e.teacher_name,
    is_special_teacher: e.isSpecialTeacher ?? e.is_special_teacher ?? false,
    apply_date: e.applyDate ?? e.apply_date ?? null,
  };
}

function CellChip({ entry, colorMap, onClick }) {
  if (!entry) return null;
  const color = colorMap[entry.class_name];
  if (!color) return null;

  const isSpecial = entry.is_special_teacher;
  const style = isSpecial
    ? { backgroundColor: '#ffffff', border: `2.5px solid ${color.border_color}`, color: color.border_color }
    : { backgroundColor: color.bg_color, border: `2px solid transparent`, color: color.text_color };

  return (
    <div
      className="cell-chip"
      style={style}
      onClick={() => onClick && onClick(entry)}
      title={`${entry.class_name} | ${entry.subject} | ${entry.teacher_name || ''}`}
    >
      <span className="chip-initial">{getInitial(entry.subject)}</span>
      {entry.teacher_name && <span className="chip-teacher">{entry.teacher_name[0]}</span>}
    </div>
  );
}

function EditModal({ cell, colorMap, onSave, onDelete, onClose }) {
  const [subject, setSubject] = useState(cell.entry?.subject || '');
  const [teacher, setTeacher] = useState(cell.entry?.teacher_name || '');
  const [isSpecial, setIsSpecial] = useState(cell.entry?.is_special_teacher || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        class_name: cell.class_name,
        day_of_week: cell.day,
        period: cell.period,
        subject,
        teacher_name: teacher,
        is_special_teacher: isSpecial,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!cell.entry) return;
    setSaving(true);
    try {
      await onDelete(cell.class_name, cell.day, cell.period);
      onClose();
    } finally { setSaving(false); }
  };

  const color = colorMap[cell.class_name];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${color?.bg_color || '#666'}` }}>
          <span className="modal-class">{cell.class_name}</span>
          <span className="modal-slot">{DAYS[cell.day]}요일 {cell.period}교시</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>
            과목명
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="예: 국어, 수학, 체육..." autoFocus />
          </label>
          <label>
            담당 교사
            <input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="교사 이름" />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={isSpecial} onChange={e => setIsSpecial(e.target.checked)} />
            전담 교사 시간 (테두리 표시)
          </label>
        </div>
        <div className="modal-footer">
          {cell.entry && <button className="btn-delete" onClick={handleDelete} disabled={saving}>삭제</button>}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Timetable({ adminMode = false }) {
  const [selectedClasses, setSelectedClasses] = useState(['4-1']);
  const [entries, setEntries] = useState([]);
  const [colorMap, setColorMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState(null);
  const [error, setError] = useState(null);
  // 주차 오프셋: 0=이번 주, -1=지난 주, 1=다음 주
  const [weekOffset, setWeekOffset] = useState(0);

  // 현재 표시 주차의 월요일 계산
  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);
  const weekDateSet = new Set(weekDates.map(d => d.full)); // 이번 주 날짜 집합

  const loadColors = useCallback(async () => {
    try {
      const colors = await fetchColors();
      const map = {};
      // API 응답이 camelCase일 수도 있으므로 둘 다 처리
      colors.forEach(c => {
        const key = c.class_name ?? c.className;
        map[key] = {
          bg_color: c.bg_color ?? c.bgColor,
          text_color: c.text_color ?? c.textColor,
          border_color: c.border_color ?? c.borderColor,
        };
      });
      setColorMap(map);
    } catch (e) { console.error(e); }
  }, []);

  const loadTimetable = useCallback(async () => {
    if (!selectedClasses.length) { setEntries([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTimetableByClasses(selectedClasses);
      setEntries(data.map(normalizeEntry));
    } catch (e) {
      setError('시간표를 불러올 수 없습니다.');
    } finally { setLoading(false); }
  }, [selectedClasses]);

  useEffect(() => { loadColors(); }, [loadColors]);
  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  const toggleClass = (cls) => {
    setSelectedClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  // 이번 주 날짜에 맞는 항목만 필터, apply_date 없으면 기본 표시
  const filteredEntries = entries.filter(e =>
    !e.apply_date || weekDateSet.has(e.apply_date)
  );

  // lookup: "dayOfWeek-period" → entries[]
  const lookup = {};
  filteredEntries.forEach(e => {
    const key = `${e.day_of_week}-${e.period}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(e);
  });

  const handleCellClick = (day, period) => {
    if (!adminMode) return;
    if (selectedClasses.length === 1) {
      const key = `${day}-${period}`;
      const existing = lookup[key]?.[0] || null;
      setEditCell({ class_name: selectedClasses[0], day, period, entry: existing });
    }
  };

  const handleChipClick = (entry) => {
    if (!adminMode) return;
    setEditCell({ class_name: entry.class_name, day: entry.day_of_week, period: entry.period, entry });
  };

  const handleSave = async (data) => { await upsertEntry(data); await loadTimetable(); };
  const handleDelete = async (cls, day, period) => { await deleteEntry(cls, day, period); await loadTimetable(); };

  const regularClasses = ALL_CLASSES.filter(c => !SPECIAL_CLASSES.includes(c));
  const specialClasses = SPECIAL_CLASSES;

  // 주차 표시 문자열
  const weekLabel = (() => {
    const from = weekDates[0];
    const to = weekDates[4];
    if (weekOffset === 0) return '이번 주';
    if (weekOffset === -1) return '지난 주';
    if (weekOffset === 1) return '다음 주';
    return `${from.month}/${from.date} ~ ${to.month}/${to.date}`;
  })();

  return (
    <div className="timetable-wrapper">
      {/* 반 선택 패널 */}
      <div className="class-selector">
        <div className="selector-group">
          <div className="selector-label">4학년 반</div>
          <div className="selector-chips">
            {regularClasses.map(cls => {
              const color = colorMap[cls];
              const active = selectedClasses.includes(cls);
              return (
                <button
                  key={cls}
                  className={`class-btn ${active ? 'active' : ''}`}
                  style={active && color ? {
                    backgroundColor: color.bg_color,
                    color: color.text_color,
                    borderColor: color.bg_color,
                  } : {
                    borderColor: color?.bg_color || '#ddd',
                    color: color?.bg_color || '#666',
                  }}
                  onClick={() => toggleClass(cls)}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        </div>
        <div className="selector-group">
          <div className="selector-label">전담 교사</div>
          <div className="selector-chips">
            {specialClasses.map(cls => {
              const color = colorMap[cls];
              const active = selectedClasses.includes(cls);
              return (
                <button
                  key={cls}
                  className={`class-btn special ${active ? 'active' : ''}`}
                  style={active && color ? {
                    backgroundColor: '#ffffff',
                    color: color.border_color,
                    borderColor: color.border_color,
                    borderWidth: '2px',
                  } : {
                    borderColor: color?.border_color || '#aaa',
                    color: color?.border_color || '#666',
                  }}
                  onClick={() => toggleClass(cls)}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        </div>
        <div className="selector-actions">
          <button className="sel-all" onClick={() => setSelectedClasses([...ALL_CLASSES])}>전체 선택</button>
          <button className="sel-none" onClick={() => setSelectedClasses([])}>전체 해제</button>
        </div>
      </div>

      {/* 범례 */}
      {selectedClasses.length > 0 && (
        <div className="legend">
          {selectedClasses.map(cls => {
            const color = colorMap[cls];
            if (!color) return null;
            const isSpecial = SPECIAL_CLASSES.includes(cls);
            return (
              <div key={cls} className="legend-item">
                <div className="legend-dot" style={isSpecial ? {
                  backgroundColor: '#fff',
                  border: `2px solid ${color.border_color}`,
                } : { backgroundColor: color.bg_color }} />
                <span style={{ color: isSpecial ? color.border_color : color.bg_color }}>{cls}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 주차 네비게이션 */}
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
        <span className="week-nav-label">{weekLabel}</span>
        <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>›</button>
        {weekOffset !== 0 && (
          <button className="week-nav-today" onClick={() => setWeekOffset(0)}>오늘</button>
        )}
      </div>

      {/* 시간표 그리드 */}
      <div className="timetable-container">
        {loading && <div className="loading-overlay">불러오는 중...</div>}
        {error && <div className="error-msg">{error}</div>}
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="th-period">교시</th>
              {DAYS.map((d, i) => (
                <th key={d} className="th-day">
                  <span className="th-day-name">{d}</span>
                  <span className="th-day-date">{weekDates[i].month}/{weekDates[i].date}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => (
              <tr key={period}>
                <td className="td-period">{period}</td>
                {DAYS.map((_, dayIdx) => {
                  const key = `${dayIdx}-${period}`;
                  const cellEntries = lookup[key] || [];
                  return (
                    <td
                      key={dayIdx}
                      className={`td-cell ${adminMode ? 'editable' : ''}`}
                      onClick={() => handleCellClick(dayIdx, period)}
                    >
                      <div className="cell-chips">
                        {cellEntries.map(e => (
                          <CellChip
                            key={e.id}
                            entry={e}
                            colorMap={colorMap}
                            onClick={adminMode ? handleChipClick : null}
                          />
                        ))}
                        {adminMode && selectedClasses.length === 1 && cellEntries.length === 0 && (
                          <div className="cell-add-hint">+</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editCell && (
        <EditModal
          cell={editCell}
          colorMap={colorMap}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditCell(null)}
        />
      )}
    </div>
  );
}
