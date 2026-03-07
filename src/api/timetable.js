const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function fetchTimetable() {
  const res = await fetch(`${BASE_URL}/api/timetable`);
  if (!res.ok) throw new Error('시간표 불러오기 실패');
  return res.json();
}

export async function fetchTimetableByClasses(classNames) {
  if (!classNames.length) return [];
  const query = classNames.join(',');
  const res = await fetch(`${BASE_URL}/api/timetable/classes?names=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('시간표 불러오기 실패');
  return res.json();
}

export async function upsertEntry(entry) {
  const res = await fetch(`${BASE_URL}/api/timetable`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!res.ok) throw new Error('저장 실패');
  return res.json();
}

export async function deleteEntry(class_name, day_of_week, period) {
  const res = await fetch(`${BASE_URL}/api/timetable`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_name, day_of_week, period })
  });
  if (!res.ok) throw new Error('삭제 실패');
  return res.json();
}

export async function fetchColors() {
  const res = await fetch(`${BASE_URL}/api/colors`);
  if (!res.ok) throw new Error('색상 불러오기 실패');
  return res.json();
}

export async function updateColor(colorData) {
  const res = await fetch(`${BASE_URL}/api/colors`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colorData)
  });
  if (!res.ok) throw new Error('색상 저장 실패');
  return res.json();
}

// 보결 관련
export async function getFreeTeachers(dayOfWeek, period, applyDate) {
  const res = await fetch(
    `${BASE_URL}/api/timetable/free-teachers?dayOfWeek=${dayOfWeek}&period=${period}&applyDate=${encodeURIComponent(applyDate)}`
  );
  if (!res.ok) throw new Error('빈 교사 조회 실패');
  return res.json();
}

export async function saveSubstitute(data) {
  const res = await fetch(`${BASE_URL}/api/timetable/substitute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('보결 저장 실패');
  return res.json();
}

export async function clearSubstitute(data) {
  const res = await fetch(`${BASE_URL}/api/timetable/substitute`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('보결 해제 실패');
  return res.json();
}
