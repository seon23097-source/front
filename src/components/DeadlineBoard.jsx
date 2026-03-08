import { useState, useEffect, useCallback } from 'react';
import { loadNoticeItems, refreshNoticeItems } from './Timetable';
import { deleteNoticeItem } from '../api/noticeApi';

const CLASSES = ['4-1','4-2','4-3','4-4','4-5','4-6','4-7','4-8','4-9'];
const BASE_URL = process.env.REACT_APP_API_URL || '';

async function apiGetSubmitMap() {
  try {
    const res = await fetch(`${BASE_URL}/api/deadline/submit`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return {}; }
}

async function apiToggle(itemId, className) {
  try {
    const res = await fetch(`${BASE_URL}/api/deadline/submit/${itemId}/${encodeURIComponent(className)}`, { method: 'POST' });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return null; }
}

async function apiDeleteItem(itemId) {
  try { await fetch(`${BASE_URL}/api/deadline/submit/${itemId}`, { method: 'DELETE' }); } catch {}
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

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function DetailModal({ item, submitMap, onToggle, onClose, onDelete, adminMode }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const d = daysLeft(item.date);
  const color = d === null ? '#888' : d < 0 ? '#aaa' : d <= 1 ? '#FF4757' : d <= 3 ? '#FFA502' : '#2ED573';
  const label = d === null ? '-' : d < 0 ? '마감' : d === 0 ? 'D-Day' : `D-${d}`;
  const checked = submitMap[item.id] || {};
  const doneCount = CLASSES.filter(c => checked[c]).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${color}` }}>
          <span className="modal-class">📌 제출마감</span>
          <span className="modal-slot">
            <span style={{ background: color+'22', color, fontWeight: 700, fontSize: 11, padding: '2px 7px', borderRadius: 8 }}>{label}</span>
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>마감일: {item.date}</div>
          {item.submitPlace && (
            <div style={{ fontSize: 13, color: 'var(--text)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 8 }}>
              📍 제출할 곳: <strong>{item.submitPlace}</strong>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              제출 현황 {doneCount}/{CLASSES.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {CLASSES.map(cls => (
                <label key={cls} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '6px 4px', borderRadius: 7, cursor: 'pointer',
                  background: checked[cls] ? '#e8f5e9' : 'var(--surface2)',
                  border: `1.5px solid ${checked[cls] ? '#66bb6a' : 'var(--border)'}`,
                  transition: 'all 0.12s',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: checked[cls] ? '#2e7d32' : 'var(--text-muted)' }}>{cls}</span>
                  <input type="checkbox" checked={!!checked[cls]}
                    onChange={() => onToggle(item.id, cls)}
                    style={{ accentColor: '#4caf50', width: 14, height: 14, cursor: 'pointer' }} />
                </label>
              ))}
            </div>
          </div>
          {item.fileNames?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>첨부파일</div>
              {item.fileNames.map((name, i) => (
                <div key={i} style={{ fontSize: 12, padding: '5px 10px', background: 'var(--surface2)', borderRadius: 5, border: '1px solid var(--border)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📎 {name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {adminMode && (
            <button className="btn-delete" onClick={() => setConfirmDelete(true)}>🗑️ 삭제</button>
          )}
          {confirmDelete && (
            <ConfirmModal
              message={`"${item.title}" 항목을 삭제할까요?`}
              onConfirm={() => { onDelete(item.id); onClose(); }}
              onCancel={() => setConfirmDelete(false)}
            />
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

export default function DeadlineBoard({ adminMode }) {
  const [items, setItems] = useState([]);
  const [submitMap, setSubmitMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const all = await refreshNoticeItems();
    const deadlines = (all || loadNoticeItems()).filter(i => i.type === 'deadline');
    deadlines.sort((a, b) => {
      const da = daysLeft(a.date);
      const db = daysLeft(b.date);
      const ra = da === null ? 9999 : da < 0 ? 9998 + (-da) : da;
      const rb = db === null ? 9999 : db < 0 ? 9998 + (-db) : db;
      return ra - rb;
    });
    setItems(deadlines);
    const map = await apiGetSubmitMap();
    setSubmitMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    window.addEventListener('noticeItemsChanged', loadAll);
    return () => window.removeEventListener('noticeItemsChanged', loadAll);
  }, [loadAll]);

  // 30초마다 서버 현황 갱신 (다른 기기 변경 반영)
  useEffect(() => {
    const interval = setInterval(async () => {
      const map = await apiGetSubmitMap();
      setSubmitMap(map);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (itemId, cls) => {
    // 낙관적 업데이트 (즉각 UI 반응)
    setSubmitMap(prev => {
      const cur = prev[itemId] || {};
      return { ...prev, [itemId]: { ...cur, [cls]: !cur[cls] } };
    });
    // 서버 반영 후 최종 동기화
    const result = await apiToggle(itemId, cls);
    if (result) {
      setSubmitMap(prev => {
        const cur = prev[itemId] || {};
        return { ...prev, [itemId]: { ...cur, [cls]: result.submitted } };
      });
    }
  };

  const handleDelete = async (id) => {
    await deleteNoticeItem(id);
    await apiDeleteItem(id); // 제출 체크 데이터도 정리
    await loadAll();
  };

  if (loading) return (
    <div className="board-panel">
      <div className="board-header"><span className="board-title">📌 제출 마감</span></div>
      <div className="board-empty"><span style={{ fontSize: 20 }}>⏳</span><span>불러오는 중...</span></div>
    </div>
  );

  return (
    <>
      <div className="board-panel">
        <div className="board-header">
          <span className="board-title">📌 제출 마감</span>
        </div>
        <div className="board-body">
          {items.length === 0 ? (
            <div className="board-empty">
              <span>📭</span>
              <span>시간표에서 제출마감을 등록하세요.</span>
            </div>
          ) : (
            items.map(item => {
              const d = daysLeft(item.date);
              const color = d === null ? '#888' : d < 0 ? '#aaa' : d <= 1 ? '#FF4757' : d <= 3 ? '#FFA502' : '#2ED573';
              const label = d === null ? '-' : d < 0 ? '마감' : d === 0 ? 'D-Day' : `D-${d}`;
              const checked = submitMap[item.id] || {};
              const doneCount = CLASSES.filter(c => checked[c]).length;
              const allDone = doneCount === CLASSES.length;

              return (
                <div key={item.id} className="deadline-card">
                  {/* 카드 헤더: 클릭 시 상세 모달 */}
                  <div className="deadline-card-header" onClick={() => setSelected(item)}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="deadline-card-title">{item.title}</div>
                      <div className="deadline-card-meta">
                        마감: {item.date}{item.submitPlace && <> · {item.submitPlace}</>}
                        {item.fileNames?.length > 0 && <> · 📎 {item.fileNames.length}개</>}
                      </div>
                    </div>
                    <span className="deadline-card-badge" style={{ background: color+'22', color }}>{label}</span>
                    <span className="deadline-card-progress" style={{ color: allDone ? '#4caf50' : 'var(--text-muted)' }}>
                      {doneCount}/{CLASSES.length}
                    </span>
                  </div>

                  {/* 체크 테이블 */}
                  <div className="deadline-card-table-wrap" onClick={e => e.stopPropagation()}>
                    <table className="deadline-cls-table">
                      <thead>
                        <tr>
                          {CLASSES.map(cls => <th key={cls}>{cls}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {CLASSES.map(cls => (
                            <td key={cls}>
                              <label
                                className={`deadline-cls-check${checked[cls] ? ' done' : ''}`}
                                title={`${cls} 제출 ${checked[cls] ? '완료 ✓' : '미완료'}`}
                              >
                                <input type="checkbox" checked={!!checked[cls]}
                                  onChange={() => handleToggle(item.id, cls)} />
                              </label>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && (
        <DetailModal
          item={selected}
          submitMap={submitMap}
          onToggle={handleToggle}
          adminMode={adminMode}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
