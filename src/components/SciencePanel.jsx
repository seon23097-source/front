import { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || '';

// ── API 헬퍼 ──────────────────────────────────────────
const sci = {
  getAll:     ()                   => fetch(`${API}/api/science/all`).then(r => r.json()),
  addCol:     (label)              => fetch(`${API}/api/science/cols`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ label }) }).then(r => r.json()),
  updateCol:  (id, label)          => fetch(`${API}/api/science/cols/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ label }) }),
  deleteCol:  (id)                 => fetch(`${API}/api/science/cols/${id}`, { method:'DELETE' }),
  addRow:     (label)              => fetch(`${API}/api/science/rows`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ label }) }).then(r => r.json()),
  updateRow:  (id, label)          => fetch(`${API}/api/science/rows/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ label }) }),
  deleteRow:  (id)                 => fetch(`${API}/api/science/rows/${id}`, { method:'DELETE' }),
  upsertCell: (rowId, colId, data) => fetch(`${API}/api/science/cells/${rowId}/${colId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
  deleteCell: (rowId, colId)       => fetch(`${API}/api/science/cells/${rowId}/${colId}`, { method:'DELETE' }),
};

// cells 배열 → { "rowId-colId": {...} } 맵으로 변환
function toCellMap(arr) {
  return arr.reduce((m, c) => { m[`${c.rowId}-${c.colId}`] = c; return m; }, {});
}

// ── 상태 ─────────────────────────────────────────────
const STATUS = [
  { label: '',      bg: 'transparent', color: 'transparent', border: 'var(--border)',  btnBg: 'var(--surface2)' },
  { label: '예약중', bg: '#fef9c3',    color: '#92400e',      border: '#f59e0b',        btnBg: '#f59e0b' },
  { label: '완료',  bg: '#dcfce7',    color: '#166534',      border: '#22c55e',        btnBg: '#22c55e' },
];
const STATUS_DARK = [
  { label: '',      bg: 'transparent', color: 'transparent', border: '#374151',        btnBg: '#1f2937' },
  { label: '예약중', bg: '#422006',    color: '#fde68a',      border: '#d97706',        btnBg: '#d97706' },
  { label: '완료',  bg: '#052e16',    color: '#86efac',      border: '#16a34a',        btnBg: '#16a34a' },
];

// ── 오늘 기준 7일 ──────────────────────────────────────
function getNext7Days() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return { month: d.getMonth() + 1, day: d.getDate() };
  });
}
function getMonthsIn7Days(days) {
  const seen = new Set();
  return days.filter(d => seen.has(d.month) ? false : seen.add(d.month));
}

// ── 인라인 편집 ────────────────────────────────────────
function EditableLabel({ value, onSave, placeholder, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  if (!editing) return (
    <span style={{ cursor: 'pointer', ...style }} onDoubleClick={() => setEditing(true)}
      title="더블클릭하여 수정">
      {value || <span style={{ opacity: 0.4 }}>{placeholder}</span>}
    </span>
  );
  return (
    <input autoFocus value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(val.trim()); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onSave(val.trim()); setEditing(false); }
        if (e.key === 'Escape') { setVal(value); setEditing(false); }
      }}
      style={{
        width: '100%', fontSize: 'inherit', fontWeight: 'inherit',
        border: '1.5px solid var(--accent)', borderRadius: 4,
        padding: '1px 4px', background: 'var(--surface)', color: 'var(--text)', ...style,
      }}
    />
  );
}

// ── 셀 컴포넌트 ───────────────────────────────────────
function SciCell({ cell, usedPeriods, ST, onChange }) {
  const days7 = getNext7Days();
  const months = getMonthsIn7Days(days7);
  const c = cell || { status: 0, month: '', day: '', period: '' };
  const s = ST[c.status || 0];

  const daysForMonth = c.month
    ? days7.filter(d => d.month === Number(c.month)).map(d => d.day)
    : [];

  const cycleStatus = () => onChange({ ...c, status: ((c.status || 0) + 1) % 3 });

  const setField = (field, val) => {
    const next = { ...c, [field]: val };
    if (field === 'month') next.day = '';
    onChange(next);
  };

  const selStyle = {
    fontSize: 10, padding: '1px 2px', borderRadius: 4,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)', cursor: 'pointer', flex: 1, minWidth: 0,
  };

  return (
    <div className="sci2-cell-inner" style={{ background: s.bg, borderColor: s.border }}>
      <div className="sci2-cell-selects">
        <select value={c.month || ''} style={selStyle}
          onChange={e => setField('month', e.target.value ? Number(e.target.value) : '')}>
          <option value="">월</option>
          {months.map(m => <option key={m.month} value={m.month}>{m.month}월</option>)}
        </select>
        <select value={c.day || ''} style={selStyle} disabled={!c.month}
          onChange={e => setField('day', e.target.value ? Number(e.target.value) : '')}>
          <option value="">일</option>
          {daysForMonth.map(d => <option key={d} value={d}>{d}일</option>)}
        </select>
        <select value={c.period || ''} style={selStyle}
          onChange={e => setField('period', e.target.value ? Number(e.target.value) : '')}>
          <option value="">교시</option>
          {[1,2,3,4,5,6].filter(p => !usedPeriods.has(p) || p === c.period).map(p => (
            <option key={p} value={p}>{p}교시</option>
          ))}
        </select>
      </div>
      <button className="sci2-status-btn" onClick={cycleStatus}
        style={{
          background: (c.status || 0) === 0 ? 'var(--surface2)' : s.btnBg,
          color: (c.status || 0) === 0 ? 'var(--text-muted)' : '#fff',
          borderColor: s.border,
        }}>
        {(c.status || 0) === 0 ? '·' : s.label}
      </button>
    </div>
  );
}

// ── 왼쪽 패널: 차시별 이용 계획 ──────────────────────
function LeftPanel({ cols, rows, cells }) {
  const statusDot = {
    0: { color: 'var(--border)', label: '' },
    1: { color: '#f59e0b',       label: '예약중' },
    2: { color: '#22c55e',       label: '완료' },
  };

  const plans = cols.map(col => {
    const entries = rows
      .map(row => {
        const c = cells[`${row.id}-${col.id}`];
        if (!c || !c.month || !c.day || !c.period) return null;
        return {
          rowLabel: row.label,
          month: c.month, day: c.day, period: c.period,
          status: c.status || 0,
          sortKey: c.month * 10000 + c.day * 100 + c.period,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.sortKey - b.sortKey);
    return { col, entries };
  }).filter(p => p.entries.length > 0);

  return (
    <div className="sci2-left-panel">
      <div className="sci2-left-title">📋 차시별 이용 계획</div>
      {plans.length === 0 ? (
        <div className="sci2-left-empty">오른쪽 표에 월·일·교시를<br />입력하면 자동 정리됩니다.</div>
      ) : (
        <div className="sci2-plan-list">
          {plans.map(({ col, entries }) => (
            <div key={col.id} className="sci2-plan-card">
              <div className="sci2-plan-card-title">{col.label}</div>
              <div className="sci2-plan-rows">
                {entries.map((e, i) => (
                  <div key={i} className="sci2-plan-row">
                    <span className="sci2-plan-dot" style={{ background: statusDot[e.status].color }} />
                    <span className="sci2-plan-date">{e.month}/{e.day}</span>
                    <span className="sci2-plan-period">{e.period}교시</span>
                    <span className="sci2-plan-class">{e.rowLabel}</span>
                    {e.status > 0 && (
                      <span className="sci2-plan-status" style={{ color: statusDot[e.status].color }}>
                        {statusDot[e.status].label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────
export default function SciencePanel({ adminMode }) {
  const [cols,    setCols]    = useState([]);
  const [rows,    setRows]    = useState([]);
  const [cells,   setCells]   = useState({});
  const [loading, setLoading] = useState(true);
  const [dark,    setDark]    = useState(() =>
    document.body.classList.contains('dark') ||
    document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.body.classList.contains('dark') ||
               document.documentElement.classList.contains('dark')));
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const data = await sci.getAll();
      setCols(data.cols || []);
      setRows(data.rows || []);
      setCells(toCellMap(data.cells || []));
    } catch (e) {
      console.error('과학준비물 데이터 로드 실패', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ST = dark ? STATUS_DARK : STATUS;

  // ── 열 ─────────────────────────────────────────────
  const addCol = async () => {
    const col = await sci.addCol('새 단원');
    setCols(prev => [...prev, col]);
  };
  const updateCol = async (id, label) => {
    await sci.updateCol(id, label);
    setCols(prev => prev.map(c => c.id === id ? { ...c, label } : c));
  };
  const deleteCol = async (id) => {
    await sci.deleteCol(id);
    setCols(prev => prev.filter(c => c.id !== id));
    setCells(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.endsWith(`-${id}`))));
  };

  // ── 행 ─────────────────────────────────────────────
  const addRow = async () => {
    const row = await sci.addRow('새 반');
    setRows(prev => [...prev, row]);
  };
  const updateRow = async (id, label) => {
    await sci.updateRow(id, label);
    setRows(prev => prev.map(r => r.id === id ? { ...r, label } : r));
  };
  const deleteRow = async (id) => {
    await sci.deleteRow(id);
    setRows(prev => prev.filter(r => r.id !== id));
    setCells(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${id}-`))));
  };

  // ── 셀 업데이트 (낙관적 업데이트) ──────────────────
  const updateCell = async (rowId, colId, val) => {
    const key = `${rowId}-${colId}`;
    setCells(prev => ({ ...prev, [key]: { ...prev[key], ...val, rowId, colId } }));
    await sci.upsertCell(rowId, colId, val);
  };

  const getUsedPeriods = (rowId, colId) => {
    const cur = cells[`${rowId}-${colId}`] || {};
    return new Set(
      rows
        .filter(r => r.id !== rowId)
        .map(r => cells[`${r.id}-${colId}`])
        .filter(c => c && c.month === cur.month && c.day === cur.day && c.period)
        .map(c => c.period)
    );
  };

  // ── 초기화 ─────────────────────────────────────────
  const resetAll = async () => {
    if (!window.confirm('모든 데이터를 초기화할까요?')) return;
    await Promise.all([
      ...cols.map(c => sci.deleteCol(c.id)),
      ...rows.map(r => sci.deleteRow(r.id)),
    ]);
    setCols([]); setRows([]); setCells({});
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)' }}>
      불러오는 중...
    </div>
  );

  return (
    <div className="sci2-panel">
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

      <div className="sci2-legend">
        {STATUS.slice(1).map((s, i) => (
          <span key={i} className="sci2-legend-item"
            style={{ background: ST[i+1].bg, color: ST[i+1].color, border: `1.5px solid ${ST[i+1].border}` }}>
            {s.label}
          </span>
        ))}
        <span className="sci2-legend-tip">버튼 클릭: 빈칸 → 예약중 → 완료 → 빈칸</span>
      </div>

      <div className="sci2-body">
        <LeftPanel cols={cols} rows={rows} cells={cells} />

        <div className="sci2-right-panel">
          {cols.length === 0 && rows.length === 0 ? (
            <div className="sci2-empty">
              {adminMode
                ? '"＋ 반 추가"와 "＋ 단원 추가"로 표를 구성하세요.'
                : '아직 등록된 데이터가 없습니다.'}
            </div>
          ) : (
            <div className="sci2-table-wrap">
              <table className="sci2-table">
                <thead>
                  <tr>
                    <th className="sci2-th-corner">학반 \ 단원</th>
                    {cols.map(col => (
                      <th key={col.id} className="sci2-th-col">
                        <div className="sci2-th-inner">
                          {adminMode ? (
                            <>
                              <EditableLabel value={col.label}
                                onSave={v => updateCol(col.id, v || col.label)}
                                placeholder="단원명"
                                style={{ fontSize: 12, fontWeight: 700 }} />
                              <button className="sci2-del-btn" onClick={() => deleteCol(col.id)}>✕</button>
                            </>
                          ) : <span>{col.label}</span>}
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
                              <EditableLabel value={row.label}
                                onSave={v => updateRow(row.id, v || row.label)}
                                placeholder="학반"
                                style={{ fontSize: 12, fontWeight: 700 }} />
                              <button className="sci2-del-btn" onClick={() => deleteRow(row.id)}>✕</button>
                            </>
                          ) : <span>{row.label}</span>}
                        </div>
                      </td>
                      {cols.map(col => (
                        <td key={col.id} className="sci2-td-cell">
                          <SciCell
                            cell={cells[`${row.id}-${col.id}`]}
                            usedPeriods={getUsedPeriods(row.id, col.id)}
                            ST={ST}
                            onChange={val => updateCell(row.id, col.id, val)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
