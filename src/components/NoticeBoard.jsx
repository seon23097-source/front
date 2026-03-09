import { useState, useEffect, useCallback } from 'react';
import { createBoardNotice, deleteBoardNotice } from '../api/noticeApi';

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

function AddNoticeModal({ onClose, onSaved }) {
  const [title, setTitle]     = useState('');
  const [type, setType]       = useState('notice');
  const [pinned, setPinned]   = useState(false);
  const [content, setContent] = useState('');
  const [month, setMonth]     = useState(() => {
    const d = new Date();
    return `${d.getMonth()+1}월${d.getDate()}일`;
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
      await onSaved();
    } catch(e) { console.error(e); }
    setSaving(false);
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
          <label>종류
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {['notice','announcement'].map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  flex: 1, padding: 7, borderRadius: 6, border: '1.5px solid',
                  borderColor: type === t ? (t === 'notice' ? 'var(--accent)' : '#FF6B35') : 'var(--border)',
                  background: type === t ? (t === 'notice' ? 'var(--accent-light)' : 'rgba(255,107,53,0.08)') : 'var(--surface)',
                  color: type === t ? (t === 'notice' ? 'var(--accent)' : '#FF6B35') : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>{t === 'notice' ? '📢 공지' : '📄 안내장'}</button>
              ))}
            </div>
          </label>
          {type === 'announcement' && (
            <label>배부일
              <input type="text" value={month} onChange={e => setMonth(e.target.value)} placeholder="예: 3월8일" />
            </label>
          )}
          <label>제목
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !content && handleSave()}
              placeholder={type === 'notice' ? '공지 제목' : '안내장 제목'} autoFocus />
          </label>
          {type === 'notice' && (
            <label>내용
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="공지 내용 (선택사항)" rows={3}
                style={{ width: '100%', resize: 'vertical', padding: '8px 10px',
                  border: '1.5px solid var(--border)', borderRadius: 6,
                  fontFamily: 'inherit', fontSize: 13,
                  background: 'var(--surface)', color: 'var(--text)' }} />
            </label>
          )}
          <label>첨부파일
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <label style={{ padding: '5px 10px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 5,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>
                📎 파일 선택
                <input type="file" multiple style={{ display: 'none' }}
                  onChange={e => setFiles(Array.from(e.target.files))} />
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {files.length > 0 ? files.map(f => f.name).join(', ') : '없음'}
              </span>
            </div>
          </label>
          {type === 'notice' && (
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
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

function DetailModal({ item, onClose, onDelete, adminMode }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isTimetable = String(item.id).startsWith('tt_');
  const accentColor = item.type === 'notice' ? '#3D5AFE' : '#FF6B35';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${accentColor}` }}>
          <span className="modal-class">{item.type === 'notice' ? '📢 공지' : '📄 안내장'}</span>
          {item.pinned && <span style={{ fontSize: 11, color: accentColor, fontWeight: 700 }}>📍 고정</span>}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{item.display}</div>
          {item.content && (
            <div style={{ fontSize: 13, lineHeight: 1.7, padding: '10px 12px',
              background: 'var(--surface2)', borderRadius: 6,
              whiteSpace: 'pre-wrap', marginBottom: 8 }}>{item.content}</div>
          )}
          {item.fileNames?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {item.fileNames.map((n, i) => (
                <div key={i} style={{ fontSize: 12, padding: '5px 10px',
                  background: 'var(--surface2)', borderRadius: 5,
                  border: '1px solid var(--border)', marginBottom: 4 }}>📎 {n}</div>
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
          <ConfirmModal message={`"${item.display}" 항목을 삭제할까요?`}
            onConfirm={() => { onDelete(item.id); onClose(); }}
            onCancel={() => setConfirmDelete(false)} />
        )}
      </div>
    </div>
  );
}

// boardNotices, noticeItems: App에서 내려주는 props
export default function NoticeBoard({ adminMode, boardNotices = [], noticeItems = [], onReloadBoard }) {
  const [showModal, setShowModal]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // 시간표 안내장: 배부일 기준 7일 이내만, 날짜 정보 보존
  const timetableNotices = noticeItems
    .filter(i => {
      if (i.type !== 'notice') return false;
      if (!i.date) return true;
      const d = new Date(i.date); d.setHours(0, 0, 0, 0);
      const diff = (d - today) / 86400000; // 양수 = 미래, 음수 = 과거
      return diff >= -7 && diff <= 7;
    })
    .map(i => ({
      id: 'tt_' + i.id,
      type: 'announcement',
      title: i.title,
      display: `[${i.displayDate} 배부] ${i.title}`,
      fileNames: i.fileNames || [],
      pinned: false,
      createdAt: i.createdAt,
      itemDate: i.date ? new Date(i.date).setHours(0, 0, 0, 0) : null,
    }));

  // 게시판 공지: 생성일 기준 7일 이내만
  const filteredBoardNotices = boardNotices.filter(n => {
    if (n.pinned) return true; // 고정 공지는 항상 표시
    const created = n.createdAt ? new Date(n.createdAt) : null;
    if (!created) return true;
    return (today - created.setHours(0, 0, 0, 0)) / 86400000 <= 7;
  });

  // 날짜 기준 정렬: 현재에 가까운 순 (미래 > 오늘 > 과거), 고정 공지 최상단
  const getDateScore = (item) => {
    if (item.itemDate != null) return item.itemDate;
    if (item.createdAt) return new Date(item.createdAt).setHours(0, 0, 0, 0);
    return 0;
  };

  const allItems = [...filteredBoardNotices, ...timetableNotices]
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // 현재 날짜와의 차이 절댓값이 작을수록(가까울수록) 상단
      const diffA = Math.abs(getDateScore(a) - today.getTime());
      const diffB = Math.abs(getDateScore(b) - today.getTime());
      if (diffA !== diffB) return diffA - diffB;
      return getDateScore(b) - getDateScore(a); // 같으면 최신순
    });

  const catColor = { notice: '#3D5AFE', announcement: '#FF6B35' };

  const handleDelete = async (id) => {
    try { await deleteBoardNotice(id); } catch(e) { console.error(e); }
    if (onReloadBoard) await onReloadBoard();
  };

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
          {allItems.length === 0 ? (
            <div className="board-empty"><span>📭</span><span>등록된 공지가 없습니다.</span></div>
          ) : allItems.map(item => (
            <div key={item.id} className="board-item board-item-clickable"
              onClick={() => setSelected(item)}>
              {item.pinned && <span style={{ fontSize: 10 }}>📍</span>}
              <div className="board-item-dot" style={{ background: catColor[item.type] || '#888' }} />
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
                <button onClick={e => { e.stopPropagation(); setConfirmItem(item); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#ccc', padding: '0 2px' }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && <AddNoticeModal onClose={() => setShowModal(false)} onSaved={onReloadBoard} />}
      {selected && <DetailModal item={selected} adminMode={adminMode}
        onClose={() => setSelected(null)} onDelete={handleDelete} />}
      {confirmItem && (
        <ConfirmModal message={`"${confirmItem.display}" 항목을 삭제할까요?`}
          onConfirm={() => { handleDelete(confirmItem.id); setConfirmItem(null); }}
          onCancel={() => setConfirmItem(null)} />
      )}
    </>
  );
}
