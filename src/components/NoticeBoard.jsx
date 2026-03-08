import { useState, useEffect } from 'react';
import { loadNoticeItems, saveNoticeItems } from './Timetable';

const NOTICES_KEY = 'schosche_board_notices';

function loadBoardNotices() {
  try { return JSON.parse(localStorage.getItem(NOTICES_KEY) || '[]'); }
  catch { return []; }
}
function saveBoardNotices(items) {
  localStorage.setItem(NOTICES_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('boardNoticesChanged'));
}

function AddNoticeModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('notice'); // 'notice' | 'announcement'
  const [pinned, setPinned] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getMonth() + 1}월${d.getDate()}일`;
  });

  const handleSave = () => {
    if (!title.trim()) return;
    const notices = loadBoardNotices();
    const display = type === 'announcement'
      ? `[${month} 배부] ${title.trim()}`
      : `[공지] ${title.trim()}`;
    const newItem = {
      id: Date.now(),
      type,
      title: title.trim(),
      display,
      pinned: type === 'notice' ? pinned : false,
      createdAt: Date.now(),
    };
    saveBoardNotices([newItem, ...notices]);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid #3D5AFE' }}>
          <span className="modal-class">공지/안내장 등록</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>
            종류
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => setType('notice')}
                style={{
                  flex: 1, padding: '7px', borderRadius: 6, border: '1.5px solid',
                  borderColor: type === 'notice' ? 'var(--accent)' : 'var(--border)',
                  background: type === 'notice' ? 'var(--accent-light)' : 'var(--surface)',
                  color: type === 'notice' ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}
              >📢 공지</button>
              <button
                onClick={() => setType('announcement')}
                style={{
                  flex: 1, padding: '7px', borderRadius: 6, border: '1.5px solid',
                  borderColor: type === 'announcement' ? '#FF6B35' : 'var(--border)',
                  background: type === 'announcement' ? '#fff3ee' : 'var(--surface)',
                  color: type === 'announcement' ? '#FF6B35' : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}
              >📄 안내장</button>
            </div>
          </label>

          {type === 'announcement' && (
            <label>
              배부일
              <input
                type="text"
                value={month}
                onChange={e => setMonth(e.target.value)}
                placeholder="예: 3월8일"
                style={{ width: '100%' }}
              />
            </label>
          )}

          <label>
            제목
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={type === 'notice' ? '공지 제목' : '안내장 제목'}
              autoFocus
              style={{ width: '100%' }}
            />
          </label>

          {type === 'notice' && (
            <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
              />
              상단 고정
            </label>
          )}
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

export default function NoticeBoard({ adminMode }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const loadItems = () => {
    const notices = loadBoardNotices();
    // 안내장(type==='announcement')도 추가: Timetable에서 등록한 것
    const timetableNotices = loadNoticeItems()
      .filter(i => i.type === 'notice')
      .map(i => ({
        id: 'tt_' + i.id,
        type: 'announcement',
        display: `[${i.displayDate} 배부] ${i.title}`,
        pinned: false,
        createdAt: i.createdAt,
      }));

    const all = [...notices, ...timetableNotices];
    // 상단고정 우선, 그 다음 최신순
    all.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    setItems(all);
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('boardNoticesChanged', loadItems);
    window.addEventListener('noticeItemsChanged', loadItems);
    return () => {
      window.removeEventListener('boardNoticesChanged', loadItems);
      window.removeEventListener('noticeItemsChanged', loadItems);
    };
  }, []);

  const handleDelete = (id) => {
    if (String(id).startsWith('tt_')) return; // 시간표 항목은 시간표에서 삭제
    const notices = loadBoardNotices();
    saveBoardNotices(notices.filter(i => i.id !== id));
  };

  const catColor = { notice: '#3D5AFE', announcement: '#FF6B35' };

  return (
    <>
      <div className="board-panel">
        <div className="board-header">
          <span className="board-title">📢 공지 · 안내장</span>
          {adminMode && (
            <button className="board-add-btn" onClick={() => setShowModal(true)} title="공지/안내장 등록">＋</button>
          )}
        </div>
        <div className="board-body">
          {items.length === 0 ? (
            <div className="board-empty">
              <span>📭</span>
              <span>등록된 공지가 없습니다.</span>
            </div>
          ) : (
            items.map(item => {
              const color = item.type === 'notice' ? catColor.notice : catColor.announcement;
              return (
                <div key={item.id} className="board-item">
                  {item.pinned && <span style={{ fontSize: 10, marginRight: 2 }}>📍</span>}
                  <div className="board-item-dot" style={{ background: color }} />
                  <div className="board-item-content">
                    <div className="board-item-title">{item.display}</div>
                  </div>
                  {adminMode && !String(item.id).startsWith('tt_') && (
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

      {showModal && <AddNoticeModal onClose={() => setShowModal(false)} />}
    </>
  );
}
