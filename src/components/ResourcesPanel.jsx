import { useState, useEffect, useRef, useCallback } from 'react';
import {
  listDriveFiles, getDriveBreadcrumb, getDriveDownloadUrl,
  getDriveProxyDownloadUrl,
  uploadDriveFile, createDriveFolder, renameDriveFile, deleteDriveFile,
  moveDriveFile,
} from '../api/drive';

// ── 파일 아이콘 ──────────────────────────────────────────
function FileIcon({ mimeType, isFolder, size = 32 }) {
  if (isFolder) return <span className="res-icon res-icon-folder" style={{ fontSize: size }}>📁</span>;
  const ext = {
    'application/pdf': '📄',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📑',
    'application/vnd.ms-powerpoint': '📑',
    'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/gif': '🖼️', 'image/webp': '🖼️',
    'video/mp4': '🎬', 'video/quicktime': '🎬',
    'audio/mpeg': '🎵', 'audio/wav': '🎵',
    'application/zip': '🗜️', 'application/x-zip-compressed': '🗜️',
    'text/plain': '📃',
    'application/x-hwp': '📝',
  };
  return <span className="res-icon" style={{ fontSize: size }}>{ext[mimeType] || '📄'}</span>;
}

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// ── 컨텍스트 메뉴 ────────────────────────────────────────
function ContextMenu({ x, y, item, onDownload, onRename, onDelete, onCut, onClose }) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div className="res-context-menu" style={{ top: y, left: x }} onClick={e => e.stopPropagation()}>
      {!item.isFolder && (
        <button onClick={() => { onDownload(item); onClose(); }}>⬇️ 다운로드</button>
      )}
      <button onClick={() => { onCut(item); onClose(); }}>✂️ 잘라내기</button>
      <button onClick={() => { onRename(item); onClose(); }}>✏️ 이름 변경</button>
      <div className="res-ctx-divider" />
      <button className="res-ctx-danger" onClick={() => { onDelete(item); onClose(); }}>🗑️ 삭제</button>
    </div>
  );
}

