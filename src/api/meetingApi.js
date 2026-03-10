// src/api/meetingApi.js
const BASE = process.env.REACT_APP_API_URL || '';

// ── 게시글 ────────────────────────────────────────────
export async function fetchPosts() {
  try {
    const res = await fetch(`${BASE}/api/meeting/posts`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return []; }
}

export async function createPost(data) {
  const res = await fetch(`${BASE}/api/meeting/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('create failed');
  return await res.json();
}

export async function deletePost(id) {
  await fetch(`${BASE}/api/meeting/posts/${id}`, { method: 'DELETE' });
}

export async function updatePost(id, data) {
  const res = await fetch(`${BASE}/api/meeting/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('update failed');
  return await res.json();
}

// ── 설문 투표 ─────────────────────────────────────────
export async function submitVote(postId, optionIds, voterName) {
  const res = await fetch(`${BASE}/api/meeting/posts/${postId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIds, voterName }),
  });
  if (!res.ok) throw new Error('vote failed');
  return await res.json();
}

export async function fetchVoters(postId) {
  try {
    const res = await fetch(`${BASE}/api/meeting/posts/${postId}/voters`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return []; }
}

export async function updateOption(postId, optionId, label) {
  const res = await fetch(`${BASE}/api/meeting/posts/${postId}/options/${optionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error('update option failed');
  return await res.json();
}

// ── 댓글 ─────────────────────────────────────────────
export async function fetchComments(postId) {
  try {
    const res = await fetch(`${BASE}/api/meeting/posts/${postId}/comments`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return []; }
}

export async function createComment(postId, data) {
  const res = await fetch(`${BASE}/api/meeting/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('comment failed');
  return await res.json();
}

export async function deleteComment(postId, commentId) {
  await fetch(`${BASE}/api/meeting/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
}
