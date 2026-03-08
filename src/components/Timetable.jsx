import { useState, useEffect, useCallback } from 'react';
import {
  fetchTimetableByClasses, fetchColors, upsertEntry, deleteEntry,
  getFreeTeachers, saveSubstitute, clearSubstitute, fetchEvents,
} from '../api/timetable';
import { getClasses } from '../api/admin';
import { fetchNoticeItems, createNoticeItem, deleteNoticeItem } from '../api/noticeApi';

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6];
// ── notice items: API 기반 ──────────────────────────────
// 동기 호환용 캐시 (DeadlineBoard/NoticeBoard에서 동기로 읽는 곳 대비)
let _noticeItemsCache = [];

export function loadNoticeItems() { return _noticeItemsCache; }
export function saveNoticeItems(items) {
  _noticeItemsCache = items;
  window.dispatchEvent(new Event('noticeItemsChanged'));
}
export async function refreshNoticeItems() {
  _noticeItemsCache = await fetchNoticeItems();
  window.dispatchEvent(new Event('noticeItemsChanged'));
  return _noticeItemsCache;
}

export function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getThisMonday() {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDates(mondayBase) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mondayBase);
    d.setDate(mondayBase.getDate() + i);
    return { month: d.getMonth() + 1, date: d.getDate(), full: toLocalDateStr(d) };
  });
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

// compact=true 이면 이름 없이 과목 이니셜만 (5개 이상 칩일 때)
// dimmed=true 이면 그레이스케일 + 반투명 (전담 강조 필터)
function CellChip({ entry, colorMap, onClick, compact = false, dimmed = false }) {
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
      className={`cell-chip${isSub ? ' cell-chip-substitute' : ''}${compact ? ' cell-chip-compact' : ''}${dimmed ? ' cell-chip-dimmed' : ''}`}
      style={style}
      onClick={() => onClick && onClick(entry)}
      title={isSub
        ? `보결: ${entry.substitute_from || ''} → ${entry.class_name} | ${entry.teacher_name || ''}`
        : `${entry.class_name} | ${entry.subject} | ${entry.teacher_name || ''}`}
    >
      {isSub ? (
        <>
          <span className="chip-sub-badge">보</span>
          {!compact && <span className="chip-sub-from">{entry.substitute_from || ''}</span>}
        </>
      ) : (
        <>
          <span className="chip-initial">{getInitial(entry.subject)}</span>
          {!compact && entry.teacher_name && <span className="chip-teacher">{entry.teacher_name}</span>}
        </>
      )}
    </div>
  );
}

// ── 안내장/제출마감 등록 모달 ─────────────────────────
function FileAttachField({ files, onChange }) {
  return (
    <label>
      첨부파일
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <label style={{
          padding: '5px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'none', letterSpacing: 0,
        }}>
          📎 파일 선택
          <input type="file" multiple style={{ display: 'none' }}
            onChange={e => onChange(Array.from(e.target.files))} />
        </label>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {files.length > 0 ? files.map(f => f.name).join(', ') : '선택된 파일 없음'}
        </span>
      </div>
    </label>
  );
}

// ── 안내장/제출마감 상세보기 모달 ────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 4000 }}>
      <div className="modal-box confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="modal-class">삭제 확인</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onCancel}>취소</button>
          <button className="btn-delete" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            onClick={onConfirm}>🗑️ 삭제</button>
        </div>
      </div>
    </div>
  );
}

