import { useState, useEffect, useCallback } from 'react';
import Timetable from './components/Timetable';
import AdminPanel from './components/AdminPanel';
import ResourcesPanel from './components/ResourcesPanel';
import DeadlineBoard from './components/DeadlineBoard';
import NoticeBoard from './components/NoticeBoard';
import ChatRoom from './components/ChatRoom';
import MeetingBoard from './components/MeetingBoard';
import SciencePanel from './components/SciencePanel';
import './App.css';
import { fetchNoticeItems, fetchBoardNotices, createNoticeItem, createBoardNotice, deleteNoticeItem, deleteBoardNotice } from './api/noticeApi';
import { _setItemsCache, loadNoticeItems } from './components/Timetable';

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
  // 구글 문서 탭 잠금
  const [gdocsUnlocked, setGdocsUnlocked] = useState(false);
  const [showGdocsPrompt, setShowGdocsPrompt] = useState(false);
  const [gdocsPw, setGdocsPw] = useState('');
  const [gdocsPwError, setGdocsPwError] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [weekOffset, setWeekOffset] = useState(0);

  // ── 공유 데이터: App에서 한 번만 fetch ──────────────
  const [noticeItems, setNoticeItems] = useState([]);
  const [boardNotices, setBoardNotices] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const reloadNoticeItems = useCallback(async () => {
    const data = await fetchNoticeItems();
    if (data) { _setItemsCache(data, true); setNoticeItems(data); }
  }, []);

  const reloadBoardNotices = useCallback(async () => {
    const data = await fetchBoardNotices();
    if (data) setBoardNotices(data);
  }, []);

  useEffect(() => {
    Promise.all([reloadNoticeItems(), reloadBoardNotices()])
      .finally(() => setDataLoaded(true));
    // Timetable에서 안내장/제출마감 등록·삭제 시 갱신
    window.addEventListener('timetableItemsChanged', reloadNoticeItems);
    return () => window.removeEventListener('timetableItemsChanged', reloadNoticeItems);
  }, [reloadNoticeItems]);

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
          <button
            className="dark-toggle-btn"
            onClick={toggleDark}
            title={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
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
            <button
              className={`header-tab${activeTab === 'googledoc' ? ' active' : ''}`}
              onClick={() => gdocsUnlocked ? setActiveTab('googledoc') : setShowGdocsPrompt(true)}
            >
              📊 학교 구글 문서{!gdocsUnlocked && ' 🔒'}
            </button>
            <button
              className={`header-tab${activeTab === 'meeting' ? ' active' : ''}`}
              onClick={() => setActiveTab('meeting')}
            >
              🤝 업무협의
            </button>
            <button
              className={`header-tab${activeTab === 'science' ? ' active' : ''}`}
              onClick={() => setActiveTab('science')}
            >
              🔬 과학준비물
            </button>
          </nav>
        </div>

        <div className="header-right">
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
                <DeadlineBoard adminMode={adminMode} noticeItems={noticeItems} onReload={reloadNoticeItems} />
              </div>
              <div className="home-panel">
                <NoticeBoard adminMode={adminMode} boardNotices={boardNotices} noticeItems={noticeItems} onReloadBoard={reloadBoardNotices} />
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

        {activeTab === 'googledoc' && (
          <div className="embed-fullscreen">
            <iframe
              src="https://docs.google.com/spreadsheets/d/1u6pdr7t3E7CbrmEVqUmessggHKYQjg6cB6i2W2yi85k/edit?gid=810467711#gid=810467711&rm=minimal"
              title="학교 구글 문서"
              className="embed-iframe"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        )}

        {activeTab === 'meeting' && (
          <div className="meeting-fullscreen">
            <MeetingBoard adminMode={adminMode} />
          </div>
        )}

        {activeTab === 'science' && (
          <div className="science-fullscreen">
            <SciencePanel adminMode={adminMode} />
          </div>
        )}

        {/* 과학준비물 탭 활성화됨 */}
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

      {/* ── 구글 문서 잠금 모달 ── */}
      {showGdocsPrompt && (
        <div className="modal-backdrop" onClick={() => { setShowGdocsPrompt(false); setGdocsPw(''); setGdocsPwError(false); }}>
          <div className="modal-box pw-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-class">🔒 학교 구글 문서</span>
              <button className="modal-close" onClick={() => { setShowGdocsPrompt(false); setGdocsPw(''); setGdocsPwError(false); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>개인정보가 포함된 문서입니다. 비밀번호를 입력하세요.</p>
              <label>
                비밀번호
                <input
                  type="password"
                  value={gdocsPw}
                  onChange={e => { setGdocsPw(e.target.value); setGdocsPwError(false); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (gdocsPw === process.env.REACT_APP_ADMIN_PASSWORD) {
                        setGdocsUnlocked(true);
                        setActiveTab('googledoc');
                        setShowGdocsPrompt(false);
                        setGdocsPw('');
                      } else {
                        setGdocsPwError(true);
                      }
                    }
                  }}
                  placeholder="비밀번호 입력"
                  autoFocus
                />
              </label>
              {gdocsPwError && <p className="pw-error">비밀번호가 올바르지 않습니다.</p>}
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button className="btn-cancel" onClick={() => { setShowGdocsPrompt(false); setGdocsPw(''); setGdocsPwError(false); }}>취소</button>
              <button className="btn-save" onClick={() => {
                if (gdocsPw === process.env.REACT_APP_ADMIN_PASSWORD) {
                  setGdocsUnlocked(true);
                  setActiveTab('googledoc');
                  setShowGdocsPrompt(false);
                  setGdocsPw('');
                } else {
                  setGdocsPwError(true);
                }
              }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
