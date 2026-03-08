import { useState, useEffect, useRef } from 'react';

const SAMPLE_MSGS = [
  { id: 1, sender: '김선생', text: '안녕하세요! 오늘 시간표 확인했습니다 😊', time: '09:12', mine: false },
  { id: 2, sender: '나', text: '네, 확인했어요. 4교시 변경사항 있나요?', time: '09:14', mine: true },
  { id: 3, sender: '이선생', text: '4교시는 동일합니다!', time: '09:15', mine: false },
];

function formatTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatRoom() {
  const [messages, setMessages] = useState(SAMPLE_MSGS);
  const [name, setName] = useState('나');
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !name.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: name,
      text: text.trim(),
      time: formatTime(),
      mine: true,
    }]);
    setText('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span style={{ fontSize: 16 }}>💬</span>
        <span className="chat-title">선생님 채팅방</span>
        <span className="chat-online">● 온라인</span>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.mine ? 'mine' : 'theirs'}`}>
            {!msg.mine && <div className="chat-msg-sender">{msg.sender}</div>}
            <div className="chat-msg-bubble">{msg.text}</div>
            <div className="chat-msg-time">{msg.time}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-name-input"
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={8}
        />
        <input
          className="chat-text-input"
          placeholder="메시지 입력..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          maxLength={300}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()}>전송</button>
      </div>
    </div>
  );
}
