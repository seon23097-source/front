import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchEvents, fetchColors } from '../api/timetable';
import { getClasses } from '../api/admin';
import { getThisMonday, getWeekDates, toLocalDateStr } from './Timetable';

const DAYS    = ['월', '화', '수', '목', '금'];
const PERIODS = [1, 2, 3, 4, 5, 6];

// ── localStorage 키 ───────────────────────────────────
const KITS_KEY    = 'schosche_sci_kits';       // 꾸러미 목록
const PLACED_KEY  = 'schosche_sci_placed';     // 배치 상태 { "dayIdx-period": kitId[] }

function loadKits()    { try { return JSON.parse(localStorage.getItem(KITS_KEY)   || '[]'); } catch { return []; } }
function saveKits(v)   { localStorage.setItem(KITS_KEY,   JSON.stringify(v)); }
function loadPlaced()  { try { return JSON.parse(localStorage.getItem(PLACED_KEY) || '{}'); } catch { return {}; } }
function savePlaced(v) { localStorage.setItem(PLACED_KEY, JSON.stringify(v)); }

// ── 꾸러미 등록 모달 ──────────────────────────────────
function AddKitModal({ onClose, onSaved }) {
  const [title,   setTitle]   = useState('');
  const [unit,    setUnit]    = useState('');
  const [lesson,  setLesson]  = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    const kit = {
      id: Date.now(),
      title: title.trim(),
      unit:  unit.trim(),
      lesson: lesson.trim(),
    };
    const updated = [kit, ...loadKits()];
    saveKits(updated);
    onSaved(updated);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid #10b981' }}>
          <span className="modal-class">🧺 꾸러미 등록</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>제목
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="꾸러미 제목" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </label>
          <label>단원
            <input value={unit} onChange={e => setUnit(e.target.value)}
              placeholder="예: 3단원 렌즈의 이용" />
          </label>
          <label>차시
            <input value={lesson} onChange={e => setLesson(e.target.value)}
              placeholder="예: 2차시" />
          </label>
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

// ── 삭제 확인 모달 ────────────────────────────────────
function ConfirmModal({ kit, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="modal-class">꾸러미 삭제</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>
            <strong>"{kit.title}"</strong> 꾸러미를 삭제할까요?<br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>과학실 목록과 배치된 모든 칸에서 제거됩니다.</span>
          </div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onCancel}>취소</button>
          <button className="btn-delete"
            style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            onClick={onConfirm}>🗑️ 삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── 꾸러미 카드 (드래그 가능) ─────────────────────────
function KitCard({ kit, onDragStart, dimmed = false }) {
  return (
    <div
      className={`sci-kit-card${dimmed ? ' sci-kit-dimmed' : ''}`}
      draggable
      onDragStart={e => onDragStart(e, kit.id)}
      title={`드래그하여 시간표에 배치\n단원: ${kit.unit || '-'}\n차시: ${kit.lesson || '-'}`}
    >
      <div className="sci-kit-icon">🧺</div>
      <div className="sci-kit-info">
        <div className="sci-kit-title">{kit.title}</div>
        {kit.unit   && <div className="sci-kit-meta">{kit.unit}</div>}
        {kit.lesson && <div className="sci-kit-meta">{kit.lesson}</div>}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function SciencePanel({ adminMode }) {
  const [kits,     setKits]     = useState(loadKits);
  const [placed,   setPlaced]   = useState(loadPlaced);  // { "dayIdx-period": [kitId, ...] }
  const [weekOffset, setWeekOffset] = useState(0);
  const [events,   setEvents]   = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [confirmKit, setConfirmKit] = useState(null);    // 삭제 확인할 kit
  const [dragOver,  setDragOver]  = useState(null);      // 현재 dragover 중인 셀 키
  const [dragFrom,  setDragFrom]  = useState(null);      // { kitId, fromCell: 'shelf'|'day-period' }

  // 주차 계산
  const currentMonday = (() => {
    const base = getThisMonday();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  })();
  const weekDates = getWeekDates(currentMonday);

  useEffect(() => { fetchEvents().then(setEvents).catch(() => {}); }, []);
  useEffect(() => {
    getClasses()
      .then(data => setClassesList([...data].sort((a, b) =>
        (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0))))
      .catch(() => setClassesList([]));
  }, []);

  // 이벤트 → 날짜 매핑
  const noSchoolSet = new Set();
  events.forEach(ev => {
    if (!ev.isNoSchool) return;
    weekDates.forEach(wd => {
      if (wd.full >= ev.startDate && wd.full <= (ev.endDate || ev.startDate))
        noSchoolSet.add(wd.full);
    });
  });

  const dayEventMap = {};
  events.forEach(ev => {
    weekDates.forEach(wd => {
      if (wd.full >= ev.startDate && wd.full <= (ev.endDate || ev.startDate)) {
        if (!dayEventMap[wd.full]) dayEventMap[wd.full] = [];
        dayEventMap[wd.full].push(ev);
      }
    });
  });

  const weekLabel = weekOffset === 0 ? '이번 주'
    : weekOffset === 1 ? '다음 주'
    : weekOffset === -1 ? '지난 주'
    : `${weekDates[0].month}/${weekDates[0].date}~${weekDates[4].month}/${weekDates[4].date}`;

  // 시간표에 배치된 kitId 집합
  const placedIds = new Set(Object.values(placed).flat());

  // ── 드래그 핸들러 ──────────────────────────────────

  const handleDragStart = (e, kitId, fromCell = 'shelf') => {
    e.dataTransfer.setData('kitId', String(kitId));
    e.dataTransfer.setData('fromCell', fromCell);
    e.dataTransfer.effectAllowed = 'move';
    setDragFrom({ kitId, fromCell });
  };

  const handleDragOver = (e, cellKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(cellKey);
  };

  const handleDragLeave = () => setDragOver(null);

  // 셀에 드롭 (시간표 셀 → 시간표 셀 이동 포함)
  const handleDropCell = (e, cellKey) => {
    e.preventDefault();
    setDragOver(null);
    const kitId  = Number(e.dataTransfer.getData('kitId'));
    const fromCell = e.dataTransfer.getData('fromCell');
    if (!kitId) return;

    setPlaced(prev => {
      const next = { ...prev };
      // 이전 위치에서 제거
      if (fromCell !== 'shelf') {
        next[fromCell] = (next[fromCell] || []).filter(id => id !== kitId);
        if (!next[fromCell].length) delete next[fromCell];
      }
      // 새 위치에 추가 (중복 방지)
      if (!(next[cellKey] || []).includes(kitId)) {
        next[cellKey] = [...(next[cellKey] || []), kitId];
      }
      savePlaced(next);
      return next;
    });
  };

  // 과학실(선반)에 드롭 → 삭제 확인
  const handleDropShelf = (e) => {
    e.preventDefault();
    setDragOver(null);
    const kitId   = Number(e.dataTransfer.getData('kitId'));
    const fromCell = e.dataTransfer.getData('fromCell');
    if (!kitId || fromCell === 'shelf') return; // 선반→선반 이동은 무시

    const kit = kits.find(k => k.id === kitId);
    if (kit) setConfirmKit(kit);
  };

  // 삭제 실행
  const handleDeleteKit = () => {
    if (!confirmKit) return;
    const id = confirmKit.id;
    const updatedKits = kits.filter(k => k.id !== id);
    setKits(updatedKits);
    saveKits(updatedKits);
    setPlaced(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, ids]) => {
        const filtered = ids.filter(i => i !== id);
        if (filtered.length) next[k] = filtered;
      });
      savePlaced(next);
      return next;
    });
    setConfirmKit(null);
  };

  // 상단 패널로 드래그 반환 (시간표 → 상단: 배치 제거만, 삭제 아님)
  const handleDropTopPanel = (e) => {
    e.preventDefault();
    setDragOver(null);
    const kitId   = Number(e.dataTransfer.getData('kitId'));
    const fromCell = e.dataTransfer.getData('fromCell');
    if (!kitId || fromCell === 'shelf') return;
    setPlaced(prev => {
      const next = { ...prev };
      if (fromCell !== 'shelf') {
        next[fromCell] = (next[fromCell] || []).filter(id => id !== kitId);
        if (!next[fromCell].length) delete next[fromCell];
      }
      savePlaced(next);
      return next;
    });
  };

  return (
    <div className="sci-panel">

      {/* ── 상단 2/10 ──────────────────────────────── */}
      <div className="sci-top">

        {/* 상단 왼쪽: 학년연구실 */}
        <div className="sci-top-left"
          onDragOver={e => { e.preventDefault(); setDragOver('top-left'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleDropTopPanel}
        >
          <div className="sci-section-header">
            <span className="sci-section-title">🏫 학년연구실</span>
          </div>
          <div className={`sci-shelf sci-shelf-left${dragOver === 'top-left' ? ' sci-shelf-dragover' : ''}`}>
            {kits.filter(k => !placedIds.has(k.id)).length === 0 && (
              <div className="sci-shelf-empty">모든 꾸러미가 배치되었습니다.</div>
            )}
            {kits.filter(k => !placedIds.has(k.id)).map(kit => (
              <KitCard key={kit.id} kit={kit}
                onDragStart={(e, id) => handleDragStart(e, id, 'shelf')} />
            ))}
          </div>
        </div>

        {/* 상단 오른쪽: 과학실 */}
        <div className="sci-top-right"
          onDragOver={e => { e.preventDefault(); setDragOver('shelf'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleDropShelf}
        >
          <div className="sci-section-header">
            <span className="sci-section-title">🔬 과학실</span>
            {adminMode && (
              <button className="board-add-btn" style={{ fontSize: 20 }}
                onClick={() => setShowAdd(true)}>＋</button>
            )}
          </div>
          <div className={`sci-shelf sci-shelf-right${dragOver === 'shelf' ? ' sci-shelf-dragover sci-shelf-delete-zone' : ''}`}>
            {dragOver === 'shelf' && (
              <div className="sci-delete-hint">🗑️ 여기에 놓으면 삭제됩니다</div>
            )}
            {kits.filter(k => placedIds.has(k.id)).length === 0 && dragOver !== 'shelf' && (
              <div className="sci-shelf-empty">배치된 꾸러미가 없습니다.</div>
            )}
            {kits.filter(k => placedIds.has(k.id)).map(kit => (
              <KitCard key={kit.id} kit={kit} dimmed
                onDragStart={(e, id) => handleDragStart(e, id, 'shelf')} />
            ))}
          </div>
        </div>
      </div>

      {/* ── 하단 8/10: 시간표 틀 ───────────────────── */}
      <div className="sci-bottom">
        <div className="sci-timetable-wrap">

          {/* 주차 네비 + 라벨 */}
          <div className="sci-week-nav">
            <button className="week-nav-arrow" style={{ fontSize: 22, width: 32, minHeight: 28 }}
              onClick={() => setWeekOffset(o => o - 1)}>‹</button>
            <span className="sci-week-label">{weekLabel}</span>
            <button className="week-nav-arrow" style={{ fontSize: 22, width: 32, minHeight: 28 }}
              onClick={() => setWeekOffset(o => o + 1)}>›</button>
          </div>

          <div className="timetable-container" style={{ flex: 1, overflow: 'auto' }}>
            <table className="timetable-grid sci-grid">
              <thead>
                <tr>
                  <th className="th-nav th-nav-prev" style={{ width: 32 }} />
                  {DAYS.map((d, i) => {
                    const dateStr = weekDates[i].full;
                    const dayEvs  = (dayEventMap[dateStr] || []);
                    const noSchool = noSchoolSet.has(dateStr);
                    return (
                      <th key={d} className={`th-day${noSchool ? ' th-day-noschool' : ''}`}>
                        <div className="th-day-headline">
                          <span className="th-day-name">{d}</span>
                          <span className="th-day-date">{weekDates[i].month}/{weekDates[i].date}</span>
                        </div>
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
                  <th className="th-nav th-nav-next" style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td className="td-nav td-nav-left" />
                    {DAYS.map((_, dayIdx) => {
                      const cellKey  = `${dayIdx}-${period}`;
                      const dateStr  = weekDates[dayIdx].full;
                      const noSchool = noSchoolSet.has(dateStr);
                      const cellKitIds = placed[cellKey] || [];
                      const cellKits   = cellKitIds.map(id => kits.find(k => k.id === id)).filter(Boolean);
                      const isOver     = dragOver === cellKey;

                      return (
                        <td key={dayIdx}
                          className={`td-cell sci-td-cell${noSchool ? ' td-cell-noschool' : ''}${isOver ? ' sci-cell-dragover' : ''}`}
                          onDragOver={e => !noSchool && handleDragOver(e, cellKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={e => !noSchool && handleDropCell(e, cellKey)}
                        >
                          <div className="sci-cell-kits">
                            {cellKits.map(kit => (
                              <div key={kit.id}
                                className="sci-placed-kit"
                                draggable
                                onDragStart={e => handleDragStart(e, kit.id, cellKey)}
                                title={`${kit.title}\n단원: ${kit.unit || '-'}\n차시: ${kit.lesson || '-'}`}
                              >
                                <span className="sci-placed-icon">🧺</span>
                                <span className="sci-placed-label">{kit.title}</span>
                              </div>
                            ))}
                            {!noSchool && cellKits.length === 0 && isOver && (
                              <div className="sci-drop-hint">여기에 놓기</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="td-nav td-period-right">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 모달 ───────────────────────────────────── */}
      {showAdd && (
        <AddKitModal
          onClose={() => setShowAdd(false)}
          onSaved={updated => setKits(updated)}
        />
      )}
      {confirmKit && (
        <ConfirmModal
          kit={confirmKit}
          onConfirm={handleDeleteKit}
          onCancel={() => setConfirmKit(null)}
        />
      )}
    </div>
  );
}
