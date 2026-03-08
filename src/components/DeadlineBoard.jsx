import { useState, useEffect } from 'react';
import { loadNoticeItems, saveNoticeItems } from './Timetable';

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function DetailModal({ item, onClose, onDelete, adminMode }) {
  const d = daysLeft(item.date);
  const color = d === null ? '#888' : d < 0 ? '#aaa' : d <= 1 ? '#FF4757' : d <= 3 ? '#FFA502' : '#2ED573';
  const label = d === null ? '-' : d < 0 ? '마감' : d === 0 ? 'D-Day' : `D-${d}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${color}` }}>
          <span className="modal-class">📌 제출마감</span>
          <span className="modal-slot">
            <span style={{ background: color + '22', color, fontWeight: 700, fontSize: 11, padding: '2px 7px', borderRadius: 8 }}>{label}</span>
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

          {item.fileNames?.length > 0 && (
            <div style={{ marginTop: 8 }}>
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
            <button className="btn-delete" onClick={() => { onDelete(item.id); onClose(); }}>🗑️ 삭제</button>
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
  const [selected, setSelected] = useState(null);

  const loadItems = () => {
    const all = loadNoticeItems();
    setItems(all.filter(i => i.type === 'deadline').sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('noticeItemsChanged', loadItems);
    return () => window.removeEventListener('noticeItemsChanged', loadItems);
  }, []);

  const handleDelete = (id) => {
    const all = loadNoticeItems();
    saveNoticeItems(all.filter(i => i.id !== id));
  };

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
              return (
                <div
                  key={item.id}
                  className="board-item board-item-clickable"
                  onClick={() => setSelected(item)}
                >
                  <div className="board-item-dot" style={{ background: color }} />
                  <div className="board-item-content">
                    <div className="board-item-title">{item.title}</div>
                    <div className="board-item-meta">
                      마감: {item.date}
                      {item.submitPlace && <> · 제출: {item.submitPlace}</>}
                      {item.fileNames?.length > 0 && <> · 📎 {item.fileNames.length}개</>}
                    </div>
                  </div>
                  <span className="board-item-badge" style={{ background: color + '22', color }}>{label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && (
        <DetailModal
          item={selected}
          adminMode={adminMode}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
