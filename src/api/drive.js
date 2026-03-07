const BASE_URL = process.env.REACT_APP_API_URL || '';

/** 파일 목록 조회 */
export const listDriveFiles = async (folderId = '') => {
  const url = `${BASE_URL}/api/drive/files${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('파일 목록을 불러올 수 없습니다.');
  return res.json();
};

/** 브레드크럼 조회 */
export const getDriveBreadcrumb = async (folderId = '') => {
  const url = `${BASE_URL}/api/drive/breadcrumb${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('경로를 불러올 수 없습니다.');
  return res.json();
};

/** 다운로드 URL 반환 (직접 이동) */
export const getDriveDownloadUrl = (fileId) =>
  `${BASE_URL}/api/drive/download/${fileId}`;

/** 파일 업로드 */
export const uploadDriveFile = async (file, folderId = '') => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  const res = await fetch(`${BASE_URL}/api/drive/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('업로드에 실패했습니다.');
  return res.json();
};

/** 폴더 생성 */
export const createDriveFolder = async (name, parentFolderId = '') => {
  const res = await fetch(`${BASE_URL}/api/drive/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentFolderId }),
  });
  if (!res.ok) throw new Error('폴더 생성에 실패했습니다.');
  return res.json();
};

/** 이름 변경 */
export const renameDriveFile = async (fileId, name) => {
  const res = await fetch(`${BASE_URL}/api/drive/${fileId}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('이름 변경에 실패했습니다.');
  return res.json();
};

/** 삭제 */
export const deleteDriveFile = async (fileId) => {
  const res = await fetch(`${BASE_URL}/api/drive/${fileId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('삭제에 실패했습니다.');
};