function NoticeViewModal({ items, type, adminMode, onClose, onAdd }) {
  const [confirmId, setConfirmId] = useState(null);
  const typeLabel = type === 'notice' ? '안내장' : '제출마감';
  const accentColor = type === 'notice' ? '#FF6B35' : '#3D5AFE';

  const handleDelete = async (id) => {
    await deleteNoticeItem(id);
    await refreshNoticeItems();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${accentColor}` }}>
          <span className="modal-class">{typeLabel} 목록</span>
          <span className="modal-slot">{items[0]?.date}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{
              padding: '10px 12px', background: 'var(--surface2)',
              borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {item.title}
              </div>
              {type === 'deadline' && item.submitPlace && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 제출할 곳: {item.submitPlace}</div>
              )}
              {item.fileNames?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {item.fileNames.map((name, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      📎 {name}
                    </div>
                  ))}
                </div>
              )}
              {adminMode && (
                <button
                  onClick={() => setConfirmId(item.id)}
                  style={{ marginTop: 6, background: 'none', border: '1px solid #ffd0d3', borderRadius: 4, fontSize: 11, color: 'var(--danger)', cursor: 'pointer', padding: '2px 8px' }}
                >🗑️ 삭제</button>
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          {adminMode && (
            <button className="btn-save" onClick={onAdd}>＋ 추가 등록</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
      </div>
      {confirmId && (
        <ConfirmModal
          message="이 항목을 삭제할까요?"
          onConfirm={() => { handleDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

function NoticeItemModal({ dateStr, type, onClose }) {
  const typeLabel = type === 'notice' ? '안내장' : '제출마감';
  const accentColor = type === 'notice' ? '#FF6B35' : '#3D5AFE';
  const [title, setTitle] = useState('');
  const [displayDate, setDisplayDate] = useState(() => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월${d.getDate()}일`;
  });
  const [submitPlace, setSubmitPlace] = useState('');
  const [files, setFiles] = useState([]);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const saved = await createNoticeItem({
      type,
      title: title.trim(),
      date: dateStr,
      displayDate,
      submitPlace: submitPlace.trim(),
      fileNames: files.map(f => f.name),
    });
    if (saved) await refreshNoticeItems();
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${accentColor}` }}>
          <span className="modal-class">{typeLabel} 등록</span>
          <span className="modal-slot">{dateStr}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {type === 'notice' && (
            <label>
              배부일
              <input type="text" value={displayDate}
                onChange={e => setDisplayDate(e.target.value)}
                placeholder="예: 3월8일" />
            </label>
          )}
          <label>
            {typeLabel} {type === 'deadline' ? '항목명' : '제목'}
            <input type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={type === 'notice' ? '안내장 제목' : '제출 항목명'}
              autoFocus />
          </label>
          {type === 'deadline' && (
            <>
              <label>
                마감일
                <input type="text" value={dateStr} readOnly
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }} />
              </label>
              <label>
                제출할 곳
                <input type="text" value={submitPlace}
                  onChange={e => setSubmitPlace(e.target.value)}
                  placeholder="예: 담임 선생님께, 교무실" />
              </label>
            </>
          )}
          <FileAttachField files={files} onChange={setFiles} />
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave} disabled={!title.trim()}>등록</button>
        </div>
      </div>
    </div>
  );
}

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
        class_name: entry.class_name, day_of_week: entry.day_of_week,
        period: entry.period, apply_date: applyDate,
        substitute_class: selected.className, substitute_teacher: selected.teacherName,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onClear({ class_name: entry.class_name, day_of_week: entry.day_of_week, period: entry.period, apply_date: applyDate });
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
          <p className="sub-modal-info"><strong>{entry.subject}</strong> 수업의 보결 교사를 선택하세요.</p>
          {loading ? <div className="sub-loading">빈 교사 확인 중...</div>
          : freeTeachers.length === 0 ? <div className="sub-empty">해당 교시에 수업 없는 교사가 없습니다.</div>
          : (
            <div className="sub-teacher-list">
              {freeTeachers.map(t => (
                <button key={t.className}
                  className={`sub-teacher-btn${selected?.className === t.className ? ' selected' : ''}`}
                  onClick={() => setSelected(t)}>
                  <span className="sub-class">{t.className}</span>
                  {t.teacherName && <span className="sub-name">{t.teacherName}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {entry.is_substitute && <button className="btn-delete" onClick={handleClear} disabled={saving}>보결 해제</button>}
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

// weekOffset을 외부에서 제어할 수 있도록 prop으로 받거나 내부 state 사용
export default function Timetable({ adminMode = false, onWeekOffsetChange }) {
  const [selectedClasses, setSelectedClasses] = useState(['4-1']);
  const [entries, setEntries] = useState([]);
  const [colorMap, setColorMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState(null);
  const [subCell, setSubCell] = useState(null);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState([]);
  // DB에서 로드한 클래스 목록
  const [classesList, setClassesList] = useState([]);
  // 전담 강조 필터: { className, teacherName } | null
  const [focusedTeacher, setFocusedTeacher] = useState(null);
  // 안내장/제출마감
  const [notices, setNotices] = useState(loadNotices);
  const [noticeModal, setNoticeModal] = useState(null); // { dateStr, type }

  // classesList 기반 동적 목록
  const regularClasses = classesList.filter(c => !c.isSpecial).map(c => c.className);
  const specialClasses = classesList.filter(c => c.isSpecial);
  const allClassNames = classesList.map(c => c.className);

  const changeWeekOffset = (val) => {
    const next = typeof val === 'function' ? val(weekOffset) : val;
    setWeekOffset(next);
    onWeekOffsetChange && onWeekOffsetChange(next);
  };

  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);
  const weekDateSet = new Set(weekDates.map(d => d.full));

  // 날짜별 이벤트 매핑
  const dayEventMap = {};
  events.forEach(ev => {
    const start = ev.startDate;
    const end = ev.endDate || ev.startDate;
    weekDates.forEach(wd => {
      if (wd.full >= start && wd.full <= end) {
        if (!dayEventMap[wd.full]) dayEventMap[wd.full] = [];
        dayEventMap[wd.full].push({ name: ev.name, type: ev.type, isNoSchool: ev.isNoSchool });
      }
    });
  });

  const noSchoolDateSet = new Set(
    Object.entries(dayEventMap)
      .filter(([, evs]) => evs.some(e => e.isNoSchool))
      .map(([date]) => date)
  );

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
    setLoading(true); setError(null);
    try {
      const data = await fetchTimetableByClasses(selectedClasses);
      setEntries(data.map(normalizeEntry));
    } catch (e) { setError('시간표를 불러올 수 없습니다.'); }
    finally { setLoading(false); }
  }, [selectedClasses]);

  useEffect(() => { loadColors(); }, [loadColors]);
  useEffect(() => { loadTimetable(); }, [loadTimetable]);
  useEffect(() => { refreshNoticeItems(); }, []);
  useEffect(() => { fetchEvents().then(setEvents).catch(() => setEvents([])); }, []);
  useEffect(() => {
    getClasses()
      .then(data => {
        // sort_order 기준 정렬
        const sorted = [...data].sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
        setClassesList(sorted);
      })
      .catch(() => {
        // 폴백: 하드코딩
        setClassesList([
          ...['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9'].map((n,i) => ({ className: n, isSpecial: false, sortOrder: i+1 })),
          { className: '전담1', isSpecial: true, sortOrder: 10 },
          { className: '전담2', isSpecial: true, sortOrder: 11 },
          { className: '전담3', isSpecial: true, sortOrder: 12 },
        ]);
      });
  }, []);

  const toggleClass = (cls) =>
    setSelectedClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);

  const filteredEntries = entries.filter(e => !e.apply_date || weekDateSet.has(e.apply_date));

  const lookup = {};
  filteredEntries.forEach(e => {
    const key = `${e.day_of_week}-${e.period}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(e);
  });

  const handleChipClick = (entry) => {
    if (adminMode) {
      setEditCell({ class_name: entry.class_name, day: entry.day_of_week, period: entry.period, entry });
    } else {
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
  const handleDelete = async (cls, day, period, applyDate = null) => { await deleteEntry(cls, day, period, applyDate); await loadTimetable(); };
  const handleSubSave = async (data) => { await saveSubstitute(data); await loadTimetable(); };
  const handleSubClear = async (data) => { await clearSubstitute(data); await loadTimetable(); };

  // 전담 버튼 클릭: 강조 토글
  const handleSpecialFocus = (cls) => {
    if (focusedTeacher?.className === cls.className) {
      setFocusedTeacher(null); // 다시 클릭 시 해제
    } else {
      setFocusedTeacher({ className: cls.className, teacherName: cls.teacherName });
      // 해당 전담 클래스를 선택 목록에 추가 (시간표에 표시되게)
      if (!selectedClasses.includes(cls.className)) {
        setSelectedClasses(prev => [...prev, cls.className]);
      }
    }
  };

  const updateNotice = (dateStr, field, value) => {
    const updated = { ...notices, [dateStr]: { ...(notices[dateStr] || {}), [field]: value } };
    setNotices(updated);
    saveNoticesStorage(updated);
  };

  // noticeItems 변경 시 셀 텍스트 자동 갱신
  useEffect(() => {
    const refresh = () => {
      const items = loadNoticeItems();
      const cellMap = {};
      // 최신순 정렬 후 날짜별로 텍스트 누적
      [...items].sort((a, b) => a.createdAt - b.createdAt).forEach(item => {
        if (!cellMap[item.date]) cellMap[item.date] = {};
        const line = item.type === 'notice'
          ? `[${item.displayDate} 배부] ${item.title}`
          : `• ${item.title}`;
        const cur = cellMap[item.date][item.type] || '';
        cellMap[item.date][item.type] = cur ? cur + '\n' + line : line;
      });
      setNotices(prev => {
        const next = { ...prev };
        Object.entries(cellMap).forEach(([date, fields]) => {
          next[date] = { ...(next[date] || {}), ...fields };
        });
        return next;
      });
    };
    refresh();
    window.addEventListener('noticeItemsChanged', refresh);
    return () => window.removeEventListener('noticeItemsChanged', refresh);
  }, []);

  const noticeRows = [
    { key: 'notice',   labelLines: ['안','내','장'], rowClass: 'notice-row-notice',   label: '안내장'  },
    { key: 'deadline', labelLines: ['제출','마감'],  rowClass: 'notice-row-deadline', label: '제출마감' },
  ];

  const weekLabel = weekOffset === 0 ? '이번 주' : weekOffset === -1 ? '지난 주' : weekOffset === 1 ? '다음 주'
    : `${weekDates[0].month}/${weekDates[0].date}~${weekDates[4].month}/${weekDates[4].date}`;

  return (
    <div className="timetable-wrapper">

      {/* 반 선택 — 컴팩트 1줄 */}
      <div className="class-selector">
        <div className="selector-chips">
          {regularClasses.map(cls => {
            const color = colorMap[cls];
            const active = selectedClasses.includes(cls);
            return (
              <button key={cls} className={`class-btn${active ? ' active' : ''}`}
                style={active && color
                  ? { backgroundColor: color.bg_color, color: color.text_color, borderColor: color.bg_color }
                  : { borderColor: color?.bg_color || '#ddd', color: color?.bg_color || '#666' }}
                onClick={() => toggleClass(cls)}>{cls}</button>
            );
          })}
          <span className="selector-divider" />
          {specialClasses.map(cls => {
            const color = colorMap[cls.className];
            const active = selectedClasses.includes(cls.className);
            const focused = focusedTeacher?.className === cls.className;
            // 표시 이름: className 그대로 (관리자가 '체육1'로 입력했으면 '체육1' 표시)
            const displayName = cls.className;
            return (
              <button key={cls.className}
                className={`class-btn special${active ? ' active' : ''}${focused ? ' focused' : ''}`}
                style={active && color
                  ? { backgroundColor: focused ? color.border_color : '#fff',
                      color: focused ? '#fff' : color.border_color,
                      borderColor: color.border_color, borderWidth: '2px' }
                  : { borderColor: color?.border_color || '#aaa', color: color?.border_color || '#666' }}
                onClick={() => handleSpecialFocus(cls)}
                title={cls.teacherName ? `${displayName} (${cls.teacherName})` : displayName}
              >{displayName}</button>
            );
          })}
        </div>
        <div className="selector-actions">
          <button className="sel-icon-btn" title="전체 선택" onClick={() => setSelectedClasses([...allClassNames])}>☑</button>
          <button className="sel-icon-btn" title="전체 해제" onClick={() => { setSelectedClasses([]); setFocusedTeacher(null); }}>☐</button>
        </div>
      </div>

      {/* 전담 강조 중 안내 배너 */}
      {focusedTeacher && (
        <div className="focus-banner">
          <span>
            🔍 <strong>{focusedTeacher.className}</strong>
            {focusedTeacher.teacherName && ` · ${focusedTeacher.teacherName}`} 교사 시간 강조 중
          </span>
          <button className="focus-banner-close" onClick={() => setFocusedTeacher(null)}>✕ 해제</button>
        </div>
      )}

      {/* 시간표 그리드 */}
      <div className="timetable-container">
        {loading && <div className="loading-overlay">불러오는 중...</div>}
        {error && <div className="error-msg">{error}</div>}
        <table className="timetable-grid">
          <thead>
            <tr>
              {/* 이전 주 화살표 열 */}
              <th className="th-nav th-nav-prev">
                <button className="week-nav-arrow" onClick={() => changeWeekOffset(o => o - 1)} title="이전 주">‹</button>
              </th>
              {DAYS.map((d, i) => {
                const dateStr = weekDates[i].full;
                const dayEvs = dayEventMap[dateStr] || [];
                const isNoSchoolDay = noSchoolDateSet.has(dateStr);
                return (
                  <th key={d} className={`th-day${isNoSchoolDay ? ' th-day-noschool' : ''}`}>
                    <div className="th-day-headline">
                      <span className="th-day-name">{d}</span>
                      <span className="th-day-date">{weekDates[i].month}/{weekDates[i].date}</span>
                    </div>
                    {/* 행사/공휴일 영역 — 항상 일정 높이 유지 */}
                    <div className="th-event-row">
                      {dayEvs.length > 0
                        ? dayEvs.map((ev, ei) => (
                            <span key={ei} className={`th-event-label${ev.type === 'holiday' ? ' th-event-holiday' : ''}`}>
                              {ev.name}
                            </span>
                          ))
                        : <span className="th-event-placeholder" />
                      }
                    </div>
                  </th>
                );
              })}
              {/* 다음 주 화살표 열 */}
              <th className="th-nav th-nav-next">
                <button className="week-nav-arrow" onClick={() => changeWeekOffset(o => o + 1)} title="다음 주">›</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => (
              <tr key={period}>
                {/* 이전 주 열 — 빈 칸 */}
                <td className="td-nav td-nav-left" />
                {DAYS.map((_, dayIdx) => {
                  const key = `${dayIdx}-${period}`;
                  const cellEntries = lookup[key] || [];
                  const dateStr = weekDates[dayIdx].full;
                  const isNoSchoolDay = noSchoolDateSet.has(dateStr);
                  return (
                    <td key={dayIdx}
                      className={`td-cell${adminMode ? ' editable' : ''}${isNoSchoolDay ? ' td-cell-noschool' : ''}`}
                      onClick={() => !isNoSchoolDay && handleCellClick(dayIdx, period)}
                    >
                      <div className={`cell-chips${cellEntries.length >= 5 ? ' cell-chips-compact' : ''}`}>
                        {cellEntries.map(e => {
                          const isDimmed = focusedTeacher
                            ? !(e.teacher_name && focusedTeacher.teacherName &&
                                e.teacher_name === focusedTeacher.teacherName)
                            : false;
                          return (
                            <CellChip key={e.id} entry={e} colorMap={colorMap}
                              compact={cellEntries.length >= 5}
                              dimmed={isDimmed}
                              onClick={isNoSchoolDay ? null : handleChipClick} />
                          );
                        })}
                        {adminMode && selectedClasses.length === 1 && cellEntries.length === 0 && !isNoSchoolDay && (
                          <div className="cell-add-hint">+</div>
                        )}
                      </div>
                    </td>
                  );
                })}
                {/* 다음 주 열 — 교시 번호 (흰색) */}
                <td className="td-nav td-period-right">{period}</td>
              </tr>
            ))}
          </tbody>

          {/* ── 안내장 / 제출마감 — 같은 테이블 tfoot으로 열 완전 일치 ── */}
          <tfoot>
            {noticeRows.map(({ key, labelLines, rowClass, label }) => (
              <tr key={key} className={`notice-trow ${rowClass}`}>
                {/* 왼쪽 nav 열 — 레이블 표시 */}
                <td className="td-nav td-nav-left notice-label-td">
                  {labelLines.map((l, i) => <span key={i}>{l}</span>)}
                </td>
                {DAYS.map((_, dayIdx) => {
                  const dateStr = weekDates[dayIdx].full;
                  const isNoSchool = noSchoolDateSet.has(dateStr);
                  const val = notices[dateStr]?.[key] || '';
                  return (
                    <td
                      key={dayIdx}
                      className={`notice-cell${isNoSchool ? ' notice-cell-noschool' : ''}${!isNoSchool ? ' notice-cell-clickable' : ''}`}
                      onClick={() => {
                        if (isNoSchool) return;
                        // 등록된 항목이 있으면 상세보기, 없으면 등록 모달(관리자만)
                        const existing = loadNoticeItems().filter(i => i.type === key && i.date === dateStr);
                        if (existing.length > 0) {
                          setNoticeModal({ dateStr, type: key, viewItems: existing });
                        } else if (adminMode) {
                          setNoticeModal({ dateStr, type: key });
                        }
                      }}
                    >
                      <div className="notice-text">
                        {val || (adminMode && !isNoSchool
                          ? <span className="notice-placeholder">+ {label}</span>
                          : '')}
                      </div>
                    </td>
                  );
                })}
                {/* 오른쪽 nav 빈 칸 */}
                <td className="td-nav notice-nav-td" />
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      {noticeModal && (
        noticeModal.viewItems ? (
          <NoticeViewModal
            items={noticeModal.viewItems}
            type={noticeModal.type}
            adminMode={adminMode}
            onClose={() => setNoticeModal(null)}
            onAdd={() => setNoticeModal({ dateStr: noticeModal.dateStr, type: noticeModal.type })}
          />
        ) : (
          <NoticeItemModal
            dateStr={noticeModal.dateStr}
            type={noticeModal.type}
            onClose={() => setNoticeModal(null)}
          />
        )
      )}

      {editCell && (
        <EditModal cell={editCell} colorMap={colorMap}
          onSave={handleSave} onDelete={handleDelete} onClose={() => setEditCell(null)} />
      )}
      {subCell && (
        <SubstituteModal entry={subCell} applyDate={subCell.apply_date}
          onSave={handleSubSave} onClear={handleSubClear} onClose={() => setSubCell(null)} />
      )}
    </div>
  );
}
