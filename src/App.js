import { useState } from 'react';
import Timetable from './components/Timetable';
import './App.css';

export default function App() {
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [pwError, setPwError] = useState(false);

  const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'teacher2024';

  const handleAdminLogin = () => {
    if (adminPw === ADMIN_PASSWORD) {
      setAdminMode(true);
      setShowAdminPrompt(false);
      setAdminPw('');
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="logo-icon">📅</span>
            <span className="logo-text">4학년 통합시간표</span>
          </div>
          <span className="header-sub">4-1 ~ 4-9 · 전담교사</span>
        </div>
        <div className="header-right">
          {adminMode ? (
            <button className="admin-badge active" onClick={() => setAdminMode(false)}>
              ✏️ 편집 모드 <span className="badge-off">종료</span>
            </button>
          ) : (
            <button className="admin-badge" onClick={() => setShowAdminPrompt(true)}>
              🔒 관리자 편집
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <Timetable adminMode={adminMode} />
      </main>

      {/* Admin password modal */}
      {showAdminPrompt && (
        <div className="modal-backdrop" onClick={() => { setShowAdminPrompt(false); setPwError(false); }}>
          <div className="modal-box pw-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-class">관리자 인증</span>
              <button className="modal-close" onClick={() => setShowAdminPrompt(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>
                비밀번호
                <input
                  type="password"
                  value={adminPw}
                  onChange={e => { setAdminPw(e.target.value); setPwError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="관리자 비밀번호 입력"
                  autoFocus
                />
              </label>
              {pwError && <p className="pw-error">비밀번호가 올바르지 않습니다.</p>}
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button className="btn-cancel" onClick={() => setShowAdminPrompt(false)}>취소</button>
              <button className="btn-save" onClick={handleAdminLogin}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
