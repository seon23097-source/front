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
// 설문 질문 1개 구조: { question: string, options: string[] }
const newQuestion = () => ({ question: '', options: ['', ''] });

function CreatePostModal({ onClose, onSaved, classes }) {
  const [postType, setPostType] = useState('opinion');
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [files, setFiles]       = useState([]);
  const [saving, setSaving]     = useState(false);

  // 설문 전용: 질문 목록 (각 질문은 question + options 배열)
  const [questions, setQuestions] = useState([newQuestion()]);

  // 질문 텍스트 변경
  const setQText = (qi, val) =>
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, question: val } : q));
  // 답변 문항 변경
  const setOptText = (qi, oi, val) =>
    setQuestions(prev => prev.map((q, i) => i !== qi ? q : {
      ...q, options: q.options.map((o, j) => j === oi ? val : o)
    }));
  // 답변 문항 추가
  const addOpt = (qi) =>
    setQuestions(prev => prev.map((q, i) => i !== qi ? q : { ...q, options: [...q.options, ''] }));
  // 답변 문항 삭제
  const removeOpt = (qi, oi) =>
    setQuestions(prev => prev.map((q, i) => i !== qi ? q : {
      ...q, options: q.options.filter((_, j) => j !== oi)
    }));
  // 질문 추가
  const addQuestion = () => setQuestions(prev => [...prev, newQuestion()]);
  // 질문 삭제
  const removeQuestion = (qi) =>
    setQuestions(prev => prev.length > 1 ? prev.filter((_, i) => i !== qi) : prev);

  const surveyValid = postType !== 'survey' ||
    questions.every(q => q.question.trim() && q.options.filter(o => o.trim()).length >= 2);

  const handleSave = async () => {
    if (!title.trim() || saving || !surveyValid) return;
    setSaving(true);
    try {
      // 설문: 각 질문의 답변 문항을 "Q1번호|질문텍스트|답변" 형식 label로 flat하게 전달
      // 렌더링 시 파싱해서 질문별로 그룹핑
      const options = postType === 'survey'
        ? questions.flatMap((q, qi) =>
            q.options.filter(o => o.trim()).map(o => ({
              label: `Q${qi + 1}|||${q.question.trim()}|||${o.trim()}`
            }))
          )
        : [];
      await createPost({
        type: postType,
        title: title.trim(),
        content: content.trim(),
        fileNames: files.map(f => f.name),
        options,
        surveyQuestion: postType === 'survey'
          ? questions.map(q => q.question.trim()).join(' / ')
          : '',
      });
      await onSaved();
      onClose();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ width: 520, maxWidth: '96vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${postType === 'survey' ? '#f59e0b' : '#3D5AFE'}` }}>
          <span className="modal-class">업무협의 등록</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* 종류 선택 */}
          <label>종류
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {[{ val: 'opinion', icon: '💬', label: '의견' }, { val: 'survey', icon: '📊', label: '설문' }]
                .map(({ val, icon, label }) => (
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

          {/* 설문 전용: 질문 + 답변 문항 */}
          {postType === 'survey' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>📋 설문 질문</span>
                <button onClick={addQuestion} style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 5,
                  border: '1.5px solid #f59e0b', background: 'rgba(245,158,11,0.08)',
                  color: '#b45309', fontWeight: 700, cursor: 'pointer',
                }}>+ 질문 추가</button>
              </div>

              {questions.map((q, qi) => (
                <div key={qi} style={{
                  background: 'var(--surface2)', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '12px 12px 10px', marginBottom: 10,
                }}>
                  {/* 질문 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', minWidth: 28 }}>Q{qi + 1}</span>
                    <input
                      value={q.question}
                      onChange={e => setQText(qi, e.target.value)}
                      placeholder="질문을 입력하세요"
                      style={{ flex: 1, padding: '5px 8px', border: '1.5px solid var(--border)',
                        borderRadius: 5, fontSize: 13, background: 'var(--surface)', color: 'var(--text)' }}
                    />
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 16, color: 'var(--text-muted)', padding: '0 2px',
                      }}>✕</button>
                    )}
                  </div>

                  {/* 답변 문항 */}
                  <div style={{ paddingLeft: 28 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>답변 문항</div>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 18 }}>
                          {oi + 1}.
                        </span>
                        <input
                          value={opt}
                          onChange={e => setOptText(qi, oi, e.target.value)}
                          placeholder={`답변 ${oi + 1}`}
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border)',
                            borderRadius: 5, fontSize: 12, background: 'var(--surface)', color: 'var(--text)' }}
                        />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOpt(qi, oi)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 14, color: 'var(--text-muted)', padding: '0 2px',
                          }}>✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOpt(qi)} style={{
                      marginTop: 2, fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      border: '1px dashed var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', cursor: 'pointer',
                    }}>+ 문항 추가</button>
                  </div>
                </div>
              ))}

              {!surveyValid && (
                <span style={{ fontSize: 11, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                  각 질문을 입력하고 답변 문항을 2개 이상 작성해주세요.
                </span>
              )}
            </div>
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
            disabled={!title.trim() || saving || !surveyValid}>
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
// label 포맷: "Q{qi+1}|||{질문텍스트}|||{답변텍스트}"
// 구버전 label(파이프 없음)은 그대로 단일 그룹으로 표시
function parseSurveyGroups(options) {
  const grouped = {};
  const legacy = [];
  (options || []).forEach(opt => {
    const parts = (opt.label || '').split('|||');
    if (parts.length === 3) {
      const [qKey, qText, aText] = parts;
      if (!grouped[qKey]) grouped[qKey] = { qKey, qText, options: [] };
      grouped[qKey].options.push({ ...opt, displayLabel: aText });
    } else {
      legacy.push({ ...opt, displayLabel: opt.label });
    }
  });
  const groups = Object.values(grouped);
  if (legacy.length > 0) groups.push({ qKey: 'legacy', qText: '', options: legacy });
  return groups;
}

function SurveySection({ post, onVoted }) {
  const [voterName, setVoterName]       = useState('');
  // 질문별 선택: { [qKey]: optId[] }
  const [selectedMap, setSelectedMap]   = useState({});
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);

  const groups = parseSurveyGroups(post.options);

  const toggleOpt = (qKey, id) =>
    setSelectedMap(prev => {
      const cur = prev[qKey] || [];
      return { ...prev, [qKey]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    });

  const allOptIds = Object.values(selectedMap).flat();
  const allAnswered = groups.length > 0 && groups.every(g => (selectedMap[g.qKey] || []).length > 0);

  const handleVote = async () => {
    if (!voterName.trim() || !allAnswered || submitting) return;
    setSubmitting(true);
    try {
      await submitVote(post.id, allOptIds, voterName.trim());
      setSubmitted(true);
      if (onVoted) await onVoted();
    } catch(e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <div className="meeting-survey">
      {groups.map((g, gi) => {
        const groupTotal = g.options.reduce((sum, o) => sum + (o.voteCount || 0), 0);
        return (
          <div key={g.qKey} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
            {g.qText && (
              <div className="meeting-survey-question">📊 {g.qText}</div>
            )}
            <div className="meeting-survey-options">
              {g.options.map(opt => {
                const pct = groupTotal > 0 ? Math.round((opt.voteCount || 0) / groupTotal * 100) : 0;
                const checked = (selectedMap[g.qKey] || []).includes(opt.id);
                return (
                  <div key={opt.id}
                    className={`meeting-survey-option${checked ? ' selected' : ''}`}
                    onClick={() => !submitted && toggleOpt(g.qKey, opt.id)}
                  >
                    <div className="meeting-survey-bar" style={{ width: `${pct}%` }} />
                    <div className="meeting-survey-option-content">
                      <span className={`meeting-survey-checkbox${checked ? ' checked' : ''}`}>
                        {checked ? '✓' : ''}
                      </span>
                      <span className="meeting-survey-label">{opt.displayLabel}</span>
                      <span className="meeting-survey-count">{opt.voteCount || 0}표 ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {!submitted ? (
        <div className="meeting-survey-vote-row">
          <input value={voterName} onChange={e => setVoterName(e.target.value)}
            placeholder="이름 입력 (필수)"
            style={{
              flex: 1, padding: '6px 10px', border: '1px solid var(--border)',
              borderRadius: 5, fontSize: 13, background: 'var(--surface)', color: 'var(--text)',
            }} />
          <button onClick={handleVote}
            disabled={!voterName.trim() || !allAnswered || submitting}
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

  // 반 목록 로드 (더 이상 모달에 전달 안 함, 필요 시 재활성화)
  useEffect(() => {
    fetch(`${BASE}/api/classes`)
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
