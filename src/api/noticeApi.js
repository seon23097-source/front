// src/api/noticeApi.js
const BASE = process.env.REACT_APP_API_URL || '';
const ITEMS_KEY  = 'schosche_notice_items';
const BOARD_KEY  = 'schosche_board_notices';

// API 사용 가능 여부 캐시 (한번 실패하면 세션 동안 localStorage 사용)
let _apiAvailable = null;

async function checkApi() {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const res = await fetch(`${BASE}/api/notices/items`, { signal: AbortSignal.timeout(3000) });
    _apiAvailable = res.ok || res.status === 200;
  } catch {
    _apiAvailable = false;
  }
  return _apiAvailable;
}

// ── localStorage 폴백 헬퍼 ────────────────────────────
function lsGetItems()  { try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch { return []; } }
function lsSetItems(v) { localStorage.setItem(ITEMS_KEY, JSON.stringify(v)); }
function lsGetBoard()  { try { return JSON.parse(localStorage.getItem(BOARD_KEY) || '[]'); } catch { return []; } }
function lsSetBoard(v) { localStorage.setItem(BOARD_KEY, JSON.stringify(v)); }

// ── notice_items ──────────────────────────────────────
export async function fetchNoticeItems() {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}/api/notices/items`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return lsGetItems();
}

export async function createNoticeItem(data) {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}/api/notices/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {}
  }
  // localStorage 폴백
  const item = { ...data, id: Date.now(), createdAt: Date.now() };
  lsSetItems([item, ...lsGetItems()]);
  return item;
}

export async function deleteNoticeItem(id) {
  if (await checkApi()) {
    try { await fetch(`${BASE}/api/notices/items/${id}`, { method: 'DELETE' }); return; } catch {}
  }
  lsSetItems(lsGetItems().filter(i => i.id !== id));
}

// ── board_notices ─────────────────────────────────────
export async function fetchBoardNotices() {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}/api/notices/board`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return lsGetBoard();
}

export async function createBoardNotice(data) {
  if (await checkApi()) {
    try {
      const res = await fetch(`${BASE}/api/notices/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {}
  }
  const item = { ...data, id: Date.now(), createdAt: Date.now() };
  lsSetBoard([item, ...lsGetBoard()]);
  return item;
}

export async function deleteBoardNotice(id) {
  if (await checkApi()) {
    try { await fetch(`${BASE}/api/notices/board/${id}`, { method: 'DELETE' }); return; } catch {}
  }
  lsSetBoard(lsGetBoard().filter(i => i.id !== id));
}
