import { useState, useEffect } from 'react';
import { loadNoticeItems, _setItemsCache } from './Timetable';
import { fetchNoticeItems, fetchBoardNotices, createBoardNotice, deleteBoardNotice } from '../api/noticeApi';

// ── 공통 유틸 ──────────────────────────────────────────
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

function FileAttachField({ files, onChange }) {
  return (
    <label>
      첨부파일
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <label style={{
          padding: '5px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          color: 'var(--text-muted)', whiteSpace: 'nowrap',
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

// ── 등록 모달 ──────────────────────────────────────────
function AddNoticeModal({ onClose }) {
  const [title, setTitle]   = useState('');
  const [type, setType]     = useState('notice');
  const [pinned, setPinned] = useState(false);
  const [content, setContent] = useState('');
  const [month, setMonth]   = useState(() => {
    const d = new Date();
    return `${d.getMonth() + 1}월${d.getDate()}일`;
  });
  const [files, setFiles]   = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const display = type === 'announcement'
      ? `[${month} 배부] ${title.trim()}`
      : `[공지] ${title.trim()}`;
    try {
      await createBoardNotice({
        type, title: title.trim(), display,
        content: content.trim(),
        pinned: type === 'notice' ? pinned : false,
        fileNames: files.map(f => f.name),
      });
    } catch(e) { console.error(e); }
    setSaving(false);
    window.dispatchEvent(new Event('noticeItemsChanged'));
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid #3D5AFE' }}>
          <span className="modal-class">공지/안내장 등록</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>
            종류
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setType('notice')} style={{
                flex: 1, padding: '7px', borderRadius: 6, border: '1.5px solid',
                borderColor: type === 'notice' ? 'var(--accent)' : 'var(--border)',
                background: type === 'notice' ? 'var(--accent-light)' : 'var(--surface)',
                color: type === 'notice' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}>📢 공지</button>
              <button onClick={() => setType('announcement')} style={{
                flex: 1, padding: '7px', borderRadius: 6, border: '1.5px solid',
                borderColor: type === 'announcement' ? '#FF6B35' : 'var(--border)',
                background: type === 'announcement' ? 'rgba(255,107,53,0.08)' : 'var(--surface)',
                color: type === 'announcement' ? '#FF6B35' : 'var(--text-muted)',
                fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}>📄 안내장</button>
            </div>
          </label>
          {type === 'announcement' && (
            <label>
              배부일
              <input type="text" value={month} onChange={e => setMonth(e.target.value)}
                placeholder="예: 3월8일" style={{ width: '100%' }} />
            </label>
          )}
          <label>
            제목
            <input type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !content && handleSave()}
              placeholder={type === 'notice' ? '공지 제목' : '안내장 제목'}
              autoFocus style={{ width: '100%' }} />
          </label>
          {type === 'notice' && (
            <label>
              내용
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="공지 내용 (선택사항)" rows={3}
                style={{
                  width: '100%', resize: 'vertical', padding: '8px 10px',
                  border: '1.5px solid var(--border)', borderRadius: 6,
                  fontFamily: 'inherit', fontSize: 13, outline: 'none',
                  background: 'var(--surface)', color: 'var(--text)',
                }} />
            </label>
          )}
          <FileAttachField files={files} onChange={setFiles} />
          {type === 'notice' && (
            <label className="checkbox-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
              상단 고정
            </label>
          )}
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 상세 모달 ──────────────────────────────────────────
function DetailModal({ item, onClose, onDelete, adminMode }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNotice = item.type === 'notice';
  const accentColor = isNotice ? '#3D5AFE' : '#FF6B35';
  const isTimetable = String(item.id).startsWith('tt_');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${accentColor}` }}>
          <span className="modal-class">{isNotice ? '📢 공지' : '📄 안내장'}</span>
          {item.pinned && <span style={{ fontSize: 11, color: accentColor, fontWeight: 700 }}>📍 고정</span>}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            {item.display}
          </div>
          {item.content && (
            <div style={{
              fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
              padding: '10px 12px', background: 'var(--surface2)',
              borderRadius: 6, whiteSpace: 'pre-wrap', marginBottom: 8,
            }}>{item.content}</div>
          )}
          {item.fileNames?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>첨부파일</div>
              {item.fileNames.map((name, i) => (
                <div key={i} style={{
                  fontSize: 12, padding: '5px 10px', background: 'var(--surface2)',
                  borderRadius: 5, border: '1px solid var(--border)', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>📎 {name}</div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {adminMode && !isTimetable && (
            <button className="btn-delete" onClick={() => setConfirmDelete(true)}>🗑️ 삭제</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
        {confirmDelete && (
          <ConfirmModal
            message={`"${item.display}" 항목을 삭제할까요?`}
            onConfirm={() => { onDelete(item.id); onClose(); }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function NoticeBoard({ adminMode }) {
  const [items, setItems]         = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [loading, setLoading]     = useState(true);

  const loadAll = async () => {
    // board notices
    const boardFetched = await fetchBoardNotices();
    const boardNotices = boardFetched ?? [];
    // timetable notice items
    const itemsFetched = await fetchNoticeItems();
    if (itemsFetched) _setItemsCache(itemsFetched);
    const timetableNotices = loadNoticeItems()
      .filter(i => i.type === 'notice')
      .map(i => ({
        id: 'tt_' + i.id,
        type: 'announcement',
        title: i.title,
        display: `[${i.displayDate} 배부] ${i.title}`,
        fileNames: i.fileNames || [],
        pinned: false,
        createdAt: i.createdAt,
      }));

    const all = [...boardNotices, ...timetableNotices];
    all.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    setItems(all);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('noticeItemsChanged', loadAll);
    return () => window.removeEventListener('noticeItemsChanged', loadAll);
  }, []);

  const handleDelete = async (id) => {
    try { await deleteBoardNotice(id); } catch(e) { console.error(e); }
    loadAll();
  };

  const catColor = { notice: '#3D5AFE', announcement: '#FF6B35' };

  return (
    <>
      <div className="board-panel">
        <div className="board-header">
          <span className="board-title">📢 공지 · 안내장</span>
          {adminMode && (
            <button className="board-add-btn" onClick={() => setShowModal(true)}>＋</button>
          )}
        </div>
        <div className="board-body">
          {loading ? (
            <div className="board-empty"><span>⏳</span><span>불러오는 중...</span></div>
          ) : items.length === 0 ? (
            <div className="board-empty"><span>📭</span><span>등록된 공지가 없습니다.</span></div>
          ) : (
            items.map(item => {
              const color = catColor[item.type] || '#888';
              return (
                <div key={item.id} className="board-item board-item-clickable"
                  onClick={() => setSelected(item)}>
                  {item.pinned && <span style={{ fontSize: 10 }}>📍</span>}
                  <div className="board-item-dot" style={{ background: color }} />
                  <div className="board-item-content">
                    <div className="board-item-title">{item.display}</div>
                    {(item.content || item.fileNames?.length > 0) && (
                      <div className="board-item-meta">
                        {item.content && <span>내용 있음 </span>}
                        {item.fileNames?.length > 0 && <span>📎 {item.fileNames.length}개</span>}
                      </div>
                    )}
                  </div>
                  {adminMode && !String(item.id).startsWith('tt_') && (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmItem(item); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc', padding: '0 2px' }}
                    >✕</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && <AddNoticeModal onClose={() => setShowModal(false)} />}
      {selected && (
        <DetailModal item={selected} adminMode={adminMode}
          onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
      {confirmItem && (
        <ConfirmModal
          message={`"${confirmItem.display}" 항목을 삭제할까요?`}
          onConfirm={() => { handleDelete(confirmItem.id); setConfirmItem(null); }}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </>
  );
}
