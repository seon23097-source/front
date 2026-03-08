import { useState, useEffect, useCallback } from 'react';
import { deleteNoticeItem } from '../api/noticeApi';

const BASE_URL = process.env.REACT_APP_API_URL || '';

async function apiGetSubmitMap() {
  try {
    const res = await fetch(`${BASE_URL}/api/deadline/submit`);
    if (!res.ok) return null;
    const data = await res.json();
    // 서버 응답이 이미 {itemId: {className: bool}} 형태
    return data;
  } catch { return null; }
}

async function apiToggle(itemId, className) {
  try {
    const res = await fetch(`${BASE_URL}/api/deadline/submit/${itemId}/${encodeURIComponent(className)}`, { method: 'POST' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function apiDeleteItem(id) {
  try { await fetch(`${BASE_URL}/api/deadline/submit/${id}`, { method: 'DELETE' }); } catch {}
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
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

function DetailModal({ item, submitMap, onToggle, onClose, onDelete, adminMode }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const d = daysLeft(item.date);
  const classes = ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9'];
  const submitted = classes.filter(c => submitMap[String(item.id)]?.[c]).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid #3D5AFE' }}>
          <span className="modal-class">📌 제출 현황</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{item.title}</div>
          {item.date && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>마감: {item.date}{d !== null && ` (D${d > 0 ? '-' : '+'}${Math.abs(d)})`}</div>}
          {item.submitPlace && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>제출처: {item.submitPlace}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>제출: {submitted} / {classes.length}반</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {classes.map(cls => (
              <label key={cls} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '6px 4px', borderRadius: 6,
                background: submitMap[String(item.id)]?.[cls] ? 'rgba(61,90,254,0.12)' : 'var(--surface2)',
                border: `1.5px solid ${submitMap[String(item.id)]?.[cls] ? '#3D5AFE' : 'var(--border)'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                <span>{cls}</span>
                <input type="checkbox" checked={!!submitMap[String(item.id)]?.[cls]}
                  onChange={() => onToggle(item.id, cls)} style={{ cursor: 'pointer' }} />
              </label>
            ))}
          </div>
          {item.fileNames?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {item.fileNames.map((n, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--surface2)', borderRadius: 4, marginBottom: 3 }}>📎 {n}</div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {adminMode && <button className="btn-delete" onClick={() => setConfirmDelete(true)}>🗑️ 삭제</button>}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
        {confirmDelete && (
          <ConfirmModal message={`"${item.title}" 항목을 삭제할까요?`}
            onConfirm={() => { onDelete(item.id); onClose(); }}
            onCancel={() => setConfirmDelete(false)} />
        )}
      </div>
    </div>
  );
}

// noticeItems: App에서 내려주는 props
export default function DeadlineBoard({ adminMode, noticeItems = [], onReload }) {
  const [submitMap, setSubmitMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [loadingMap, setLoadingMap] = useState(true);

  // submit map은 여기서 직접 로드 (notice items는 props로 받음)
  const loadSubmitMap = useCallback(async (isInitial = false) => {
    const map = await apiGetSubmitMap();
    if (map !== null) {
      setSubmitMap(map);
    }
    if (isInitial) setLoadingMap(false);
  }, []);

  useEffect(() => {
    loadSubmitMap(true);  // 초기 로드
    const interval = setInterval(() => loadSubmitMap(false), 10000);  // 10초마다 폴링
    return () => clearInterval(interval);
  }, [loadSubmitMap]);

  const deadlines = [...noticeItems.filter(i => {
    if (i.type !== 'deadline') return false;
    const d = daysLeft(i.date);
    return d === null || d >= 0; // 날짜 없거나 오늘 이후만 표시
  })].sort((a, b) => {
    const ra = (d => d === null ? 9999 : d)(daysLeft(a.date));
    const rb = (d => d === null ? 9999 : d)(daysLeft(b.date));
    return ra - rb;
  });

  const handleToggle = async (itemId, cls) => {
    const key = String(itemId);
    const next = !submitMap[key]?.[cls];
    // 1. 낙관적 업데이트
    setSubmitMap(prev => ({
      ...prev, [key]: { ...(prev[key] || {}), [cls]: next }
    }));
    // 2. 서버 전송 후 결과로 정확히 동기화
    const result = await apiToggle(itemId, cls);
    if (result !== null) {
      setSubmitMap(prev => ({
        ...prev, [key]: { ...(prev[key] || {}), [cls]: result.submitted }
      }));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNoticeItem(id);
      await apiDeleteItem(id);
      if (onReload) await onReload();
    } catch(e) { console.error(e); }
  };

  if (loadingMap) return (
    <div className="board-panel">
      <div className="board-header"><span className="board-title">📌 제출 마감</span></div>
      <div className="board-empty"><span>⏳</span><span>불러오는 중...</span></div>
    </div>
  );

  return (
    <>
      <div className="board-panel">
        <div className="board-header">
          <span className="board-title">📌 제출 마감</span>
        </div>
        <div className="board-body">
          {deadlines.length === 0 ? (
            <div className="board-empty"><span>📭</span><span>등록된 제출마감이 없습니다.</span></div>
          ) : deadlines.map(item => {
            const d = daysLeft(item.date);
            const classes = ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9'];
            const submitted = classes.filter(c => submitMap[String(item.id)]?.[c]).length;
            const dBadge = d === null ? '' : d === 0 ? 'D-Day' : d > 0 ? `D-${d}` : `D+${-d}`;
            const badgeColor = d === null ? '#888' : d === 0 ? '#e53935' : d > 0 && d <= 3 ? '#FF6B35' : d > 0 ? '#3D5AFE' : '#888';
            return (
              <div key={item.id} className="deadline-card">
                <div className="deadline-card-header" onClick={() => setSelected(item)}>
                  <span className="deadline-card-title">{item.title}</span>
                  <span className="deadline-card-progress" style={{ color: 'var(--text-muted)' }}>{submitted}/{classes.length}</span>
                  {dBadge && (
                    <span className="deadline-card-badge" style={{ background: badgeColor, color: '#fff' }}>
                      {dBadge}
                    </span>
                  )}
                </div>
                <div className="deadline-card-table-wrap">
                  <table className="deadline-cls-table">
                    <thead>
                      <tr>{classes.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      <tr>{classes.map(c => (
                        <td key={c}>
                          <label className={`deadline-cls-check${submitMap[String(item.id)]?.[c] ? ' done' : ''}`}>
                            <input type="checkbox"
                              checked={!!submitMap[String(item.id)]?.[c]}
                              onChange={e => { e.stopPropagation(); handleToggle(item.id, c); }}
                              onClick={e => e.stopPropagation()} />
                          </label>
                        </td>
                      ))}</tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <DetailModal item={selected} submitMap={submitMap}
          onToggle={handleToggle} onClose={() => setSelected(null)}
          onDelete={handleDelete} adminMode={adminMode} />
      )}
    </>
  );
}
