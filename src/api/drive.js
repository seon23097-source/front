const BASE_URL = process.env.REACT_APP_API_URL || '';

/** 파일 목록 조회 (path 기반) */
export const listDriveFiles = async (path = '/') => {
  const url = `${BASE_URL}/api/drive/files?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('파일 목록을 불러올 수 없습니다.');
  return res.json();
};

/** 브레드크럼 조회 (path 기반, 서버에서 자동 생성) */
export const getDriveBreadcrumb = async (path = '/') => {
  const url = `${BASE_URL}/api/drive/breadcrumb?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('경로를 불러올 수 없습니다.');
  return res.json();
};

/** 다운로드 URL 발급 (Seafile 직접 다운로드 링크) */
export const getDriveDownloadUrl = async (path) => {
  const url = `${BASE_URL}/api/drive/download-url?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('다운로드 링크를 가져올 수 없습니다.');
  const data = await res.json();
  return data.url;
};

/** 프록시 다운로드 URL (CORS 우회, zip 다운로드 등에 사용) */
export const getDriveProxyDownloadUrl = (path) =>
  `${BASE_URL}/api/drive/download?path=${encodeURIComponent(path)}`;

/** 파일 업로드 (진행률 콜백 지원) */
export const uploadDriveFile = (file, path = '/', onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

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
export const createDriveFolder = async (name, parentPath = '/') => {
  const res = await fetch(`${BASE_URL}/api/drive/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path: parentPath }),
  });
  if (!res.ok) throw new Error('폴더 생성에 실패했습니다.');
  return res.json();
};

/** 이름 변경 (path 기반) */
export const renameDriveFile = async (path, name) => {
  const res = await fetch(`${BASE_URL}/api/drive/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, name }),
  });
  if (!res.ok) throw new Error('이름 변경에 실패했습니다.');
  return res.json();
};

/** 삭제 (path 기반) */
export const deleteDriveFile = async (path) => {
  const res = await fetch(
    `${BASE_URL}/api/drive/entry?path=${encodeURIComponent(path)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('삭제에 실패했습니다.');
};
