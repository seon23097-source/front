import { useState, useEffect, useCallback } from 'react';
import { fetchPosts, createPost, deletePost, submitVote, fetchComments, createComment, deleteComment } from '../api/meetingApi';

const BASE = process.env.REACT_APP_API_URL || '';

// ── 유틸 ─────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── 삭제 확인 모달 ────────────────────────────────────
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

// ── 등록 모달 ─────────────────────────────────────────
function CreatePostModal({ onClose, onSaved, classes }) {
  const [postType, setPostType]   = useState('opinion'); // 'survey' | 'opinion'
  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [files, setFiles]         = useState([]);
  // 설문 전용
  const [surveyQuestion, setSurveyQuestion] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleClass = (cls) =>
    setSelectedClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    if (postType === 'survey' && selectedClasses.length === 0) return;
    setSaving(true);
    try {
      await createPost({
        type: postType,
        title: title.trim(),
        content: content.trim(),
        fileNames: files.map(f => f.name),
        // 설문: 선택된 반 목록을 options로 전달
        options: postType === 'survey'
          ? selectedClasses.map(cls => ({ label: cls }))
          : [],
        surveyQuestion: postType === 'survey' ? surveyQuestion.trim() : '',
      });
      await onSaved();
      onClose();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const regularClasses = classes.filter(c => !c.isSpecial);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 460, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${postType === 'survey' ? '#f59e0b' : '#3D5AFE'}` }}>
          <span className="modal-class">업무협의 등록</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* 타입 선택 */}
          <label>종류
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[
                { val: 'opinion', icon: '💬', label: '의견' },
                { val: 'survey',  icon: '📊', label: '설문' },
              ].map(({ val, icon, label }) => (
                <button key={val} onClick={() => setPostType(val)} style={{
                  flex: 1, padding: 8, borderRadius: 6, border: '1.5px solid',
                  borderColor: postType === val ? (val === 'survey' ? '#f59e0b' : 'var(--accent)') : 'var(--border)',
                  background: postType === val ? (val === 'survey' ? 'rgba(245,158,11,0.08)' : 'var(--accent-light)') : 'var(--surface)',
                  color: postType === val ? (val === 'survey' ? '#b45309' : 'var(--accent)') : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}>{icon} {label}</button>
              ))}
            </div>
          </label>

          {/* 제목 */}
          <label>제목
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요" autoFocus />
          </label>

          {/* 내용 */}
          <label>내용
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="내용을 입력하세요 (선택사항)" rows={3}
              style={{ width: '100%', resize: 'vertical', padding: '8px 10px',
                border: '1.5px solid var(--border)', borderRadius: 6,
                fontFamily: 'inherit', fontSize: 13,
                background: 'var(--surface)', color: 'var(--text)' }} />
          </label>

          {/* 설문 전용: 질문 + 반 선택 */}
          {postType === 'survey' && (
            <>
              <label>설문 질문
                <input type="text" value={surveyQuestion}
                  onChange={e => setSurveyQuestion(e.target.value)}
                  placeholder="예: 참석 여부를 선택해주세요" />
              </label>
              <label>
                대상 반 선택 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(체크박스 항목으로 추가됩니다)</span>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6,
                  padding: '10px', background: 'var(--surface2)',
                  borderRadius: 6, border: '1px solid var(--border)',
                }}>
                  {regularClasses.map(cls => {
                    const checked = selectedClasses.includes(cls.className);
                    return (
                      <button key={cls.className} onClick={() => toggleClass(cls.className)}
                        style={{
                          padding: '4px 10px', borderRadius: 5, border: '1.5px solid',
                          borderColor: checked ? 'var(--accent)' : 'var(--border)',
                          background: checked ? 'var(--accent-light)' : 'var(--surface)',
                          color: checked ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: checked ? 700 : 400,
                          fontSize: 12, cursor: 'pointer',
                        }}>{cls.className}</button>
                    );
                  })}
                  {regularClasses.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>반 정보를 불러오는 중...</span>
                  )}
                </div>
                {postType === 'survey' && selectedClasses.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, display: 'block' }}>
                    최소 1개 이상 선택해주세요.
                  </span>
                )}
              </label>
            </>
          )}

          {/* 첨부파일 */}
          <label>첨부파일
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <label style={{
                padding: '5px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)',
              }}>
                📎 파일 선택
                <input type="file" multiple style={{ display: 'none' }}
                  onChange={e => setFiles(Array.from(e.target.files))} />
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {files.length > 0 ? files.map(f => f.name).join(', ') : '없음'}
              </span>
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave}
            disabled={!title.trim() || saving || (postType === 'survey' && selectedClasses.length === 0)}>
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 댓글 섹션 ─────────────────────────────────────────
function CommentsSection({ postId, adminMode }) {
  const [comments, setComments] = useState([]);
  const [author, setAuthor]     = useState('');
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    const data = await fetchComments(postId);
    setComments(data);
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await createComment(postId, { author: author.trim() || '익명', content: text.trim() });
      setText('');
      await load();
    } catch(e) { console.error(e); }
    setSending(false);
  };

  const handleDelete = async (cid) => {
    try { await deleteComment(postId, cid); await load(); } catch(e) { console.error(e); }
  };

  return (
    <div className="meeting-comments">
      <div className="meeting-comments-title">💬 댓글 {comments.length > 0 ? `(${comments.length})` : ''}</div>
      {comments.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>아직 댓글이 없습니다.</div>
      )}
      {comments.map(c => (
        <div key={c.id} className="meeting-comment-item">
          <div className="meeting-comment-meta">
            <span className="meeting-comment-author">{c.author}</span>
            <span className="meeting-comment-date">{formatDate(c.createdAt)}</span>
            {adminMode && (
              <button onClick={() => setConfirmId(c.id)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none',
                  fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}>✕</button>
            )}
          </div>
          <div className="meeting-comment-text">{c.content}</div>
        </div>
      ))}
      {/* 댓글 입력 */}
      <div className="meeting-comment-input-row">
        <input
          value={author} onChange={e => setAuthor(e.target.value)}
          placeholder="이름 (선택)"
          className="meeting-comment-author-input"
          style={{ width: 80 }}
        />
        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="댓글 입력..."
          className="meeting-comment-text-input"
          style={{ flex: 1 }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="meeting-comment-send-btn">
          {sending ? '...' : '등록'}
        </button>
      </div>
      {confirmId && (
        <ConfirmModal message="이 댓글을 삭제할까요?"
          onConfirm={() => { handleDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}

// ── 설문 투표 섹션 ────────────────────────────────────
function SurveySection({ post, onVoted }) {
  const [voterName, setVoterName]       = useState('');
  const [selectedOpts, setSelectedOpts] = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);

  const toggleOpt = (id) =>
    setSelectedOpts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const totalVotes = post.options?.reduce((sum, o) => sum + (o.voteCount || 0), 0) || 0;

  const handleVote = async () => {
    if (!voterName.trim() || selectedOpts.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitVote(post.id, selectedOpts, voterName.trim());
      setSubmitted(true);
      if (onVoted) await onVoted();
    } catch(e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <div className="meeting-survey">
      {post.surveyQuestion && (
        <div className="meeting-survey-question">📊 {post.surveyQuestion}</div>
      )}
      <div className="meeting-survey-options">
        {(post.options || []).map(opt => {
          const pct = totalVotes > 0 ? Math.round((opt.voteCount || 0) / totalVotes * 100) : 0;
          const checked = selectedOpts.includes(opt.id);
          return (
            <div key={opt.id}
              className={`meeting-survey-option${checked ? ' selected' : ''}`}
              onClick={() => !submitted && toggleOpt(opt.id)}
            >
              <div className="meeting-survey-bar" style={{ width: `${pct}%` }} />
              <div className="meeting-survey-option-content">
                <span className={`meeting-survey-checkbox${checked ? ' checked' : ''}`}>
                  {checked ? '✓' : ''}
                </span>
                <span className="meeting-survey-label">{opt.label}</span>
                <span className="meeting-survey-count">{opt.voteCount || 0}표 ({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
      {!submitted ? (
        <div className="meeting-survey-vote-row">
          <input value={voterName} onChange={e => setVoterName(e.target.value)}
            placeholder="이름 입력 (필수)"
            style={{
              flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
              borderRadius: 5, fontSize: 13, background: 'var(--surface)', color: 'var(--text)',
            }} />
          <button onClick={handleVote}
            disabled={!voterName.trim() || selectedOpts.length === 0 || submitting}
            className="btn-save" style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}>
            {submitting ? '제출 중...' : '투표'}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 8 }}>
          ✅ 투표가 완료되었습니다.
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        총 {totalVotes}표 참여
      </div>
    </div>
  );
}

// ── 게시글 상세 모달 ──────────────────────────────────
function PostDetailModal({ post, adminMode, onClose, onDeleted, onVoted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accentColor = post.type === 'survey' ? '#f59e0b' : '#3D5AFE';
  const typeLabel   = post.type === 'survey' ? '📊 설문' : '💬 의견';

  const handleDelete = async () => {
    try { await deletePost(post.id); onDeleted(); onClose(); } catch(e) { console.error(e); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box meeting-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${accentColor}` }}>
          <span className="modal-class">{typeLabel}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(post.createdAt)}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: 14 }}>
          {/* 제목 */}
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{post.title}</div>

          {/* 본문 */}
          {post.content && (
            <div style={{
              fontSize: 13, lineHeight: 1.7, padding: '10px 12px',
              background: 'var(--surface2)', borderRadius: 6, whiteSpace: 'pre-wrap',
            }}>{post.content}</div>
          )}

          {/* 첨부파일 */}
          {post.fileNames?.length > 0 && (
            <div>
              {post.fileNames.map((n, i) => (
                <div key={i} style={{
                  fontSize: 12, padding: '5px 10px', background: 'var(--surface2)',
                  borderRadius: 5, border: '1px solid var(--border)', marginBottom: 4,
                }}>📎 {n}</div>
              ))}
            </div>
          )}

          {/* 설문 섹션 */}
          {post.type === 'survey' && <SurveySection post={post} onVoted={onVoted} />}

          {/* 댓글 섹션 (의견 타입만) */}
          {post.type === 'opinion' && <CommentsSection postId={post.id} adminMode={adminMode} />}
        </div>
        <div className="modal-footer">
          {adminMode && (
            <button className="btn-delete" onClick={() => setConfirmDelete(true)}>🗑️ 삭제</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
        {confirmDelete && (
          <ConfirmModal message={`"${post.title}" 게시글을 삭제할까요?`}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)} />
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function MeetingBoard({ adminMode }) {
  const [posts, setPosts]         = useState([]);
  const [classes, setClasses]     = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState('all'); // 'all' | 'survey' | 'opinion'
  const [loading, setLoading]     = useState(true);

  const loadPosts = useCallback(async () => {
    const data = await fetchPosts();
    setPosts(data);
    setLoading(false);
  }, []);

  // 반 목록 로드 (설문 옵션용)
  useEffect(() => {
    fetch(`${BASE}/api/admin/classes`)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
        setClasses(sorted);
      })
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = filter === 'all' ? posts
    : posts.filter(p => p.type === filter);

  const typeColor = { survey: '#f59e0b', opinion: '#3D5AFE' };
  const typeLabel = { survey: '📊 설문', opinion: '💬 의견' };

  // 선택된 post 최신 상태 반영 (투표 후 갱신)
  const refreshSelected = useCallback(async () => {
    await loadPosts();
    if (selected) {
      const data = await fetchPosts();
      const updated = data.find(p => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected, loadPosts]);

  return (
    <div className="meeting-board">
      {/* 헤더 */}
      <div className="meeting-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="meeting-title">🤝 업무협의</span>
          {/* 필터 탭 */}
          <div className="meeting-filter-tabs">
            {[['all', '전체'], ['opinion', '💬 의견'], ['survey', '📊 설문']].map(([val, label]) => (
              <button key={val}
                className={`meeting-filter-tab${filter === val ? ' active' : ''}`}
                onClick={() => setFilter(val)}>{label}</button>
            ))}
          </div>
        </div>
        {adminMode && (
          <button className="board-add-btn" style={{ fontSize: 20 }} onClick={() => setShowCreate(true)}>＋</button>
        )}
      </div>

      {/* 게시글 목록 */}
      <div className="meeting-list">
        {loading && (
          <div className="meeting-empty"><span>불러오는 중...</span></div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="meeting-empty">
            <span>📭</span>
            <span>등록된 게시글이 없습니다.</span>
          </div>
        )}
        {filtered.map(post => {
          const totalVotes = post.options?.reduce((s, o) => s + (o.voteCount || 0), 0) || 0;
          const commentCount = post.commentCount || 0;
          return (
            <div key={post.id} className="meeting-post-item"
              onClick={() => setSelected(post)}>
              <div className="meeting-post-type-dot"
                style={{ background: typeColor[post.type] || '#888' }} />
              <div className="meeting-post-body">
                <div className="meeting-post-title">
                  <span className="meeting-post-type-badge"
                    style={{ color: typeColor[post.type], borderColor: typeColor[post.type] }}>
                    {typeLabel[post.type]}
                  </span>
                  {post.title}
                </div>
                <div className="meeting-post-meta">
                  <span>{formatDate(post.createdAt)}</span>
                  {post.type === 'survey' && <span>· 투표 {totalVotes}명</span>}
                  {post.type === 'opinion' && commentCount > 0 && <span>· 댓글 {commentCount}</span>}
                  {post.fileNames?.length > 0 && <span>· 📎 {post.fileNames.length}</span>}
                </div>
              </div>
              {adminMode && (
                <button onClick={e => { e.stopPropagation(); setSelected(post); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
                    fontSize: 12, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>›</button>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onSaved={loadPosts}
          classes={classes}
        />
      )}

      {selected && (
        <PostDetailModal
          post={selected}
          adminMode={adminMode}
          onClose={() => setSelected(null)}
          onDeleted={loadPosts}
          onVoted={refreshSelected}
        />
      )}
    </div>
  );
}
