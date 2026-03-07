import { useState, useEffect, useCallback } from 'react';
import {
  getSettings, saveSettings,
  getEvents, createEvent, updateEvent, deleteEvent,
  getClasses, createClass, updateClass, deleteClass,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getBaseTimetable, saveBaseEntry, deleteBaseEntry, applyBaseTimetable,
} from '../api/admin';

const DAYS = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

/* ── 공통 헬퍼 ──────────────────────────────────────── */
function SectionTitle({ icon, title, desc }) {
  return (
    <div className="ap-section-title">
      <span className="ap-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled, small }) {
  return (
    <button
      className={`ap-btn ap-btn-${variant}${small ? ' ap-btn-small' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function InputRow({ label, children }) {
  return (
    <div className="ap-input-row">
      <label className="ap-label">{label}</label>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   1. 기본정보 – 학기 일정 설정
══════════════════════════════════════════════════════ */
function MenuSettings() {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    year: currentYear,
    sem1Start: '',
    summerVacationStart: '',
    sem2Start: '',
    winterVacationStart: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(list => {
      const cur = list?.find(s => s.year === currentYear) || list?.[0];
      if (cur) {
        setForm({
          year: cur.year,
          sem1Start: cur.sem1Start || cur.sem_1_start || '',
          summerVacationStart: cur.summerVacationStart || cur.summer_vacation_start || '',
          sem2Start: cur.sem2Start || cur.sem_2_start || '',
          winterVacationStart: cur.winterVacationStart || cur.winter_vacation_start || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentYear]);

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="ap-loading">불러오는 중...</div>;

  return (
    <div className="ap-menu-content">
      <SectionTitle icon="🗓️" title="기본정보" desc="학년도 학기 일정을 설정합니다." />
      <div className="ap-card">
        <InputRow label="학년도">
          <input
            type="number"
            className="ap-input"
            value={form.year}
            onChange={e => setForm(f => ({ ...f, year: +e.target.value }))}
          />
          <span className="ap-hint">예: {currentYear}</span>
        </InputRow>
        <div className="ap-divider" />
        <InputRow label="1학기 시작일">
          <input type="date" className="ap-input" value={form.sem1Start}
            onChange={e => setForm(f => ({ ...f, sem1Start: e.target.value }))} />
          <span className="ap-hint">보통 3월 초</span>
        </InputRow>
        <InputRow label="여름방학 시작일">
          <input type="date" className="ap-input" value={form.summerVacationStart}
            onChange={e => setForm(f => ({ ...f, summerVacationStart: e.target.value }))} />
          <span className="ap-hint">여름방학 첫째 날</span>
        </InputRow>
        <InputRow label="2학기 시작일">
          <input type="date" className="ap-input" value={form.sem2Start}
            onChange={e => setForm(f => ({ ...f, sem2Start: e.target.value }))} />
          <span className="ap-hint">보통 8월 말 ~ 9월 초</span>
        </InputRow>
        <InputRow label="겨울방학 시작일">
          <input type="date" className="ap-input" value={form.winterVacationStart}
            onChange={e => setForm(f => ({ ...f, winterVacationStart: e.target.value }))} />
          <span className="ap-hint">다음 해 2월까지 이어질 수 있음</span>
        </InputRow>
        <div className="ap-actions">
          <Btn onClick={handleSave} variant={saved ? 'success' : 'primary'}>
            {saved ? '✓ 저장됨' : '저장'}
          </Btn>
        </div>
        {form.sem1Start && form.winterVacationStart && (
          <div className="ap-summary">
            <div className="ap-summary-item">
              <span className="dot" style={{ background: '#3D5AFE' }} />
              <span>1학기: {form.sem1Start} ~ {form.summerVacationStart ? dayBefore(form.summerVacationStart) : '미설정'}</span>
            </div>
            <div className="ap-summary-item">
              <span className="dot" style={{ background: '#FF6B35' }} />
              <span>여름방학: {form.summerVacationStart} ~ {form.sem2Start ? dayBefore(form.sem2Start) : '미설정'}</span>
            </div>
            <div className="ap-summary-item">
              <span className="dot" style={{ background: '#2ED573' }} />
              <span>2학기: {form.sem2Start} ~ {form.winterVacationStart ? dayBefore(form.winterVacationStart) : '미설정'}</span>
            </div>
            <div className="ap-summary-item">
              <span className="dot" style={{ background: '#74B9FF' }} />
              <span>겨울방학: {form.winterVacationStart} ~ {winterVacationEndYear(form.winterVacationStart, form.year)}년 2월 말일</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function dayBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// 겨울방학 종료 연도: 시작일이 다음 해(1~2월)면 그 해, 당해(12월)면 +1년
function winterVacationEndYear(winterStart, schoolYear) {
  if (!winterStart) return schoolYear;
  const month = new Date(winterStart).getMonth() + 1; // 1~12
  // 12월에 시작하면 다음 해 2월까지 → schoolYear + 1
  // 1~2월에 시작하면 그 해 2월까지 → winterStart의 연도
  if (month === 12) return Number(schoolYear) + 1;
  return new Date(winterStart).getFullYear();
}

/* ══════════════════════════════════════════════════════
   2. 행사일 · 공휴일
══════════════════════════════════════════════════════ */
function MenuEvents() {
  const [events, setEvents] = useState([]);
  const [editItem, setEditItem] = useState(null); // null or item (new: id=0)
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getEvents().then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (form.id) await updateEvent(form.id, form);
    else await createEvent(form);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteEvent(id);
    load();
  };

  const TYPE_LABEL = { holiday: '공휴일', event: '행사일', vacation: '방학' };
  const TYPE_COLOR = { holiday: '#FF4757', event: '#3D5AFE', vacation: '#74B9FF' };

  return (
    <div className="ap-menu-content">
      <SectionTitle icon="📌" title="행사일 · 공휴일" desc="행사일, 공휴일, 방학을 등록합니다. 캘린더에 표시됩니다." />
      <div className="ap-card">
        <div className="ap-toolbar">
          <Btn onClick={() => setEditItem({ id: 0, name: '', startDate: '', endDate: '', type: 'event', color: '#3D5AFE', isNoSchool: false })}>
            + 추가
          </Btn>
        </div>
        {loading ? <div className="ap-loading">불러오는 중...</div> : (
          <div className="ap-list">
            {events.length === 0 && <div className="ap-empty">등록된 항목이 없습니다.</div>}
            {events.map(ev => (
              <div key={ev.id} className="ap-list-item">
                <span className="ap-tag" style={{ background: TYPE_COLOR[ev.type] + '22', color: TYPE_COLOR[ev.type], border: `1px solid ${TYPE_COLOR[ev.type]}44` }}>
                  {TYPE_LABEL[ev.type] || ev.type}
                </span>
                <span className="ap-list-name">{ev.name}</span>
                <span className="ap-list-date">{ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` ~ ${ev.endDate}` : ''}</span>
                {ev.isNoSchool && <span className="ap-tag" style={{ background: '#fff0f1', color: '#FF4757', border: '1px solid #ffd0d3' }}>등교없음</span>}
                <div className="ap-list-actions">
                  <Btn small variant="ghost" onClick={() => setEditItem({ ...ev })}>수정</Btn>
                  <Btn small variant="danger" onClick={() => handleDelete(ev.id)}>삭제</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editItem && <EventEditModal item={editItem} onSave={handleSave} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function EventEditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box ap-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-class">{form.id ? '행사 수정' : '행사 추가'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>종류
            <select className="ap-select" value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="event">행사일</option>
              <option value="holiday">공휴일</option>
              <option value="vacation">방학</option>
            </select>
          </label>
          <label>이름
            <input className="ap-input-modal" value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 운동회, 개천절, 여름방학" />
          </label>
          <label>시작일
            <input type="date" className="ap-input-modal" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </label>
          <label>종료일 <span style={{ fontWeight: 400, opacity: 0.6 }}>(하루면 비워도 됨)</span>
            <input type="date" className="ap-input-modal" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} />
          </label>
          <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.isNoSchool} onChange={e => set('isNoSchool', e.target.checked)} />
            등교 없는 날
          </label>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   3. 학반 정보
══════════════════════════════════════════════════════ */
function MenuClasses() {
  const [classes, setClasses] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getClasses().then(setClasses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (form.id) await updateClass(form.id, form);
    else await createClass(form);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteClass(id);
    load();
  };

  return (
    <div className="ap-menu-content">
      <SectionTitle icon="🏫" title="학반 정보" desc="담임반과 전담교사 정보를 관리합니다." />
      <div className="ap-card">
        <div className="ap-toolbar">
          <Btn onClick={() => setEditItem({ id: 0, className: '', teacherName: '', isSpecial: false, sortOrder: 0 })}>+ 추가</Btn>
        </div>
        {loading ? <div className="ap-loading">불러오는 중...</div> : (
          <div className="ap-list">
            {classes.length === 0 && <div className="ap-empty">등록된 학반이 없습니다.</div>}
            {classes.map(cls => (
              <div key={cls.id} className="ap-list-item">
                {cls.isSpecial
                  ? <span className="ap-tag" style={{ background: '#f0f4ff', color: '#3D5AFE', border: '1px solid #c5d0ff' }}>전담</span>
                  : <span className="ap-tag" style={{ background: '#f0fdf4', color: '#22c55e', border: '1px solid #bbf7d0' }}>담임</span>
                }
                <span className="ap-list-name">{cls.className}</span>
                <span className="ap-list-date">{cls.teacherName || '교사 미지정'}</span>
                <div className="ap-list-actions">
                  <Btn small variant="ghost" onClick={() => setEditItem({ ...cls })}>수정</Btn>
                  <Btn small variant="danger" onClick={() => handleDelete(cls.id)}>삭제</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editItem && <ClassEditModal item={editItem} onSave={handleSave} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function ClassEditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-class">{form.id ? '학반 수정' : '학반 추가'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>반 이름
            <input className="ap-input-modal" value={form.className} onChange={e => set('className', e.target.value)} placeholder="예: 4-1, 전담1" />
          </label>
          <label>담당 교사
            <input className="ap-input-modal" value={form.teacherName || ''} onChange={e => set('teacherName', e.target.value)} placeholder="예: 김선생" />
          </label>
          <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.isSpecial} onChange={e => set('isSpecial', e.target.checked)} />
            전담 교사 반
          </label>
          <label>정렬 순서
            <input type="number" className="ap-input-modal" value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} />
          </label>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   4. 과목 정보
══════════════════════════════════════════════════════ */
function MenuSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getSubjects().then(setSubjects).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (form.id) await updateSubject(form.id, form);
    else await createSubject(form);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteSubject(id);
    load();
  };

  return (
    <div className="ap-menu-content">
      <SectionTitle icon="📚" title="과목 정보" desc="시간표에 사용할 과목 목록을 관리합니다." />
      <div className="ap-card">
        <div className="ap-toolbar">
          <Btn onClick={() => setEditItem({ id: 0, name: '', abbr: '', color: '', sortOrder: subjects.length + 1 })}>+ 추가</Btn>
        </div>
        {loading ? <div className="ap-loading">불러오는 중...</div> : (
          <div className="ap-subjects-grid">
            {subjects.length === 0 && <div className="ap-empty">등록된 과목이 없습니다.</div>}
            {subjects.map(sub => (
              <div key={sub.id} className="ap-subject-chip">
                <span className="ap-subject-abbr"
                  style={{ background: sub.color || '#E2E6F0', color: sub.color ? '#fff' : '#1A1D2E' }}>
                  {sub.abbr || sub.name[0]}
                </span>
                <span className="ap-subject-name">{sub.name}</span>
                <div className="ap-subject-actions">
                  <button className="ap-icon-btn" onClick={() => setEditItem({ ...sub })}>✏️</button>
                  <button className="ap-icon-btn danger" onClick={() => handleDelete(sub.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editItem && <SubjectEditModal item={editItem} onSave={handleSave} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function SubjectEditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-class">{form.id ? '과목 수정' : '과목 추가'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>과목명
            <input className="ap-input-modal" value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 국어" />
          </label>
          <label>약어 <span style={{ fontWeight: 400, opacity: 0.6 }}>(시간표에 표시될 글자, 1~2자)</span>
            <input className="ap-input-modal" value={form.abbr || ''} onChange={e => set('abbr', e.target.value)} placeholder="예: 국" maxLength={2} />
          </label>
          <label>색상 <span style={{ fontWeight: 400, opacity: 0.6 }}>(비워두면 기본값)</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.color || '#cccccc'} onChange={e => set('color', e.target.value)} style={{ width: 44, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
              <input className="ap-input-modal" value={form.color || ''} onChange={e => set('color', e.target.value)} placeholder="#3D5AFE" style={{ flex: 1 }} />
            </div>
          </label>
          <label>정렬 순서
            <input type="number" className="ap-input-modal" value={form.sortOrder} onChange={e => set('sortOrder', +e.target.value)} />
          </label>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={() => onSave(form)}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   5. 학반별 기초시간표
══════════════════════════════════════════════════════ */
function MenuBaseTimetable() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [grid, setGrid] = useState({}); // key: "day-period" → entry
  const [applyRange, setApplyRange] = useState({ from: '', to: '' });
  const [applyStatus, setApplyStatus] = useState('');
  const [editCell, setEditCell] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getClasses(), getSubjects()]).then(([cls, sub]) => {
      setClasses(cls);
      setSubjects(sub);
      if (cls.length) setSelectedClass(cls[0].className);
    });
  }, []);

  const loadGrid = useCallback(async (className) => {
    if (!className) return;
    setLoading(true);
    try {
      const entries = await getBaseTimetable(className);
      const map = {};
      entries.forEach(e => { map[`${e.dayOfWeek || e.day_of_week}-${e.period}`] = e; });
      setGrid(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedClass) loadGrid(selectedClass); }, [selectedClass, loadGrid]);

  const handleCellSave = async (form) => {
    await saveBaseEntry({
      className: selectedClass,
      dayOfWeek: form.day,
      period: form.period,
      subject: form.subject,
      teacherName: form.teacherName,
      isSpecialTeacher: form.isSpecialTeacher,
    });
    await loadGrid(selectedClass);
    setEditCell(null);
  };

  const handleCellDelete = async (entry) => {
    if (!entry?.id) { setEditCell(null); return; }
    await deleteBaseEntry(entry.id);
    await loadGrid(selectedClass);
    setEditCell(null);
  };

  const handleApply = async () => {
    if (!applyRange.from || !applyRange.to) { setApplyStatus('날짜를 모두 선택하세요.'); return; }
    setApplyStatus('반영 중...');
    try {
      const result = await applyBaseTimetable([selectedClass], applyRange.from, applyRange.to);
      setApplyStatus(`✓ ${result.applied}개 항목이 반영되었습니다.`);
    } catch {
      setApplyStatus('오류가 발생했습니다.');
    }
  };

  return (
    <div className="ap-menu-content">
      <SectionTitle icon="📋" title="학반별 기초시간표" desc="반을 선택해 기초시간표를 입력하고, 날짜 범위를 지정해 캘린더에 반영합니다." />

      {/* 반 선택 */}
      <div className="ap-card">
        <div className="ap-class-tabs">
          {classes.map(cls => (
            <button
              key={cls.id}
              className={`ap-class-tab ${selectedClass === cls.className ? 'active' : ''}`}
              onClick={() => setSelectedClass(cls.className)}
            >
              {cls.className}
            </button>
          ))}
        </div>
      </div>

      {/* 시간표 그리드 */}
      {selectedClass && (
        <div className="ap-card ap-card-overflow">
          <div className="ap-card-header">
            <span className="ap-card-title">📌 {selectedClass} 기초시간표</span>
            <span className="ap-hint-small">셀 클릭 → 편집</span>
          </div>
          {loading ? <div className="ap-loading">불러오는 중...</div> : (
            <table className="ap-grid-table">
              <thead>
                <tr>
                  <th className="ap-th-period">교시</th>
                  {DAYS.map(d => <th key={d} className="ap-th-day">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td className="ap-td-period">{period}</td>
                    {DAYS.map((_, dayIdx) => {
                      const entry = grid[`${dayIdx}-${period}`];
                      return (
                        <td
                          key={dayIdx}
                          className="ap-td-cell"
                          onClick={() => setEditCell({ day: dayIdx, period, entry: entry || null })}
                        >
                          {entry ? (
                            <div className="ap-cell-filled">
                              <span className="ap-cell-subject">{entry.subject || entry.abbr || ''}</span>
                              {(entry.teacherName || entry.teacher_name) &&
                                <span className="ap-cell-teacher">{entry.teacherName || entry.teacher_name}</span>}
                            </div>
                          ) : (
                            <div className="ap-cell-empty">+</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 캘린더 반영 */}
      {selectedClass && (
        <div className="ap-card">
          <div className="ap-card-header">
            <span className="ap-card-title">📅 캘린더 반영</span>
          </div>
          <p className="ap-desc">기초시간표를 저장한 뒤, 적용할 날짜 범위를 지정하고 반영하세요.</p>
          <div className="ap-apply-row">
            <input type="date" className="ap-input" value={applyRange.from}
              onChange={e => setApplyRange(r => ({ ...r, from: e.target.value }))} />
            <span className="ap-tilde">~</span>
            <input type="date" className="ap-input" value={applyRange.to}
              onChange={e => setApplyRange(r => ({ ...r, to: e.target.value }))} />
            <Btn onClick={handleApply}>반영</Btn>
          </div>
          {applyStatus && <p className="ap-apply-status">{applyStatus}</p>}
        </div>
      )}

      {/* 편집 모달 */}
      {editCell && (
        <BaseCellEditModal
          cell={editCell}
          subjects={subjects}
          className={selectedClass}
          defaultTeacher={classes.find(c => c.className === selectedClass)?.teacherName || ''}
          onSave={handleCellSave}
          onDelete={handleCellDelete}
          onClose={() => setEditCell(null)}
        />
      )}
    </div>
  );
}

function BaseCellEditModal({ cell, subjects, className, defaultTeacher, onSave, onDelete, onClose }) {
  const [selectVal, setSelectVal] = useState(() => {
    // 기존 값이 subjects 목록에 있으면 그걸로, 없으면 '__custom__'
    const existing = cell.entry?.subject || '';
    if (!existing) return '';
    const inList = subjects.some(s => s.name === existing);
    return inList ? existing : '__custom__';
  });
  const [customSubject, setCustomSubject] = useState(() => {
    const existing = cell.entry?.subject || '';
    const inList = subjects.some(s => s.name === existing);
    return inList ? '' : existing;
  });
  // 담임 교사 기본값: 기존 입력값 → 담임 이름
  const [teacherName, setTeacherName] = useState(
    cell.entry?.teacherName || cell.entry?.teacher_name || defaultTeacher || ''
  );
  const [isSpecialTeacher, setIsSpecialTeacher] = useState(
    cell.entry?.isSpecialTeacher || cell.entry?.is_special_teacher || false
  );

  // 실제 저장할 과목명
  const resolvedSubject = selectVal === '__custom__' ? customSubject : selectVal;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-class">{className}</span>
          <span className="modal-slot">{DAYS[cell.day]}요일 {cell.period}교시</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>과목
            <select className="ap-select" value={selectVal} onChange={e => setSelectVal(e.target.value)}>
              <option value="">-- 선택 --</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              <option value="__custom__">직접 입력</option>
            </select>
          </label>
          {selectVal === '__custom__' && (
            <label>직접 입력
              <input
                className="ap-input-modal"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                placeholder="과목명 입력"
                autoFocus
              />
            </label>
          )}
          <label>담당 교사
            <input
              className="ap-input-modal"
              value={teacherName}
              onChange={e => setTeacherName(e.target.value)}
              placeholder={defaultTeacher ? `기본값: ${defaultTeacher}` : '교사 이름'}
            />
          </label>
          <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isSpecialTeacher} onChange={e => setIsSpecialTeacher(e.target.checked)} />
            전담 교사 시간
          </label>
        </div>
        <div className="modal-footer">
          {cell.entry && <button className="btn-delete" onClick={() => onDelete(cell.entry)}>삭제</button>}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button
            className="btn-save"
            disabled={!resolvedSubject}
            onClick={() => onSave({ day: cell.day, period: cell.period, subject: resolvedSubject, teacherName, isSpecialTeacher })}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   AdminPanel 루트 컴포넌트
══════════════════════════════════════════════════════ */
const MENUS = [
  { id: 'settings', label: '기본정보', icon: '🗓️' },
  { id: 'events',   label: '행사일·공휴일', icon: '📌' },
  { id: 'classes',  label: '학반 정보', icon: '🏫' },
  { id: 'subjects', label: '과목 정보', icon: '📚' },
  { id: 'basetimetable', label: '기초시간표', icon: '📋' },
];

const MENU_COMPONENTS = {
  settings: MenuSettings,
  events: MenuEvents,
  classes: MenuClasses,
  subjects: MenuSubjects,
  basetimetable: MenuBaseTimetable,
};

export default function AdminPanel({ onClose }) {
  const [activeMenu, setActiveMenu] = useState('settings');
  const ActiveComp = MENU_COMPONENTS[activeMenu];

  return (
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-panel" onClick={e => e.stopPropagation()}>
        {/* 사이드바 */}
        <aside className="ap-sidebar">
          <div className="ap-sidebar-header">
            <span className="ap-sidebar-title">⚙️ 관리자 메뉴</span>
          </div>
          <nav className="ap-nav">
            {MENUS.map(m => (
              <button
                key={m.id}
                className={`ap-nav-item ${activeMenu === m.id ? 'active' : ''}`}
                onClick={() => setActiveMenu(m.id)}
              >
                <span className="ap-nav-icon">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="ap-sidebar-footer">
            <Btn variant="ghost" onClick={onClose}>✕ 닫기</Btn>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="ap-main">
          <ActiveComp />
        </main>
      </div>
    </div>
  );
}
