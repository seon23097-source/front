import { useState, useEffect } from 'react';
import { loadNoticeItems, saveNoticeItems } from './Timetable';

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

export default function DeadlineBoard({ adminMode }) {
  const [items, setItems] = useState([]);

  const loadItems = () => {
    const all = loadNoticeItems();
    // type === 'deadline' 만 필터, createdAt 내림차순(최신 상단)
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
              <div key={item.id} className="board-item">
                <div className="board-item-dot" style={{ background: color }} />
                <div className="board-item-content">
                  <div className="board-item-title">{item.title}</div>
                  <div className="board-item-meta">마감: {item.date}</div>
                </div>
                <span className="board-item-badge" style={{ background: color + '22', color }}>{label}</span>
                {adminMode && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc', padding: '0 2px', lineHeight: 1 }}
                    title="삭제"
                  >✕</button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
