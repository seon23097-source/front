// src/api/noticeApi.js
// ⚠ 백엔드 notice 모듈 배포 전까지 localStorage 전용으로 동작
// 배포 후 API 연동 버전으로 교체 예정

const ITEMS_KEY = 'schosche_notice_items';
const BOARD_KEY = 'schosche_board_notices';

function lsGetItems()  { try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch { return []; } }
function lsSetItems(v) { localStorage.setItem(ITEMS_KEY, JSON.stringify(v)); window.dispatchEvent(new Event('noticeItemsChanged')); }
function lsGetBoard()  { try { return JSON.parse(localStorage.getItem(BOARD_KEY) || '[]'); } catch { return []; } }
function lsSetBoard(v) { localStorage.setItem(BOARD_KEY, JSON.stringify(v)); window.dispatchEvent(new Event('boardNoticesChanged')); }

// ── notice_items (시간표 안내장/제출마감) ─────────────
export async function fetchNoticeItems() { return lsGetItems(); }

export async function createNoticeItem(data) {
  const item = { ...data, id: Date.now(), fileNames: data.fileNames || [], createdAt: Date.now() };
  lsSetItems([item, ...lsGetItems()]);
  return item;
}

export async function deleteNoticeItem(id) {
  lsSetItems(lsGetItems().filter(i => i.id !== Number(id) && i.id !== id));
}

// ── board_notices (홈 게시판 공지/안내장) ─────────────
export async function fetchBoardNotices() { return lsGetBoard(); }

export async function createBoardNotice(data) {
  const item = { ...data, id: Date.now(), fileNames: data.fileNames || [], createdAt: Date.now() };
  lsSetBoard([item, ...lsGetBoard()]);
  return item;
}

export async function deleteBoardNotice(id) {
  lsSetBoard(lsGetBoard().filter(i => i.id !== Number(id) && i.id !== id));
}
