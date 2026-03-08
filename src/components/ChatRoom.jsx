import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const NAME_KEY = 'schosche_chat_name';
const WS_URL = (process.env.REACT_APP_API_URL || '').replace(/^http/, 'ws') || '';

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

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
          <button className="btn-save" onClick={() => val.trim() && onSave(val.trim())} disabled={!val.trim()}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatRoom() {
  const [messages, setMessages]         = useState([]);
  const [name, setName]                 = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [text, setText]                 = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [connected, setConnected]       = useState(false);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const nameRef   = useRef(name); // 클로저에서 최신 name 참조용

  useEffect(() => { nameRef.current = name; }, [name]);

  // ── 소켓 연결 ──────────────────────────────────────
  useEffect(() => {
    const socket = io(
      (process.env.REACT_APP_API_URL || window.location.origin) + '/chat',
      { transports: ['websocket', 'polling'], withCredentials: true }
    );
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // join은 아래 useEffect에서 처리
    });

    socket.on('disconnect', () => setConnected(false));

    // 접속 시 기존 메시지 히스토리
    socket.on('history', (msgs) => setMessages(msgs));

    // 새 메시지 수신
    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg].slice(-200));
    });

    // 접속자 목록 갱신
    socket.on('onlineUsers', (users) => setOnlineUsers(users));

    return () => socket.disconnect();
  }, []);

  // 연결되면 저장된 이름으로 join (이름 있을 때만)
  useEffect(() => {
    if (connected) {
      const savedName = localStorage.getItem(NAME_KEY);
      if (savedName) socketRef.current?.emit('join', { name: savedName });
    }
  }, [connected]);

  // 이름 미설정 시 최초 모달
  useEffect(() => {
    if (!localStorage.getItem(NAME_KEY)) setShowNameModal(true);
  }, []);

  // 스크롤 하단 유지
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveName = useCallback((newName) => {
    const socket = socketRef.current;
    if (!socket) return;
    const isFirst = !name;
    setName(newName);
    localStorage.setItem(NAME_KEY, newName);
    setShowNameModal(false);
    // connected useEffect가 join을 처리하므로 여기선 rename만
    if (!isFirst) {
      socket.emit('rename', { name: newName });
    }
    // isFirst이고 이미 connected면 join 전송
    if (isFirst && connected) {
      socket.emit('join', { name: newName });
    }
  }, [name, connected]);

  const handleSend = useCallback(() => {
    const socket = socketRef.current;
    if (!text.trim() || !name || !socket) return;
    socket.emit('message', { sender: name, text: text.trim() });
    setText('');
  }, [text, name]);

  const mySocketId = socketRef.current?.id;

  return (
    <>
      <div className="chat-panel">
        <div className="chat-header">
          <span style={{ fontSize: 16 }}>💬</span>
          <span className="chat-title">선생님 채팅방</span>
          <div className="chat-online-wrap">
            {onlineUsers.length > 0 && (
              <span className="chat-online">● {onlineUsers.length}명 접속중</span>
            )}
            {!connected && (
              <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>● 연결 끊김</span>
            )}
          </div>
          <button className="chat-name-btn" onClick={() => setShowNameModal(true)} title="이름 변경">
            👤 {name || '이름 설정'}
          </button>
        </div>

        {/* 접속자 목록 */}
        {onlineUsers.length > 0 && (
          <div className="chat-online-list">
            {onlineUsers.map((u) => (
              <span key={u.socketId} className={`chat-online-chip${u.socketId === mySocketId ? ' me' : ''}`}>
                {u.socketId === mySocketId ? '🟢 나' : `🔵 ${u.name}`}
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
            const isMe = msg.sender === name;
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
            disabled={!name || !connected}
            maxLength={300}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!text.trim() || !name || !connected}
          >전송</button>
        </div>
      </div>

      {showNameModal && <NameModal current={name} onSave={handleSaveName} />}
    </>
  );
}
