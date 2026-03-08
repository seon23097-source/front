import { useState } from 'react';
import Timetable from './components/Timetable';
import AdminPanel from './components/AdminPanel';
import ResourcesPanel from './components/ResourcesPanel';
import DeadlineBoard from './components/DeadlineBoard';
import NoticeBoard from './components/NoticeBoard';
import ChatRoom from './components/ChatRoom';
import './App.css';

export default function App() {
  const [adminMode, setAdminMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('schosche_dark') === '1');

  // 다크모드 적용
  const toggleDark = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('schosche_dark', next ? '1' : '0');
      return next;
    });
  };
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [weekOffset, setWeekOffset] = useState(0);

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
    <div className={`app${darkMode ? " dark" : ""}`}>
      <header className="app-header">
        <div className="header-left">
          <nav className="header-tabs">
            <button
              className={`header-tab${activeTab === 'home' ? ' active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              🏠 홈
            </button>
            <button
              className={`header-tab${activeTab === 'timetable' ? ' active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              📋 통합시간표
            </button>
          </nav>
        </div>

        <div className="header-right">
          <button
            className="dark-toggle-btn"
            onClick={toggleDark}
            title={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {adminMode ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="admin-badge active" onClick={() => setShowAdminPanel(true)}>
                ⚙️ 관리자 메뉴
              </button>
              <button className="admin-badge active" onClick={() => setAdminMode(false)}>
                ✏️ 편집 모드 <span className="badge-off">종료</span>
              </button>
            </div>
          ) : (
            <button className="admin-badge" onClick={() => setShowAdminPrompt(true)}>
              🔒 관리자 편집
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'home' && (
          <div className="home-layout">
            {/* 좌측: 제출마감(상) + 공지안내장(하) */}
            <div className="home-left">
              <div className="home-panel">
                <DeadlineBoard adminMode={adminMode} />
              </div>
              <div className="home-panel">
                <NoticeBoard adminMode={adminMode} />
              </div>
            </div>

            {/* 가운데: 채팅방 */}
            <div className="home-center">
              <ChatRoom />
            </div>

            {/* 우측: 학년자료실 */}
            <div className="home-right">
              <ResourcesPanel adminMode={adminMode} />
            </div>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="timetable-fullscreen">
            <Timetable adminMode={adminMode} onWeekOffsetChange={setWeekOffset} />
          </div>
        )}
      </main>

      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}

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
