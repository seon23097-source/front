const BASE_URL = process.env.REACT_APP_API_URL || '';
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB (Cloudflare 100MB 제한 대응)

/** 파일 목록 조회 */
export const listDriveFiles = async (path = '/') => {
  const url = `${BASE_URL}/api/drive/files?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('파일 목록을 불러올 수 없습니다.');
  return res.json();
};

/** 브레드크럼 조회 */
export const getDriveBreadcrumb = async (path = '/') => {
  const url = `${BASE_URL}/api/drive/breadcrumb?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('경로를 불러올 수 없습니다.');
  return res.json();
};

/** 다운로드 URL 발급 (Seafile 직접) */
export const getDriveDownloadUrl = async (path) => {
  const url = `${BASE_URL}/api/drive/download-url?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('다운로드 링크를 가져올 수 없습니다.');
  const data = await res.json();
  return data.url;
};

/** 프록시 다운로드 URL (CORS 우회, zip용) */
export const getDriveProxyDownloadUrl = (path) =>
  `${BASE_URL}/api/drive/download?path=${encodeURIComponent(path)}`;

/** 업로드 링크 발급 */
const getUploadLink = async (path = '/') => {
  const url = `${BASE_URL}/api/drive/upload-link?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('업로드 링크 발급 실패');
  return res.json(); // { upload_url, token }
};

/**
 * 파일 업로드 — NAS2 직접 + chunked upload
 * Cloudflare 100MB 제한 우회를 위해 50MB 단위로 분할
 */
export const uploadDriveFile = async (file, path = '/', onProgress) => {
  const { upload_url, token } = await getUploadLink(path);

  if (file.size <= CHUNK_SIZE) {
    // ── 단일 업로드 ─────────────────────────────────────
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', upload_url);
      xhr.setRequestHeader('Authorization', `Token ${token}`);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress)
          onProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve({});
        else reject(new Error(`업로드 실패 (${xhr.status})`));
      });
      xhr.addEventListener('error', () => reject(new Error('네트워크 오류')));
      xhr.timeout = 5 * 60 * 1000;

      const fd = new FormData();
      fd.append('parent_dir', '/');  // rootPath 기준 (서버에서 fullPath 처리됨)
      fd.append('file', file);
      xhr.send(fd);
    });
  }

  // ── Chunked 업로드 (50MB 단위) ──────────────────────────
  const apiUrl = upload_url
    .replace('/upload-aj/', '/upload-api/')
    .replace(/\/upload\/$/, '/upload-api/');
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  let uploaded = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl);
      xhr.setRequestHeader('Authorization', `Token ${token}`);
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`);
      xhr.setRequestHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.name)}"`,
      );

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress)
          onProgress(Math.round(((uploaded + e.loaded) / totalSize) * 100));
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          uploaded = end;
          resolve();
        } else {
          reject(new Error(`Chunk ${i + 1}/${totalChunks} 실패 (${xhr.status})`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('네트워크 오류')));

      const fd = new FormData();
      fd.append('parent_dir', '/');
      fd.append('file', file.slice(start, end), file.name);
      xhr.send(fd);
    });
  }

  return {};
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

/** 이름 변경 */
export const renameDriveFile = async (path, name, isFolder = false) => {
  const res = await fetch(`${BASE_URL}/api/drive/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, name, isFolder }),
  });
  if (!res.ok) throw new Error('이름 변경에 실패했습니다.');
  return res.json();
};

/** 삭제 */
export const deleteDriveFile = async (path, isFolder = false) => {
  const res = await fetch(
    `${BASE_URL}/api/drive/entry?path=${encodeURIComponent(path)}&isFolder=${isFolder}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('삭제에 실패했습니다.');
};

/** 파일/폴더 이동 */
export const moveDriveFile = async (srcPath, dstDir, isFolder = false) => {
  const res = await fetch(`${BASE_URL}/api/drive/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ srcPath, dstDir, isFolder }),
  });
  if (!res.ok) throw new Error('이동에 실패했습니다.');
  return res.json();
};
