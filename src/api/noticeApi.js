// src/api/noticeApi.js
const BASE = process.env.REACT_APP_API_URL || '';

// ── notice_items (시간표 안내장/제출마감) ─────────────
export async function fetchNoticeItems() {
  try {
    const res = await fetch(`${BASE}/api/notices/items`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return null; }  // null = 실패 (localStorage 폴백용)
}

export async function createNoticeItem(data) {
  const res = await fetch(`${BASE}/api/notices/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('create failed');
  return await res.json();
}

export async function updateNoticeItem(id, data) {
  const res = await fetch(`${BASE}/api/notices/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('update failed');
  return await res.json();
}

export async function deleteNoticeItem(id) {
  await fetch(`${BASE}/api/notices/items/${id}`, { method: 'DELETE' });
}

// ── board_notices (홈 게시판 공지/안내장) ─────────────
export async function fetchBoardNotices() {
  try {
    const res = await fetch(`${BASE}/api/notices/board`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch { return null; }
}

export async function createBoardNotice(data) {
  const res = await fetch(`${BASE}/api/notices/board`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('create failed');
  return await res.json();
}

export async function deleteBoardNotice(id) {
  await fetch(`${BASE}/api/notices/board/${id}`, { method: 'DELETE' });
}
