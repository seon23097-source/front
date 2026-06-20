// 4개 컴포넌트에서 중복되던 삭제 확인 모달을 공용화한 컴포넌트.
// zIndex는 선택값 — Timetable처럼 다른 모달 위에 띄워야 할 때만 전달한다.
export default function ConfirmModal({ message, onConfirm, onCancel, zIndex }) {
  return (
    <div className="modal-backdrop" onClick={onCancel} style={zIndex ? { zIndex } : undefined}>
      <div className="modal-box confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span className="modal-class">삭제 확인</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className="modal-footer">
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onCancel}>취소</button>
          <button className="btn-delete" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
            onClick={onConfirm}>🗑️ 삭제</button>
        </div>
      </div>
    </div>
  );
}
