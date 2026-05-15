// DSA Tracker — Striver A2Z sheet, two-panel layout: topic sidebar + problem table
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const DIFF_COLOR = { Easy: '#3ec98a', Medium: '#f4b740', Hard: '#ef4f5e' };

const TOPICS = [
  'Basics', 'Sorting', 'Arrays', 'Binary Search', 'Strings',
  'Linked List', 'Recursion', 'Bit Manipulation', 'Stack & Queue',
  'Sliding Window', 'Heaps', 'Greedy', 'Trees', 'BST',
  'Graphs', 'DP', 'Tries',
];

// ── Micro helpers ─────────────────────────────────────────────────────────────
function fmtSecs(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const Icons = {
  check:    <Ic d={<path d="M20 6 9 17l-5-5"/>} sw={2.5} size={13} />,
  link:     <Ic d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>} size={12} />,
  bookmark: <Ic d={<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>} size={14} />,
  play:     <Ic d={<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>} size={12} sw={0} />,
  stop:     <Ic d={<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>} size={12} sw={0} />,
  plus:     <Ic d={<path d="M12 5v14M5 12h14"/>} sw={2} />,
  trash:    <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>} size={13} />,
  warn:     <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={14} />,
  chevDown: <Ic d={<path d="M6 9l6 6 6-6"/>} size={13} />,
  fire:     <Ic d={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>} size={13} />,
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 13, r = 4 }) {
  return (
    <span style={{
      display: 'inline-block', width: w, height: h, borderRadius: r,
      background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// ── Add Custom Problem Modal ──────────────────────────────────────────────────
function AddCustomModal({ onClose, onAdd }) {
  const [form,   setForm]   = useState({ name: '', topic: 'Arrays', difficulty: 'Medium', leetcodeLink: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd(form);
    setSaving(false);
  };

  const inp = {
    background: '#2c313a', border: '1px solid #454a52', borderRadius: 7,
    color: '#EEEEEE', fontSize: 13, padding: '9px 11px', outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const lbl = { fontSize: 11, color: '#8a8f96', marginBottom: 5, display: 'block' };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px 22px', width: 430, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>Add Custom Problem</h3>

        <div>
          <label style={lbl}>Problem Name *</label>
          <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Count Subarrays with Exactly K Odd" required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Topic</label>
            <select style={inp} value={form.topic} onChange={e => set('topic', e.target.value)}>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Difficulty</label>
            <select style={inp} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              {['Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>LeetCode Link (optional)</label>
          <input style={inp} value={form.leetcodeLink} onChange={e => set('leetcodeLink', e.target.value)} placeholder="https://leetcode.com/problems/…" />
        </div>

        <div>
          <label style={lbl}>Notes (optional)</label>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 60 }}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Initial notes…"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 2 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ background: saving ? 'rgba(0,173,181,.5)' : '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Adding…' : 'Add Problem'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Problem Row ───────────────────────────────────────────────────────────────
function ProblemRow({ p, onUpdate, onDelete }) {
  const [editNote,     setEditNote]     = useState(false);
  const [noteVal,      setNoteVal]      = useState(p.notes || '');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const intRef = useRef(null);

  useEffect(() => { setNoteVal(p.notes || ''); }, [p.notes]);
  useEffect(() => () => clearInterval(intRef.current), []);

  const startTimer = () => {
    setElapsed(0);
    setTimerRunning(true);
    intRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopTimer = async () => {
    clearInterval(intRef.current);
    setTimerRunning(false);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    await onUpdate(p._id, { timeTaken: minutes });
  };

  const saveNote = async () => {
    setEditNote(false);
    if (noteVal !== (p.notes || '')) await onUpdate(p._id, { notes: noteVal });
  };

  const solved   = p.status === 'Solved';
  const diffCol  = DIFF_COLOR[p.difficulty] || '#EEEEEE';
  const td = (extra = {}) => ({ padding: '10px 8px', verticalAlign: 'middle', ...extra });

  return (
    <tr style={{ borderBottom: '1px solid #2c313a', borderLeft: `3px solid ${p.needsRevision ? '#f4b740' : 'transparent'}`, opacity: solved ? 0.65 : 1, background: solved ? 'rgba(62,201,138,.025)' : 'transparent' }}>

      {/* Status checkbox */}
      <td style={{ ...td(), paddingLeft: 14, width: 46, textAlign: 'center' }}>
        <button onClick={() => onUpdate(p._id, { status: solved ? 'Unsolved' : 'Solved' })} style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `2px solid ${solved ? '#3ec98a' : '#454a52'}`,
          background: solved ? 'rgba(62,201,138,.15)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#3ec98a', flexShrink: 0,
        }}>
          {solved && Icons.check}
        </button>
      </td>

      {/* Name */}
      <td style={td()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {p.leetcodeLink
            ? <a href={p.leetcodeLink} target="_blank" rel="noreferrer" style={{ color: solved ? '#6c7178' : '#EEEEEE', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {p.name}
                <span style={{ color: '#00ADB5', opacity: .65, display: 'flex' }}>{Icons.link}</span>
              </a>
            : <span style={{ color: solved ? '#6c7178' : '#EEEEEE', fontSize: 13, fontWeight: 500 }}>{p.name}</span>
          }
          {p.isCustom && (
            <span className="mono" style={{ fontSize: 9, color: '#00ADB5', background: 'rgba(0,173,181,.1)', border: '1px solid rgba(0,173,181,.2)', borderRadius: 3, padding: '1px 5px' }}>custom</span>
          )}
        </div>
      </td>

      {/* Difficulty */}
      <td style={{ ...td(), width: 90, textAlign: 'center' }}>
        <span className="mono" style={{ fontSize: 11, color: diffCol, background: `${diffCol}18`, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>
          {p.difficulty}
        </span>
      </td>

      {/* Notes */}
      <td style={{ ...td(), minWidth: 140 }}>
        {editNote ? (
          <textarea
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            onBlur={saveNote}
            autoFocus
            rows={2}
            style={{ background: '#2c313a', border: '1px solid #00ADB5', borderRadius: 6, color: '#EEEEEE', fontSize: 12, padding: '5px 8px', resize: 'vertical', width: '100%', minWidth: 130, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        ) : (
          <span
            onClick={() => setEditNote(true)}
            style={{ fontSize: 12, color: p.notes ? '#a7adb4' : '#3a3f47', cursor: 'text', display: 'block' }}
          >
            {p.notes || '+ add note'}
          </span>
        )}
      </td>

      {/* Timer */}
      <td style={{ ...td(), width: 90, textAlign: 'center' }}>
        <button onClick={timerRunning ? stopTimer : startTimer} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: timerRunning ? 'rgba(239,79,94,.1)' : 'rgba(255,255,255,.05)',
          border: `1px solid ${timerRunning ? 'rgba(239,79,94,.35)' : '#454a52'}`,
          borderRadius: 6, color: timerRunning ? '#ef4f5e' : '#8a8f96',
          fontSize: 11, padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {timerRunning
            ? <>{Icons.stop} <span className="mono">{fmtSecs(elapsed)}</span></>
            : <>{Icons.play} <span className="mono">{p.timeTaken > 0 ? `${p.timeTaken}m` : 'start'}</span></>
          }
        </button>
      </td>

      {/* Revision flag */}
      <td style={{ ...td(), width: 60, textAlign: 'center' }}>
        <button onClick={() => onUpdate(p._id, { needsRevision: !p.needsRevision })} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: p.needsRevision ? '#f4b740' : '#3a3f47', display: 'inline-flex', padding: 4,
        }}>
          {Icons.bookmark}
        </button>
      </td>

      {/* Delete (custom only) */}
      <td style={{ ...td(), width: 40, textAlign: 'center' }}>
        {p.isCustom && (
          <button
            onClick={() => onDelete(p._id)}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4f5e'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a3f47'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#3a3f47', display: 'inline-flex', padding: 4, transition: 'color .15s' }}
          >
            {Icons.trash}
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DSATracker() {
  const [problems,     setProblems]     = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeTopic,  setActiveTopic]  = useState('Stack & Queue');
  const [statusFilter, setStatusFilter] = useState('All');
  const [diffFilter,   setDiffFilter]   = useState('All');
  const [showModal,    setShowModal]    = useState(false);
  const [revOpen,      setRevOpen]      = useState(true);
  const [windowWidth,  setWindowWidth]  = useState(window.innerWidth);

  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const isMobile = windowWidth < 768;

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [probsR, statsR] = await Promise.all([
        api.get('/dsa'),
        api.get('/dsa/stats'),
      ]);
      setProblems(probsR.data);
      setStats(statsR.data);
    } catch {
      setError('Failed to load DSA data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refreshStats = async () => {
    try {
      const { data } = await api.get('/dsa/stats');
      setStats(data);
    } catch { /* silent */ }
  };

  const handleUpdate = async (id, updates) => {
    try {
      const { data } = await api.put(`/dsa/${id}`, updates);
      setProblems(ps => ps.map(p => p._id === id ? data : p));
      if ('status' in updates || 'needsRevision' in updates) refreshStats();
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dsa/${id}`);
      setProblems(ps => ps.filter(p => p._id !== id));
      refreshStats();
    } catch { /* silent */ }
  };

  const handleAddCustom = async (formData) => {
    try {
      const { data } = await api.post('/dsa/custom', formData);
      setProblems(ps => [...ps, data]);
      setShowModal(false);
      refreshStats();
    } catch { /* silent */ }
  };

  // Build topic map for sidebar
  const topicMap = {};
  for (const p of problems) {
    if (!topicMap[p.topic]) topicMap[p.topic] = { total: 0, solved: 0 };
    topicMap[p.topic].total++;
    if (p.status === 'Solved') topicMap[p.topic].solved++;
  }

  const allTotal  = problems.length;
  const allSolved = problems.filter(p => p.status === 'Solved').length;

  // Filtered problem list
  const filtered = problems
    .filter(p => activeTopic === 'All Problems' || p.topic === activeTopic)
    .filter(p => {
      if (statusFilter === 'Solved')         return p.status === 'Solved';
      if (statusFilter === 'Unsolved')       return p.status === 'Unsolved';
      if (statusFilter === 'Needs Revision') return p.needsRevision;
      return true;
    })
    .filter(p => diffFilter === 'All' || p.difficulty === diffFilter);

  const topicTotalCount  = activeTopic === 'All Problems' ? allTotal  : (topicMap[activeTopic]?.total  || 0);
  const topicSolvedCount = activeTopic === 'All Problems' ? allSolved : (topicMap[activeTopic]?.solved || 0);
  const revisionDue      = filtered.filter(p => p.needsRevision && p.status !== 'Solved');

  const selStyle = {
    background: 'rgba(255,255,255,.05)', border: '1px solid #454a52', borderRadius: 7,
    color: '#EEEEEE', fontSize: 12, padding: '6px 10px', cursor: 'pointer',
    outline: 'none', fontFamily: 'inherit',
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}.dsa-topic-btn:hover{background:rgba(255,255,255,.04)!important}.dsa-row:hover td{background:rgba(255,255,255,.02)}`}</style>

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* ── Mobile: Topic chip row ───────────────────────────────────────── */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 14px', borderBottom: '1px solid #2c313a', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
            {['All Problems', ...TOPICS].map(topic => {
              const active = activeTopic === topic;
              return (
                <button key={topic} onClick={() => { setActiveTopic(topic); setStatusFilter('All'); setDiffFilter('All'); }} style={{
                  background: active ? '#00ADB5' : '#393E46', color: active ? '#17292a' : '#EEEEEE',
                  border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 11,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: active ? 700 : 400,
                }}>
                  {topic}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Desktop: Topic Sidebar ───────────────────────────────────────── */}
        <aside style={{ width: 220, flexShrink: 0, background: '#222831', borderRight: '1px solid #2c313a', display: isMobile ? 'none' : 'flex', flexDirection: 'column', overflowY: 'auto', paddingTop: 14 }}>

          <span style={{ padding: '0 16px 8px', fontSize: 10, color: '#8a8f96', letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
            Topics
          </span>

          {['All Problems', ...TOPICS].map(topic => {
            const isAll   = topic === 'All Problems';
            const total   = isAll ? allTotal  : (topicMap[topic]?.total  || 0);
            const solved  = isAll ? allSolved : (topicMap[topic]?.solved || 0);
            const pct     = total > 0 ? (solved / total) * 100 : 0;
            const active  = activeTopic === topic;

            return (
              <button
                key={topic}
                className="dsa-topic-btn"
                onClick={() => { setActiveTopic(topic); setStatusFilter('All'); setDiffFilter('All'); }}
                style={{
                  width: '100%', background: active ? 'rgba(0,173,181,.09)' : 'transparent',
                  border: 'none', borderLeft: `3px solid ${active ? '#00ADB5' : 'transparent'}`,
                  cursor: 'pointer', padding: '9px 14px', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 5, transition: 'background .12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: active ? '#00ADB5' : '#EEEEEE', fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>
                    {topic}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: active ? '#00ADB5' : '#8a8f96', marginLeft: 6, flexShrink: 0 }}>
                    {loading ? '…' : `${solved}/${total}`}
                  </span>
                </div>
                {!loading && total > 0 && (
                  <div style={{ height: 3, background: '#2c313a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: active ? '#00ADB5' : '#454a52', borderRadius: 2, transition: 'width .35s ease' }} />
                  </div>
                )}
              </button>
            );
          })}

          {/* Bottom padding */}
          <div style={{ height: 24, flexShrink: 0 }} />
        </aside>

        {/* ── Right: Problem Panel ────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{ padding: '16px 24px 14px', borderBottom: '1px solid #2c313a', flexShrink: 0, background: '#222831' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#EEEEEE', whiteSpace: 'nowrap' }}>{activeTopic}</h2>
                <span className="mono" style={{ fontSize: 12, color: '#8a8f96', whiteSpace: 'nowrap' }}>
                  {loading ? '…' : `${topicSolvedCount} / ${topicTotalCount} solved`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(244,183,64,.07)', border: '1px solid rgba(244,183,64,.2)', borderRadius: 8, padding: '5px 10px' }}>
                  <span style={{ color: '#f4b740', display: 'flex' }}>{Icons.fire}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: '#f4b740' }}>{stats?.streak ?? '…'} day streak</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(62,201,138,.07)', border: '1px solid rgba(62,201,138,.2)', borderRadius: 8, padding: '5px 10px' }}>
                  <span className="mono" style={{ fontSize: 11.5, color: '#3ec98a' }}>{stats?.todayCount ?? '…'} solved today</span>
                </span>
                <button
                  onClick={() => setShowModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#00ADB5', color: '#06222a', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', boxShadow: '0 1px 0 rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}
                >
                  {Icons.plus} Add Custom
                </button>
              </div>
            </div>

            {/* Filters row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
                {['All', 'Unsolved', 'Solved', 'Needs Revision'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} style={selStyle}>
                {['All', 'Easy', 'Medium', 'Hard'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {!loading && (
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: '#8a8f96' }}>
                  {filtered.length} problem{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* Revision due section */}
            {!loading && revisionDue.length > 0 && (
              <div style={{ margin: '14px 20px 0', background: 'rgba(244,183,64,.05)', border: '1px solid rgba(244,183,64,.22)', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setRevOpen(o => !o)}
                  style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', color: '#f4b740' }}
                >
                  <span style={{ display: 'flex' }}>{Icons.warn}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {revisionDue.length} problem{revisionDue.length > 1 ? 's' : ''} due for revision
                  </span>
                  <span style={{ marginLeft: 'auto', transform: revOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'flex' }}>{Icons.chevDown}</span>
                </button>
                {revOpen && (
                  <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {revisionDue.map(p => (
                      <span key={p._id} style={{ fontSize: 12, background: 'rgba(244,183,64,.1)', border: '1px solid rgba(244,183,64,.2)', borderRadius: 6, padding: '4px 10px', color: '#f4b740' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #2c313a' }}>
                    <Skel w={22} h={22} r="50%" />
                    <Skel w={Math.random() > .5 ? 180 : 250} h={13} />
                    <Skel w={55} h={18} r={5} />
                    <Skel w={100} h={13} />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div style={{ margin: 24, background: 'rgba(239,79,94,.09)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 10, padding: '18px 20px' }}>
                <p style={{ margin: 0, color: '#ef4f5e', fontSize: 13 }}>{error}</p>
                <button onClick={fetchAll} style={{ marginTop: 10, background: 'transparent', border: '1px solid rgba(239,79,94,.4)', borderRadius: 7, color: '#ef4f5e', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '52px 24px', color: '#8a8f96', fontSize: 13 }}>
                No problems match the current filters.
              </div>
            )}

            {/* Problem table */}
            {!loading && !error && filtered.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2c313a' }}>
                      <th style={{ padding: '10px 8px 10px 16px', width: 46 }} />
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase' }}>Problem</th>
                      <th style={{ padding: '10px 8px', width: 90, textAlign: 'center', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase' }}>Difficulty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', minWidth: 140 }}>Notes</th>
                      <th style={{ padding: '10px 8px', width: 90, textAlign: 'center', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase' }}>Timer</th>
                      <th style={{ padding: '10px 8px', width: 60, textAlign: 'center', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase' }}>Rev.</th>
                      <th style={{ padding: '10px 8px', width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <ProblemRow key={p._id} p={p} onUpdate={handleUpdate} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom padding */}
            <div style={{ height: 32 }} />
          </div>
        </main>
      </div>

      {showModal && (
        <AddCustomModal onClose={() => setShowModal(false)} onAdd={handleAddCustom} />
      )}
    </>
  );
}
