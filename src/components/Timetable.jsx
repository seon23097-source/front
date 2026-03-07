import { useState, useEffect, useCallback } from 'react';
import {
  fetchTimetableByClasses, fetchColors, upsertEntry, deleteEntry,
  getFreeTeachers, saveSubstitute, clearSubstitute,
} from '../api/timetable';

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const ALL_CLASSES = ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9','전담1','전담2','전담3'];
const SPECIAL_CLASSES = ['전담1','전담2','전담3'];

function getWeekDates(mondayBase) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayBase);
    d.setDate(mondayBase.getDate() + i);
    return { month: d.getMonth() + 1, date: d.getDate(), full: d.toISOString().split('T')[0] };
  });
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
    is_substitute: e.isSubstitute ?? e.is_substitute ?? false,
    substitute_from: e.substituteFrom ?? e.substitute_from ?? null,
    original_teacher_name: e.originalTeacherName ?? e.original_teacher_name ?? null,
  };
}

// 칩 컴포넌트 — 보결이면 '보' + substituteFrom 반 표시
function CellChip({ entry, colorMap, onClick }) {
  if (!entry) return null;
  const color = colorMap[entry.class_name];
  if (!color) return null;

  const isSpecial = entry.is_special_teacher;
  const isSub = entry.is_substitute;

  const style = isSpecial
    ? { backgroundColor: '#ffffff', border: `2.5px solid ${color.border_color}`, color: color.border_color }
    : { backgroundColor: color.bg_color, border: `2px solid transparent`, color: color.text_color };

  return (
    <div
      className={`cell-chip ${isSub ? 'cell-chip-substitute' : ''}`}
      style={style}
      onClick={() => onClick && onClick(entry)}
      title={isSub
        ? `보결: ${entry.substitute_from || ''} → ${entry.class_name} | ${entry.teacher_name || ''}`
        : `${entry.class_name} | ${entry.subject} | ${entry.teacher_name || ''}`}
    >
      {isSub ? (
        <>
          <span className="chip-sub-badge">보</span>
          <span className="chip-sub-from">{entry.substitute_from || ''}</span>
        </>
      ) : (
        <>
          <span className="chip-initial">{getInitial(entry.subject)}</span>
          {entry.teacher_name && <span className="chip-teacher">{entry.teacher_name}</span>}
        </>
      )}
    </div>
  );
}

