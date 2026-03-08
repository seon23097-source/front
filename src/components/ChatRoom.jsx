import { useState, useEffect, useRef } from 'react';

const NAME_KEY   = 'schosche_chat_name';
const MSG_KEY    = 'schosche_chat_messages';
const ONLINE_KEY = 'schosche_chat_online';
const HEARTBEAT_INTERVAL = 8000;   // 8초마다 heartbeat
const ONLINE_TIMEOUT     = 20000;  // 20초 응답 없으면 오프라인

function loadMessages() {
  try { return JSON.parse(localStorage.getItem(MSG_KEY) || '[]'); }
  catch { return []; }
}
function saveMessages(msgs) {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs.slice(-200))); // 최대 200개
  window.dispatchEvent(new Event('chatUpdated'));
}
function loadOnline() {
  try { return JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}'); }
  catch { return {}; }
}
function saveOnline(data) {
  localStorage.setItem(ONLINE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('chatOnlineUpdated'));
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// 이름 설정 모달
function NameModal({ current, onSave }) {
  const [val, setVal] = useState(current || '');
  return (
    <div className="modal-backdrop">
      <div className="modal-box pw-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-class">이름 설정</span>
        </div>
        <div className="modal-body">
          <label>
            채팅에서 사용할 이름
            <input
              type="text"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && val.trim() && onSave(val.trim())}
              placeholder="이름 입력 (최대 8자)"
              maxLength={8}
              autoFocus
            />
          </label>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button
            className="btn-save"
            onClick={() => val.trim() && onSave(val.trim())}
            disabled={!val.trim()}
          >확인</button>
        </div>
      </div>
    </div>
  );
}

export default function ChatRoom() {
  const [messages, setMessages]     = useState(loadMessages);
  const [name, setName]             = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [text, setText]             = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [onlineUsers, setOnlineUsers]     = useState({});
  const bottomRef  = useRef(null);
  const myId = useRef(Math.random().toString(36).slice(2)); // 탭별 고유 ID

  // 이름 미설정 시 최초 1회 모달
  useEffect(() => {
    if (!localStorage.getItem(NAME_KEY)) setShowNameModal(true);
  }, []);

  // 메시지 변경 감지 (다른 탭/브라우저)
  useEffect(() => {
    const refresh = () => setMessages(loadMessages());
    window.addEventListener('chatUpdated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('chatUpdated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // 접속자 heartbeat
  useEffect(() => {
    if (!name) return;
    const beat = () => {
      const online = loadOnline();
      online[myId.current] = { name, ts: Date.now() };
      saveOnline(online);
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => {
      clearInterval(timer);
      const online = loadOnline();
      delete online[myId.current];
      saveOnline(online);
    };
  }, [name]);

  // 접속자 목록 갱신
  useEffect(() => {
    const refresh = () => {
      const online = loadOnline();
      const now = Date.now();
      const active = {};
      Object.entries(online).forEach(([id, info]) => {
        if (now - info.ts < ONLINE_TIMEOUT) active[id] = info;
      });
      setOnlineUsers(active);
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('chatOnlineUpdated', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('chatOnlineUpdated', refresh);
    };
  }, []);

  // 스크롤 하단 유지
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveName = (newName) => {
    setName(newName);
    localStorage.setItem(NAME_KEY, newName);
    setShowNameModal(false);
  };

  const handleSend = () => {
    if (!text.trim() || !name) return;
    const msgs = loadMessages();
    const newMsg = { id: Date.now(), sender: name, text: text.trim(), ts: Date.now(), myId: myId.current };
    saveMessages([...msgs, newMsg]);
    setMessages([...msgs, newMsg]);
    setText('');
  };

  const activeUsers = Object.values(onlineUsers);
  const otherUsers = activeUsers.filter(u => u.name !== name);

  return (
    <>
      <div className="chat-panel">
        <div className="chat-header">
          <span style={{ fontSize: 16 }}>💬</span>
          <span className="chat-title">선생님 채팅방</span>
          <div className="chat-online-wrap">
            {activeUsers.length > 0 && (
              <span className="chat-online">● {activeUsers.length}명 접속중</span>
            )}
          </div>
          <button
            className="chat-name-btn"
            onClick={() => setShowNameModal(true)}
            title="이름 변경"
          >
            👤 {name || '이름 설정'}
          </button>
        </div>

        {/* 접속자 목록 */}
        {activeUsers.length > 0 && (
          <div className="chat-online-list">
            {activeUsers.map((u, i) => (
              <span key={i} className={`chat-online-chip${u.name === name ? ' me' : ''}`}>
                {u.name === name ? '🟢 나' : `🔵 ${u.name}`}
              </span>
            ))}
          </div>
        )}

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>
              첫 메시지를 보내보세요 👋
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.myId === myId.current || msg.sender === name;
            return (
              <div key={msg.id} className={`chat-msg ${isMe ? 'mine' : 'theirs'}`}>
                {!isMe && <div className="chat-msg-sender">{msg.sender}</div>}
                <div className="chat-msg-bubble">{msg.text}</div>
                <div className="chat-msg-time">{formatTime(msg.ts)}</div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="chat-text-input"
            placeholder={name ? `${name}(으)로 전송...` : '이름을 먼저 설정하세요'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={!name}
            maxLength={300}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!text.trim() || !name}
          >전송</button>
        </div>
      </div>

      {showNameModal && <NameModal current={name} onSave={handleSaveName} />}
    </>
  );
}
