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

/** 파일 업로드 (진행률 콜백 지원) */
export const uploadDriveFile = (file, folderId = '', onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({}); }
      } else {
        reject(new Error(`업로드에 실패했습니다. (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.')));
    xhr.addEventListener('timeout', () => reject(new Error('업로드 시간이 초과되었습니다.')));

    xhr.timeout = 5 * 60 * 1000; // 5분
    xhr.open('POST', `${BASE_URL}/api/drive/upload`);
    xhr.send(formData);
  });
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