// 보결 모달
function SubstituteModal({ entry, applyDate, onSave, onClear, onClose }) {
  const [freeTeachers, setFreeTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFreeTeachers(entry.day_of_week, entry.period, applyDate)
      .then(data => setFreeTeachers(data))
      .catch(() => setFreeTeachers([]))
      .finally(() => setLoading(false));
  }, [entry, applyDate]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onSave({
        class_name: entry.class_name,
        day_of_week: entry.day_of_week,
        period: entry.period,
        apply_date: applyDate,
        substitute_class: selected.className,
        substitute_teacher: selected.teacherName,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onClear({
        class_name: entry.class_name,
        day_of_week: entry.day_of_week,
        period: entry.period,
        apply_date: applyDate,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="modal-class">{entry.class_name}</span>
          <span className="modal-slot">{DAYS[entry.day_of_week]}요일 {entry.period}교시 보결</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="sub-modal-info">
            <strong>{entry.subject}</strong> 수업의 보결 교사를 선택하세요.
          </p>
          {loading ? (
            <div className="sub-loading">빈 교사 확인 중...</div>
          ) : freeTeachers.length === 0 ? (
            <div className="sub-empty">해당 교시에 수업 없는 교사가 없습니다.</div>
          ) : (
            <div className="sub-teacher-list">
              {freeTeachers.map(t => (
                <button
                  key={t.className}
                  className={`sub-teacher-btn ${selected?.className === t.className ? 'selected' : ''}`}
                  onClick={() => setSelected(t)}
                >
                  <span className="sub-class">{t.className}</span>
                  {t.teacherName && <span className="sub-name">{t.teacherName}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {entry.is_substitute && (
            <button className="btn-delete" onClick={handleClear} disabled={saving}>보결 해제</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave} disabled={saving || !selected}>
            {saving ? '저장 중...' : '보결 지정'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 기존 편집 모달 (관리자용)
function EditModal({ cell, colorMap, onSave, onDelete, onClose }) {
  const [subject, setSubject] = useState(cell.entry?.subject || '');
  const [teacher, setTeacher] = useState(cell.entry?.teacher_name || '');
  const [isSpecial, setIsSpecial] = useState(cell.entry?.is_special_teacher || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ class_name: cell.class_name, day_of_week: cell.day, period: cell.period, subject, teacher_name: teacher, is_special_teacher: isSpecial });
      onClose();
    } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!cell.entry) return;
    setSaving(true);
    try { await onDelete(cell.class_name, cell.day, cell.period, cell.entry?.apply_date ?? null); onClose(); }
    finally { setSaving(false); }
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
          <label>과목명<input value={subject} onChange={e => setSubject(e.target.value)} placeholder="예: 국어, 수학, 체육..." autoFocus /></label>
          <label>담당 교사<input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="교사 이름" /></label>
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
  const [subCell, setSubCell] = useState(null); // 보결 모달용
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);
  const weekDateSet = new Set(weekDates.map(d => d.full));

  const loadColors = useCallback(async () => {
    try {
      const colors = await fetchColors();
      const map = {};
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
    } catch (e) { setError('시간표를 불러올 수 없습니다.'); }
    finally { setLoading(false); }
  }, [selectedClasses]);

  useEffect(() => { loadColors(); }, [loadColors]);
  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  const toggleClass = (cls) =>
    setSelectedClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);

  // 이번 주 날짜에 맞는 항목만 필터
  const filteredEntries = entries.filter(e =>
    !e.apply_date || weekDateSet.has(e.apply_date)
  );

  const lookup = {};
  filteredEntries.forEach(e => {
    const key = `${e.day_of_week}-${e.period}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(e);
  });

  // 칩 클릭: 관리자 모드 → 편집 모달, 일반 모드 → 보결 모달
  const handleChipClick = (entry) => {
    if (adminMode) {
      setEditCell({ class_name: entry.class_name, day: entry.day_of_week, period: entry.period, entry });
    } else {
      // 보결 모달: applyDate가 있는 항목만 (날짜 특정 가능한 경우)
      if (entry.apply_date) setSubCell(entry);
    }
  };

  const handleCellClick = (day, period) => {
    if (!adminMode) return;
    if (selectedClasses.length === 1) {
      const key = `${day}-${period}`;
      const existing = lookup[key]?.[0] || null;
      setEditCell({ class_name: selectedClasses[0], day, period, entry: existing });
    }
  };

  const handleSave = async (data) => { await upsertEntry(data); await loadTimetable(); };
  const handleDelete = async (cls, day, period, applyDate = null) => {
    await deleteEntry(cls, day, period, applyDate);
    await loadTimetable();
  };
  const handleSubSave = async (data) => { await saveSubstitute(data); await loadTimetable(); };
  const handleSubClear = async (data) => { await clearSubstitute(data); await loadTimetable(); };

  const regularClasses = ALL_CLASSES.filter(c => !SPECIAL_CLASSES.includes(c));
  const specialClasses = SPECIAL_CLASSES;

  const weekLabel = weekOffset === 0 ? '이번 주' : weekOffset === -1 ? '지난 주' : weekOffset === 1 ? '다음 주'
    : `${weekDates[0].month}/${weekDates[0].date} ~ ${weekDates[4].month}/${weekDates[4].date}`;

  return (
    <div className="timetable-wrapper">
      {/* 반 선택 */}
      <div className="class-selector">
        <div className="selector-group">
          <div className="selector-label">4학년 반</div>
          <div className="selector-chips">
            {regularClasses.map(cls => {
              const color = colorMap[cls];
              const active = selectedClasses.includes(cls);
              return (
                <button key={cls} className={`class-btn ${active ? 'active' : ''}`}
                  style={active && color ? { backgroundColor: color.bg_color, color: color.text_color, borderColor: color.bg_color }
                    : { borderColor: color?.bg_color || '#ddd', color: color?.bg_color || '#666' }}
                  onClick={() => toggleClass(cls)}>{cls}</button>
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
                <button key={cls} className={`class-btn special ${active ? 'active' : ''}`}
                  style={active && color ? { backgroundColor: '#ffffff', color: color.border_color, borderColor: color.border_color, borderWidth: '2px' }
                    : { borderColor: color?.border_color || '#aaa', color: color?.border_color || '#666' }}
                  onClick={() => toggleClass(cls)}>{cls}</button>
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
                <div className="legend-dot" style={isSpecial
                  ? { backgroundColor: '#fff', border: `2px solid ${color.border_color}` }
                  : { backgroundColor: color.bg_color }} />
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
                    <td key={dayIdx}
                      className={`td-cell ${adminMode ? 'editable' : ''}`}
                      onClick={() => handleCellClick(dayIdx, period)}
                    >
                      <div className="cell-chips">
                        {cellEntries.map(e => (
                          <CellChip key={e.id} entry={e} colorMap={colorMap} onClick={handleChipClick} />
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

      {/* 관리자 편집 모달 */}
      {editCell && (
        <EditModal cell={editCell} colorMap={colorMap}
          onSave={handleSave} onDelete={handleDelete} onClose={() => setEditCell(null)} />
      )}

      {/* 보결 모달 */}
      {subCell && (
        <SubstituteModal
          entry={subCell}
          applyDate={subCell.apply_date}
          onSave={handleSubSave}
          onClear={handleSubClear}
          onClose={() => setSubCell(null)}
        />
      )}
    </div>
  );
}
