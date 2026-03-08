import { useState } from 'react';

const SAMPLE = [
  { id: 1, title: '3월 학교 행사 안내', date: '2026-03-05', category: '안내장' },
  { id: 2, title: '학부모 상담 주간 공지', date: '2026-03-06', category: '공지' },
  { id: 3, title: '급식 식단표 3월', date: '2026-03-07', category: '안내장' },
];

export default function NoticeBoard({ adminMode }) {
  const [items, setItems] = useState(SAMPLE);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', category: '공지' });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    setItems(prev => [...prev, { id: Date.now(), title: form.title, date: today, category: form.category }]);
    setForm({ title: '', category: '공지' });
    setAdding(false);
  };

  const handleDelete = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const catColor = { '공지': '#3D5AFE', '안내장': '#FF6B35' };

  return (
    <div className="board-panel">
      <div className="board-header">
        <span className="board-title">📢 공지 · 안내장</span>
        {adminMode && (
          <button className="board-add-btn" onClick={() => setAdding(v => !v)} title="항목 추가">＋</button>
        )}
      </div>

      {adding && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#fafbff', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select
            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit' }}
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <option>공지</option>
            <option>안내장</option>
          </select>
          <input
            style={{ flex: 1, minWidth: 80, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit' }}
            placeholder="제목"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>저장</button>
        </div>
      )}

      <div className="board-body">
        {items.length === 0 ? (
          <div className="board-empty"><span>📭</span>공지 사항이 없습니다.</div>
        ) : (
          items.map(item => {
            const color = catColor[item.category] || '#888';
            return (
              <div key={item.id} className="board-item">
                <div className="board-item-dot" style={{ background: color }} />
                <div className="board-item-content">
                  <div className="board-item-title">{item.title}</div>
                  <div className="board-item-meta">{item.date}</div>
                </div>
                <span className="board-item-badge" style={{ background: color + '18', color }}>
                  {item.category}
                </span>
                {adminMode && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc', padding: '0 2px' }}
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
