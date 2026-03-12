import { useState, useEffect } from 'react';

// ── localStorage ───────────────────────────────────────
const KEY_COLS  = 'sci2_cols';   // [{ id, label }]
const KEY_ROWS  = 'sci2_rows';   // [{ id, label }]
const KEY_CELLS = 'sci2_cells';  // { "rowId-colId": 0|1|2 }

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? def; } catch { return def; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// 상태값 → 표시
const STATUS = [
  { label: '',     bg: 'transparent',     color: 'transparent',  border: 'var(--border)' },
  { label: '사용중', bg: '#fef9c3',         color: '#92400e',       border: '#f59e0b' },
  { label: '완료',  bg: '#dcfce7',         color: '#166534',       border: '#22c55e' },
];
const STATUS_DARK = [
  { label: '',     bg: 'transparent',     color: 'transparent',  border: '#374151' },
  { label: '사용중', bg: '#422006',         color: '#fde68a',       border: '#d97706' },
  { label: '완료',  bg: '#052e16',         color: '#86efac',       border: '#16a34a' },
];

// ── 인라인 편집 input ──────────────────────────────────
function EditableLabel({ value, onSave, placeholder, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  if (!editing) {
    return (
      <span
        style={{ cursor: 'pointer', ...style }}
        title="클릭하여 수정"
        onDoubleClick={() => setEditing(true)}
      >
        {value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(val.trim()); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onSave(val.trim()); setEditing(false); }
        if (e.key === 'Escape') { setVal(value); setEditing(false); }
      }}
      style={{
        width: '100%', fontSize: 'inherit', fontWeight: 'inherit',
        border: '1.5px solid var(--accent)', borderRadius: 4,
        padding: '1px 4px', background: 'var(--surface)', color: 'var(--text)',
        ...style,
      }}
    />
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function SciencePanel({ adminMode }) {
  const [cols,  setCols]  = useState(() => load(KEY_COLS,  []));
  const [rows,  setRows]  = useState(() => load(KEY_ROWS,  []));
  const [cells, setCells] = useState(() => load(KEY_CELLS, {}));
  const [dark,  setDark]  = useState(() => document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark'));

  // 다크모드 감지
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.body.classList.contains('dark') ||
              document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const ST = dark ? STATUS_DARK : STATUS;

  // ── 열(단원/차시) 추가 ─────────────────────────────
  const addCol = () => {
    const id = Date.now();
    const next = [...cols, { id, label: '새 단원' }];
    setCols(next); save(KEY_COLS, next);
  };
  const updateCol = (id, label) => {
    const next = cols.map(c => c.id === id ? { ...c, label } : c);
    setCols(next); save(KEY_COLS, next);
  };
  const deleteCol = (id) => {
    const next = cols.filter(c => c.id !== id);
    setCols(next); save(KEY_COLS, next);
    const nextCells = Object.fromEntries(
      Object.entries(cells).filter(([k]) => !k.endsWith(`-${id}`))
    );
    setCells(nextCells); save(KEY_CELLS, nextCells);
  };

  // ── 행(학반) 추가 ──────────────────────────────────
  const addRow = () => {
    const id = Date.now();
    const next = [...rows, { id, label: '새 반' }];
    setRows(next); save(KEY_ROWS, next);
  };
  const updateRow = (id, label) => {
    const next = rows.map(r => r.id === id ? { ...r, label } : r);
    setRows(next); save(KEY_ROWS, next);
  };
  const deleteRow = (id) => {
    const next = rows.filter(r => r.id !== id);
    setRows(next); save(KEY_ROWS, next);
    const nextCells = Object.fromEntries(
      Object.entries(cells).filter(([k]) => !k.startsWith(`${id}-`))
    );
    setCells(nextCells); save(KEY_CELLS, nextCells);
  };

  // ── 셀 클릭 → 0→1→2→0 순환 ────────────────────────
  const cycleCell = (rowId, colId) => {
    const key = `${rowId}-${colId}`;
    const next = { ...cells, [key]: ((cells[key] || 0) + 1) % 3 };
    setCells(next); save(KEY_CELLS, next);
  };

  const cellVal = (rowId, colId) => cells[`${rowId}-${colId}`] || 0;

  // ── 전체 초기화 (관리자만) ─────────────────────────
  const resetAll = () => {
    if (!window.confirm('모든 데이터(행·열·셀)를 초기화할까요?')) return;
    setCols([]); setCells([]); setRows([]);
    save(KEY_COLS, []); save(KEY_ROWS, []); save(KEY_CELLS, {});
  };

  return (
    <div className="sci2-panel">
      {/* ── 헤더 ─────────────────────────────── */}
      <div className="sci2-header">
        <span className="sci2-title">🔬 과학준비물 현황</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {adminMode && (
            <>
              <button className="sci2-btn sci2-btn-add" onClick={addRow}>＋ 반 추가</button>
              <button className="sci2-btn sci2-btn-add" onClick={addCol}>＋ 단원 추가</button>
              <button className="sci2-btn sci2-btn-reset" onClick={resetAll}>초기화</button>
            </>
          )}
        </div>
      </div>

      {/* ── 범례 ─────────────────────────────── */}
      <div className="sci2-legend">
        {STATUS.slice(1).map((s, i) => (
          <span key={i} className="sci2-legend-item"
            style={{ background: ST[i+1].bg, color: ST[i+1].color, border: `1.5px solid ${ST[i+1].border}` }}>
            {s.label}
          </span>
        ))}
        <span className="sci2-legend-tip">셀 클릭: 빈칸 → 사용중 → 완료 → 빈칸</span>
      </div>

      {/* ── 표 ───────────────────────────────── */}
      {cols.length === 0 && rows.length === 0 ? (
        <div className="sci2-empty">
          {adminMode
            ? '상단의 "＋ 반 추가"와 "＋ 단원 추가"로 표를 구성하세요.'
            : '아직 등록된 데이터가 없습니다.'}
        </div>
      ) : (
        <div className="sci2-table-wrap">
          <table className="sci2-table">
            <thead>
              <tr>
                {/* 빈 코너 */}
                <th className="sci2-th-corner">학반 \ 단원</th>
                {cols.map(col => (
                  <th key={col.id} className="sci2-th-col">
                    <div className="sci2-th-inner">
                      {adminMode ? (
                        <>
                          <EditableLabel
                            value={col.label}
                            onSave={v => updateCol(col.id, v || col.label)}
                            placeholder="단원명"
                            style={{ fontSize: 12, fontWeight: 700 }}
                          />
                          <button className="sci2-del-btn" onClick={() => deleteCol(col.id)} title="열 삭제">✕</button>
                        </>
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="sci2-td-row">
                    <div className="sci2-th-inner">
                      {adminMode ? (
                        <>
                          <EditableLabel
                            value={row.label}
                            onSave={v => updateRow(row.id, v || row.label)}
                            placeholder="학반"
                            style={{ fontSize: 12, fontWeight: 700 }}
                          />
                          <button className="sci2-del-btn" onClick={() => deleteRow(row.id)} title="행 삭제">✕</button>
                        </>
                      ) : (
                        <span>{row.label}</span>
                      )}
                    </div>
                  </td>
                  {cols.map(col => {
                    const v = cellVal(row.id, col.id);
                    const s = ST[v];
                    return (
                      <td key={col.id}
                        className="sci2-td-cell"
                        onClick={() => cycleCell(row.id, col.id)}
                        style={{
                          background: s.bg,
                          color: s.color,
                          border: `1.5px solid ${s.border}`,
                          cursor: 'pointer',
                        }}
                        title={`${row.label} × ${col.label}`}
                      >
                        <span className="sci2-cell-label">{s.label}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
