import { useState } from 'react';

const SAMPLE = [
  { id: 1, title: '독서기록장 제출', date: '2026-03-10', urgent: true },
  { id: 2, title: '현장학습 동의서', date: '2026-03-12', urgent: false },
  { id: 3, title: '급식비 납부 확인', date: '2026-03-14', urgent: false },
];

function daysLeft(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

export default function DeadlineBoard({ adminMode }) {
  const [items, setItems] = useState(SAMPLE);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', date: '' });

  const handleAdd = () => {
    if (!form.title.trim() || !form.date) return;
    setItems(prev => [...prev, { id: Date.now(), ...form, urgent: false }]);
    setForm({ title: '', date: '' });
    setAdding(false);
  };

  const handleDelete = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="board-panel">
      <div className="board-header">
        <span className="board-title">📌 제출 마감</span>
        {adminMode && (
          <button className="board-add-btn" onClick={() => setAdding(v => !v)} title="항목 추가">＋</button>
        )}
      </div>

      {adding && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: '#fafbff', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 80, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit' }}
            placeholder="제목"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <input
            type="date"
            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit' }}
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <button onClick={handleAdd} style={{ padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>저장</button>
        </div>
      )}

      <div className="board-body">
        {items.length === 0 ? (
          <div className="board-empty"><span>📭</span>마감 항목이 없습니다.</div>
        ) : (
          items.map(item => {
            const d = daysLeft(item.date);
            const color = d <= 1 ? '#FF4757' : d <= 3 ? '#FFA502' : '#2ED573';
            const label = d < 0 ? '마감' : d === 0 ? 'D-Day' : `D-${d}`;
            return (
              <div key={item.id} className="board-item" style={{ position: 'relative' }}>
                <div className="board-item-dot" style={{ background: color }} />
                <div className="board-item-content">
                  <div className="board-item-title">{item.title}</div>
                  <div className="board-item-meta">{item.date}</div>
                </div>
                <span className="board-item-badge" style={{ background: color + '22', color }}>
                  {label}
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
