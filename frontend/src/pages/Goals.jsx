// Goals & Roadmap — Phase view + horizontal timeline Gantt, with linked tracker auto-progress
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['Career', 'Technical', 'Life'];
const STATUSES   = ['On Track', 'At Risk', 'Delayed', 'Complete'];
const TRACKERS   = [{ value: '', label: '— None —' }, { value: 'dsa', label: 'DSA Sheet' }, { value: 'internship', label: 'Internship' }];

const STATUS_COLOR  = { 'On Track': '#3ec98a', 'At Risk': '#f4b740', 'Delayed': '#ef4f5e', 'Complete': '#00ADB5' };
const CAT_COLOR     = { Career: '#a78bfa', Technical: '#00ADB5', Life: '#3ec98a' };
const CAT_BG        = { Career: 'rgba(167,139,250,.12)', Technical: 'rgba(0,173,181,.12)', Life: 'rgba(62,201,138,.12)' };

// ── Timeline config ───────────────────────────────────────────────────────────
const TL_START   = new Date('2026-01-01');
const TL_END     = new Date('2028-01-01');
const TL_MONTHS  = 24; // Jan 2026 – Dec 2027
const COL_W      = 68; // px per month
const TL_WIDTH   = TL_MONTHS * COL_W;
const TL_MS      = TL_END - TL_START;
const MONTH_NAMES= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getBarStyle(goal) {
  const start = Math.max(goal.createdAt ? new Date(goal.createdAt) : TL_START, TL_START);
  const end   = goal.targetDate ? new Date(goal.targetDate) : TL_END;
  const left  = Math.max(0, ((start - TL_START) / TL_MS) * TL_WIDTH);
  const width = Math.max(24, Math.min(TL_WIDTH - left, ((end - start) / TL_MS) * TL_WIDTH));
  return { left, width };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d)  { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function daysLeft(d) {
  if (!d) return null;
  const t = new Date(d); t.setHours(0,0,0,0);
  const n = new Date();  n.setHours(0,0,0,0);
  return Math.ceil((t - n) / 86400000);
}

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const Icons = {
  plus:    <Ic d={<path d="M12 5v14M5 12h14"/>} sw={2} />,
  trash:   <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></>} size={13} />,
  warn:    <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={13} />,
  phases:  <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />,
  timeline:<Ic d={<><line x1="3" y1="12" x2="21" y2="12"/><polyline points="18 8 22 12 18 16"/><line x1="3" y1="6" x2="3" y2="18"/></>} />,
  link:    <Ic d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>} size={12} />,
  chevron: <Ic d={<path d="M6 9l6 6 6-6"/>} size={13} />,
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 13, r = 4 }) {
  return <span style={{ display: 'inline-block', width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

const INP = { background: '#2c313a', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 13, padding: '9px 11px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const LBL = { fontSize: 11, color: '#8a8f96', marginBottom: 5, display: 'block' };

// ── Goal Modal (Add / Edit) ───────────────────────────────────────────────────
function GoalModal({ initial, onClose, onSave, onDelete }) {
  const blank = { name: '', category: 'Career', phase: 'Phase 1', targetDate: '', progress: 0, linkedTracker: '', notes: '', isLife: false, status: 'On Track' };
  const toForm = (g) => ({ ...blank, ...g, targetDate: g?.targetDate ? new Date(g.targetDate).toISOString().split('T')[0] : '', linkedTracker: g?.linkedTracker || '' });
  const [form,   setForm]   = useState(initial ? toForm(initial) : blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial;
  const autoProgress = !!form.linkedTracker;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form, linkedTracker: form.linkedTracker || null, isLife: form.category === 'Life' || form.isLife });
    setSaving(false);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px 22px', width: 460, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>{isEdit ? 'Edit Goal' : 'Add Goal'}</h3>

        <div><label style={LBL}>Goal Name *</label><input style={INP} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Land SWE Internship" required /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Category</label>
            <select style={INP} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Phase</label>
            <input style={INP} value={form.phase} onChange={e => set('phase', e.target.value)} placeholder="Phase 1" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Target Date</label><input style={INP} type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)} /></div>
          <div><label style={LBL}>Linked Tracker</label>
            <select style={INP} value={form.linkedTracker} onChange={e => set('linkedTracker', e.target.value)}>
              {TRACKERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ ...LBL, marginBottom: 8 }}>
            Progress — {form.progress}%
            {autoProgress && <span style={{ marginLeft: 8, color: '#00ADB5' }}>(auto from {form.linkedTracker})</span>}
          </label>
          <input type="range" min="0" max="100" value={form.progress} disabled={autoProgress}
            onChange={e => set('progress', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00ADB5', cursor: autoProgress ? 'not-allowed' : 'pointer', opacity: autoProgress ? .4 : 1 }}
          />
        </div>

        {isEdit && (
          <div><label style={LBL}>Status</label>
            <select style={INP} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div><label style={LBL}>Notes</label><textarea style={{ ...INP, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isLife} onChange={e => set('isLife', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#00ADB5', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#EEEEEE' }}>Life goal (shown in separate section)</span>
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {isEdit
            ? <button type="button" onClick={() => onDelete(initial._id)} style={{ background: 'transparent', border: '1px solid rgba(239,79,94,.35)', borderRadius: 7, color: '#ef4f5e', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>Delete</button>
            : <span />
          }
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background: saving ? 'rgba(0,173,181,.5)' : '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Goal Card (Phase view) ────────────────────────────────────────────────────
function GoalCard({ goal, onClick, soft }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const sc   = STATUS_COLOR[goal.status] || '#8a8f96';
  const cc   = CAT_COLOR[goal.category]  || '#8a8f96';
  const cbg  = CAT_BG[goal.category]     || 'rgba(255,255,255,.06)';
  const days = daysLeft(goal.targetDate);
  const borderColor = goal.status === 'Delayed' ? '#ef4f5e' : goal.status === 'At Risk' ? '#f4b740' : 'transparent';

  return (
    <div
      style={{ background: soft ? 'rgba(62,201,138,.04)' : '#393E46', border: `1px solid ${goal.status === 'Complete' ? '#2c313a' : '#454a52'}`, borderLeft: `3px solid ${borderColor === 'transparent' ? (soft ? 'rgba(62,201,138,.3)' : '#454a52') : borderColor}`, borderRadius: 10, padding: '14px 16px', opacity: goal.status === 'Complete' ? .6 : 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => onClick(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#EEEEEE', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{goal.name}</button>
            <span style={{ fontSize: 10, color: cc, background: cbg, border: `1px solid ${cc}30`, borderRadius: 4, padding: '2px 7px' }}>{goal.category}</span>
            {goal.linkedTracker && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#00ADB5' }}>{Icons.link} {goal.linkedTracker}</span>
            )}
          </div>
          {goal.phase && <div className="mono" style={{ fontSize: 10, color: '#8a8f96', marginTop: 3 }}>{goal.phase}</div>}
        </div>
        <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, border: `1px solid ${sc}30`, borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>{goal.status}</span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 5, background: '#2c313a', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${goal.progress}%`, background: sc, borderRadius: 3, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#8a8f96' }}>
            {goal.targetDate && (
              <span style={{ color: days !== null && days < 0 ? '#ef4f5e' : days !== null && days < 30 ? '#f4b740' : '#8a8f96' }}>
                {days === null ? '' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left · `}
              </span>
            )}
            {goal.targetDate && days !== null && days >= 0 ? fmtDate(goal.targetDate) : ''}
          </span>
          <span className="mono" style={{ fontSize: 11, color: sc }}>{goal.progress}%</span>
        </div>
      </div>

      {/* Notes toggle */}
      {goal.notes && (
        <div>
          <button onClick={() => setNotesOpen(o => !o)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#8a8f96', fontSize: 11, padding: 0 }}>
            <span style={{ transform: notesOpen ? 'rotate(180deg)' : 'none', display: 'flex', transition: 'transform .2s' }}>{Icons.chevron}</span>
            Notes
          </button>
          {notesOpen && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#a7adb4', lineHeight: 1.5 }}>{goal.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ── Phase View ────────────────────────────────────────────────────────────────
function PhaseView({ goals, onGoalClick }) {
  const careerTech = goals.filter(g => !g.isLife);
  const life       = goals.filter(g => g.isLife);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Career + Technical */}
      {careerTech.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#8a8f96', letterSpacing: .8, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Career & Technical</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {careerTech.map(g => <GoalCard key={g._id} goal={g} onClick={onGoalClick} soft={false} />)}
          </div>
        </div>
      )}

      {/* Divider */}
      {careerTech.length > 0 && life.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#2c313a' }} />
          <span style={{ fontSize: 11, color: '#8a8f96', letterSpacing: .8, textTransform: 'uppercase', fontWeight: 600 }}>Life Goals</span>
          <div style={{ flex: 1, height: 1, background: '#2c313a' }} />
        </div>
      )}

      {/* Life goals */}
      {life.length > 0 && (
        <div>
          {careerTech.length === 0 && <div style={{ fontSize: 11, color: '#8a8f96', letterSpacing: .8, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Life Goals</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {life.map(g => <GoalCard key={g._id} goal={g} onClick={onGoalClick} soft={true} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Timeline View (Gantt) ─────────────────────────────────────────────────────
function TimelineView({ goals, onGoalClick }) {
  const today    = new Date();
  const todayPx  = Math.max(0, Math.min(TL_WIDTH, ((today - TL_START) / TL_MS) * TL_WIDTH));
  const [hovered, setHovered] = useState(null);

  // Build month labels
  const monthLabels = [];
  for (let i = 0; i < TL_MONTHS; i++) {
    const d = new Date(TL_START);
    d.setMonth(d.getMonth() + i);
    monthLabels.push({ label: `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, left: i * COL_W });
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ width: TL_WIDTH + 200, minWidth: TL_WIDTH + 200, position: 'relative' }}>

        {/* Month header */}
        <div style={{ display: 'flex', marginLeft: 180, marginBottom: 8, position: 'relative', height: 28 }}>
          {monthLabels.map((ml, i) => (
            <div key={i} style={{ position: 'absolute', left: ml.left, width: COL_W, textAlign: 'center' }}>
              <span className="mono" style={{ fontSize: 9.5, color: '#454a52', letterSpacing: .3 }}>{ml.label}</span>
            </div>
          ))}
          {/* Today line label */}
          <div style={{ position: 'absolute', left: todayPx, top: -4 }}>
            <div style={{ width: 1, height: 36, background: '#00ADB5', opacity: .5 }} />
          </div>
        </div>

        {/* Rows */}
        {goals.map(goal => {
          const { left, width } = getBarStyle(goal);
          const sc = STATUS_COLOR[goal.status] || '#8a8f96';
          const isHovered = hovered === goal._id;

          return (
            <div key={goal._id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, height: 34, position: 'relative' }}>
              {/* Goal name label */}
              <div style={{ width: 180, flexShrink: 0, paddingRight: 12, overflow: 'hidden' }}>
                <button onClick={() => onGoalClick(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EEEEEE', fontSize: 12, fontWeight: 500, padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 168, display: 'block', textAlign: 'right' }}>
                  {goal.name}
                </button>
              </div>

              {/* Timeline track */}
              <div style={{ flex: 1, position: 'relative', height: 34, background: 'rgba(255,255,255,.02)', borderRadius: 4 }}>
                {/* Today line */}
                <div style={{ position: 'absolute', left: todayPx, top: 0, width: 1, height: '100%', background: '#00ADB5', opacity: .35, zIndex: 2 }} />

                {/* Goal bar */}
                <button
                  onClick={() => onGoalClick(goal)}
                  onMouseEnter={() => setHovered(goal._id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute', left, width, top: 5, height: 24,
                    background: `${sc}${isHovered ? '55' : '30'}`, border: `1px solid ${sc}${isHovered ? 'aa' : '60'}`,
                    borderRadius: 6, cursor: 'pointer', transition: 'background .15s',
                    display: 'flex', alignItems: 'center', overflow: 'hidden',
                    zIndex: 3,
                  }}
                >
                  {/* Progress fill */}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${goal.progress}%`, background: `${sc}55`, borderRadius: 5 }} />
                  {/* Label */}
                  {width > 80 && (
                    <span style={{ position: 'relative', fontSize: 10, color: sc, fontWeight: 600, paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 4 }}>
                      {goal.name} · {goal.progress}%
                    </span>
                  )}
                </button>

                {/* Tooltip */}
                {isHovered && (
                  <div style={{ position: 'absolute', left: left + width / 2, top: -48, transform: 'translateX(-50%)', background: '#2c313a', border: '1px solid #454a52', borderRadius: 8, padding: '6px 12px', zIndex: 10, whiteSpace: 'nowrap', fontSize: 12, color: '#EEEEEE', pointerEvents: 'none' }}>
                    <b>{goal.name}</b> · {goal.progress}% · {goal.status}
                    <br /><span style={{ fontSize: 10, color: '#8a8f96' }}>Target: {fmtDate(goal.targetDate)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState('phase');
  const [modal,   setModal]   = useState(null); // null | 'add' | goal

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/goals');
      setGoals(data);
    } catch { setError('Failed to load goals.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    const isEdit = modal && modal !== 'add';
    try {
      if (isEdit) {
        const { data } = await api.put(`/goals/${modal._id}`, form);
        setGoals(gs => gs.map(g => g._id === modal._id ? data : g));
      } else {
        const { data } = await api.post('/goals', form);
        setGoals(gs => [...gs, data]);
      }
      setModal(null);
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals(gs => gs.filter(g => g._id !== id));
      setModal(null);
    } catch { /* silent */ }
  };

  const atRisk   = goals.filter(g => g.status === 'At Risk' || g.status === 'Delayed');
  const btnStyle = (a) => ({ background: a ? 'rgba(0,173,181,.15)' : 'transparent', border: `1px solid ${a ? 'rgba(0,173,181,.4)' : '#454a52'}`, borderRadius: 7, color: a ? '#00ADB5' : '#8a8f96', fontSize: 12, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 });

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button style={btnStyle(view === 'phase')}    onClick={() => setView('phase')}>{Icons.phases} Phase</button>
          <button style={btnStyle(view === 'timeline')} onClick={() => setView('timeline')}>{Icons.timeline} Timeline</button>

          {atRisk.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(244,183,64,.08)', border: '1px solid rgba(244,183,64,.25)', borderRadius: 7, color: '#f4b740', fontSize: 12, padding: '5px 10px' }}>
              {Icons.warn} {atRisk.length} at risk
            </span>
          )}

          <button onClick={() => setModal('add')} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>
            {Icons.plus} Add Goal
          </button>
        </div>

        {/* Error */}
        {error && <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '12px 16px', color: '#ef4f5e', fontSize: 13 }}>{error} <button onClick={load} style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(239,79,94,.4)', borderRadius: 6, color: '#ef4f5e', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Retry</button></div>}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {[1,2,3,4,5,6,7].map(i => <div key={i} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}><Skel h={16} w="60%" /><Skel h={5} r={3} /><Skel h={11} w="40%" /></div>)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && goals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8f96', fontSize: 13 }}>No goals yet. Add your first goal!</div>
        )}

        {/* Views */}
        {!loading && !error && goals.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {view === 'phase'    && <PhaseView    goals={goals} onGoalClick={g => setModal(g)} />}
            {view === 'timeline' && <TimelineView goals={goals} onGoalClick={g => setModal(g)} />}
          </div>
        )}
      </div>

      {modal && (
        <GoalModal
          initial={modal !== 'add' ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
