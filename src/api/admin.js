const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  return res.json();
};

// ── 학기 기본정보 ──
export const getSettings = () => req('GET', '/settings');
export const saveSettings = (data) => req('POST', '/settings', data);
export const deleteSettings = (year) => req('DELETE', `/settings/${year}`);

// ── 행사일/공휴일 ──
export const getEvents = () => req('GET', '/events');
export const createEvent = (data) => req('POST', '/events', data);
export const updateEvent = (id, data) => req('PUT', `/events/${id}`, data);
export const deleteEvent = (id) => req('DELETE', `/events/${id}`);

// ── 학반 정보 ──
export const getClasses = () => req('GET', '/classes');
export const createClass = (data) => req('POST', '/classes', data);
export const updateClass = (id, data) => req('PUT', `/classes/${id}`, data);
export const deleteClass = (id) => req('DELETE', `/classes/${id}`);

// ── 과목 정보 ──
export const getSubjects = () => req('GET', '/subjects');
export const createSubject = (data) => req('POST', '/subjects', data);
export const updateSubject = (id, data) => req('PUT', `/subjects/${id}`, data);
export const deleteSubject = (id) => req('DELETE', `/subjects/${id}`);

// ── 기초시간표 ──
export const getBaseTimetable = (className) =>
  req('GET', `/base-timetable${className ? `?className=${encodeURIComponent(className)}` : ''}`);
export const saveBaseEntry = (data) => req('POST', '/base-timetable', data);
export const deleteBaseEntry = (id) => req('DELETE', `/base-timetable/${id}`);
export const applyBaseTimetable = (classNames, fromDate, toDate) =>
  req('POST', '/base-timetable/apply', { classNames, fromDate, toDate });