// ── 비밀번호 잠금 ────────────────────────────────────────
const RESOURCES_PW = process.env.REACT_APP_ADMIN_PASSWORD || 'teacher2024';
const SESSION_KEY = 'schosche_resources_unlocked';

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const tryUnlock = () => {
    if (pw === RESOURCES_PW) { sessionStorage.setItem(SESSION_KEY, '1'); onUnlock(); }
    else { setError(true); setPw(''); setTimeout(() => setError(false), 1500); }
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16 }}>
      <div style={{ fontSize:40 }}>🔒</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>학년자료실</div>
      <div style={{ fontSize:13, color:'var(--text-muted)' }}>접근하려면 비밀번호를 입력하세요.</div>
      <div style={{ display:'flex', gap:8 }}>
        <input type="password" value={pw} placeholder="비밀번호"
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && tryUnlock()} autoFocus
          style={{ padding:'8px 12px', borderRadius:8, fontSize:14, border:`1.5px solid ${error?'var(--danger)':'var(--border)'}`, background:'var(--surface)', color:'var(--text)', outline:'none', width:180 }}
        />
        <button onClick={tryUnlock} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>확인</button>
      </div>
      {error && <div style={{ fontSize:12, color:'var(--danger)' }}>비밀번호가 틀렸습니다.</div>}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function ResourcesPanel({ adminMode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <ResourcesPanelInner adminMode={adminMode} />;
}

function ResourcesPanelInner({ adminMode }) {
  const [files, setFiles] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([{ id: '', name: '학년자료실' }]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clipboard, setClipboard] = useState(null); // { item, srcDir } — 잘라내기 버퍼
  const fileInputRef = useRef(null);

  const loadFiles = useCallback(async (path = currentPath) => {
    setLoading(true); setError(null);
    try {
      const [fileList, crumbs] = await Promise.all([
        listDriveFiles(path),
        getDriveBreadcrumb(path),
      ]);
      setFiles(fileList);
      setBreadcrumb(crumbs);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [currentPath]);

  useEffect(() => { loadFiles(currentPath); }, [currentPath]);

  const navigateTo = (path) => {
    setSelected(null);
    setCheckedIds(new Set());
    setCurrentPath(path || '/');
  };

  const handleItemDoubleClick = async (item) => {
    if (item.isFolder) { navigateTo(item.id); return; }
    try {
      const url = await getDriveDownloadUrl(item.id);
      window.open(url, '_blank');
    } catch (e) { alert('다운로드 실패: ' + e.message); }
  };

  const handleDownload = async (item) => {
    try {
      const url = await getDriveDownloadUrl(item.id);
      Object.assign(document.createElement('a'), { href: url, download: item.name, target: '_blank' }).click();
    } catch (e) { alert('다운로드 실패: ' + e.message); }
  };

  const toggleCheck = (e, itemId) => {
    e.stopPropagation();
    setCheckedIds(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });
  };

  const toggleCheckAll = () => {
    const allIds = fileItems.map(f => f.id);
    setCheckedIds(allIds.every(id => checkedIds.has(id)) ? new Set() : new Set(allIds));
  };

  const handleBulkDownload = async () => {
    const targets = fileItems.filter(f => checkedIds.has(f.id));
    if (!targets.length) return;
    if (targets.length === 1) { handleDownload(targets[0]); return; }
    try {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      document.head.appendChild(script);
      await new Promise((ok, fail) => { script.onload = ok; script.onerror = fail; });
      const zip = new window.JSZip();
      await Promise.all(targets.map(async (item) => {
        const res = await fetch(getDriveProxyDownloadUrl(item.id));
        zip.file(item.name, await res.blob());
      }));
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '학년자료실.zip'; a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { alert('zip 압축 오류: ' + e.message); }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault(); setSelected(item.id);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  // ── 이름 변경 ──────────────────────────────────────────
  const startRename = (item) => { setRenameItem(item); setRenameValue(item.name); };
  const commitRename = async () => {
    if (!renameValue.trim() || renameValue === renameItem.name) { setRenameItem(null); return; }
    try {
      await renameDriveFile(renameItem.id, renameValue.trim(), renameItem.isFolder);
      setRenameItem(null); loadFiles(currentPath);
    } catch (e) { alert(e.message); }
  };

  // ── 삭제 ──────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm(`"${item.name}"을(를) 삭제하시겠습니까?`)) return;
    try { await deleteDriveFile(item.id, item.isFolder); loadFiles(currentPath); }
    catch (e) { alert(e.message); }
  };

  // ── 잘라내기 / 붙여넣기 ────────────────────────────────
  const handleCut = (item) => {
    setClipboard({ item, srcDir: currentPath });
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    const { item, srcDir } = clipboard;
    if (srcDir === currentPath) { setClipboard(null); return; } // 같은 폴더면 무시
    try {
      await moveDriveFile(item.id, currentPath, item.isFolder);
      setClipboard(null);
      loadFiles(currentPath);
    } catch (e) { alert('이동 실패: ' + e.message); }
  };

  // ── 폴더 생성 ─────────────────────────────────────────
  const commitNewFolder = async () => {
    if (!newFolderName.trim()) { setNewFolderMode(false); return; }
    try {
      await createDriveFolder(newFolderName.trim(), currentPath);
      setNewFolderMode(false); setNewFolderName('');
      loadFiles(currentPath);
    } catch (e) { alert(e.message); }
  };

  // ── 업로드 (NAS2 직접 + chunked) ──────────────────────
  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true); setUploadProgress(0);
    try {
      const arr = Array.from(fileList);
      for (let i = 0; i < arr.length; i++) {
        await uploadDriveFile(arr[i], currentPath, (pct) => {
          setUploadProgress(Math.round(((i + pct / 100) / arr.length) * 100));
        });
      }
      loadFiles(currentPath);
    } catch (e) { alert(e.message); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  // ── 드래그앤드롭 ──────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files); };

  const folders = files.filter(f => f.isFolder);
  const fileItems = files.filter(f => !f.isFolder);

  return (
    <div className="resources-panel">
      {/* 헤더 */}
      <div className="resources-header">
        <div className="resources-header-left">
          <span className="resources-icon">📁</span>
          <span className="resources-title">학년자료실</span>
        </div>
        <div className="resources-header-actions">
          {clipboard && (
            <button className="res-btn" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={handlePaste} title={`"${clipboard.item.name}" 여기에 붙여넣기`}>
              📋 붙여넣기
            </button>
          )}
          {checkedIds.size > 0 && (
            <button className="res-btn" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={handleBulkDownload}>
              ⬇️ {checkedIds.size}개 다운로드
            </button>
          )}
          <button className="res-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⏳' : '⬆️'} 업로드
          </button>
          <button className="res-btn" onClick={() => { setNewFolderMode(true); setNewFolderName('새 폴더'); }}>
            📂 새 폴더
          </button>
          <button className="res-btn res-btn-refresh" onClick={() => loadFiles(currentPath)} title="새로고침">🔄</button>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
        </div>
      </div>

      {/* 클립보드 알림 */}
      {clipboard && (
        <div style={{ padding: '6px 14px', fontSize: 12, background: 'var(--accent-light, #e8f0fe)', color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✂️ <b>{clipboard.item.name}</b> 잘라냄</span>
          <span style={{ color: 'var(--text-muted)' }}>— 이동할 폴더에서 붙여넣기</span>
          <button onClick={() => setClipboard(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>✕ 취소</button>
        </div>
      )}

      {/* 브레드크럼 */}
      <div className="res-breadcrumb">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id ?? i} className="res-crumb">
            {i < breadcrumb.length - 1 ? (
              <>
                <button className="res-crumb-btn" onClick={() => navigateTo(crumb.id)}>{crumb.name}</button>
                <span className="res-crumb-sep">›</span>
              </>
            ) : (
              <span className="res-crumb-current">{crumb.name}</span>
            )}
          </span>
        ))}
      </div>

      {/* 파일 목록 */}
      <div
        className={`resources-body${isDragging ? ' res-drag-over' : ''}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        {loading ? (
          <div className="res-state-msg">불러오는 중...</div>
        ) : error ? (
          <div className="res-state-msg res-error">{error}</div>
        ) : files.length === 0 && !newFolderMode ? (
          <div className="res-state-msg res-empty">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            파일을 여기에 드래그하거나<br />업로드 버튼을 사용하세요.
          </div>
        ) : (
          <>
            {/* 컬럼 헤더 */}
            <div className="res-list-header">
              <span className="res-col-check">
                <input type="checkbox"
                  checked={fileItems.length > 0 && fileItems.every(f => checkedIds.has(f.id))}
                  onChange={toggleCheckAll} title="전체 선택" style={{ cursor: 'pointer' }}
                />
              </span>
              <span className="res-col-name">이름</span>
              <span className="res-col-date">수정일</span>
              <span className="res-col-size">크기</span>
            </div>

            {/* 상위 폴더 */}
            {breadcrumb.length > 1 && (
              <div className="res-list-row res-row-up" onDoubleClick={() => navigateTo(breadcrumb[breadcrumb.length - 2].id)}>
                <span className="res-row-icon">⬆️</span>
                <span className="res-row-name">..</span>
                <span className="res-col-date" />
                <span className="res-col-size" />
              </div>
            )}

            {/* 새 폴더 입력 */}
            {newFolderMode && (
              <div className="res-list-row res-row-new">
                <span className="res-row-icon">📁</span>
                <input className="res-inline-input" autoFocus value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') commitNewFolder(); if (e.key==='Escape') setNewFolderMode(false); }}
                  onBlur={commitNewFolder}
                />
                <span className="res-col-date" /><span className="res-col-size" />
              </div>
            )}

            {/* 폴더 */}
            {folders.map(item => (
              <div key={item.id}
                className={`res-list-row${selected===item.id?' res-selected':''}${clipboard?.item.id===item.id?' res-cut':''}`}
                onClick={() => setSelected(item.id)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={e => handleContextMenu(e, item)}
              >
                <span className="res-col-check" />
                <span className="res-row-icon">📁</span>
                {renameItem?.id === item.id ? (
                  <input className="res-inline-input" autoFocus value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') commitRename(); if (e.key==='Escape') setRenameItem(null); }}
                    onBlur={commitRename} onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="res-row-name">{item.name}</span>
                )}
                <span className="res-col-date">{formatDate(item.modifiedTime)}</span>
                <span className="res-col-size">-</span>
              </div>
            ))}

            {/* 파일 */}
            {fileItems.map(item => (
              <div key={item.id}
                className={`res-list-row${selected===item.id?' res-selected':''}${checkedIds.has(item.id)?' res-checked':''}${clipboard?.item.id===item.id?' res-cut':''}`}
                onClick={() => setSelected(item.id)}
                onDoubleClick={() => handleItemDoubleClick(item)}
                onContextMenu={e => handleContextMenu(e, item)}
              >
                <span className="res-col-check">
                  <input type="checkbox" checked={checkedIds.has(item.id)}
                    onChange={e => toggleCheck(e, item.id)} onClick={e => e.stopPropagation()} style={{ cursor:'pointer' }}
                  />
                </span>
                <span className="res-row-icon"><FileIcon mimeType={item.mimeType} isFolder={false} size={18} /></span>
                {renameItem?.id === item.id ? (
                  <input className="res-inline-input" autoFocus value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') commitRename(); if (e.key==='Escape') setRenameItem(null); }}
                    onBlur={commitRename} onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="res-row-name">{item.name}</span>
                )}
                <span className="res-col-date">{formatDate(item.modifiedTime)}</span>
                <span className="res-col-size">{formatSize(item.size)}</span>
              </div>
            ))}
          </>
        )}

        {isDragging && <div className="res-drag-overlay"><div>⬆️ 파일을 놓아 업로드</div></div>}
        {uploading && (
          <div className="res-drag-overlay">
            <div style={{ textAlign:'center' }}>
              <div style={{ marginBottom:10 }}>⏳ 업로드 중... {uploadProgress}%</div>
              <div style={{ width:220, height:8, background:'rgba(255,255,255,0.3)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${uploadProgress}%`, height:'100%', background:'#4caf50', borderRadius:4, transition:'width 0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} item={contextMenu.item}
          onDownload={handleDownload} onRename={startRename} onDelete={handleDelete}
          onCut={handleCut} onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
