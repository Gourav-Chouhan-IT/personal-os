// Content Calendar — LinkedIn/GitHub/Twitter post scheduling with calendar + list views
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORMS = ['LinkedIn', 'GitHub', 'Twitter'];
const STATUSES  = ['Idea', 'Draft', 'Scheduled', 'Posted'];
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW       = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_COLOR   = { Idea: '#8a8f96', Draft: '#f4b740', Scheduled: '#00ADB5', Posted: '#3ec98a' };
const PLATFORM_COLOR = { LinkedIn: '#0a66c2', GitHub: '#8a8f96', Twitter: '#1d9bf0' };
const PLATFORM_ICON  = { LinkedIn: 'in', GitHub: '</>', Twitter: '𝕏' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO()  { return new Date().toISOString().split('T')[0]; }
function fmtDate(d)  { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }
function isSameDay(d1, y, m, day) {
  const d = new Date(d1);
  return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
}
function buildGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const Icons = {
  prev:  <Ic d={<><polyline points="15 18 9 12 15 6"/></>} />,
  next:  <Ic d={<><polyline points="9 18 15 12 9 6"/></>} />,
  plus:  <Ic d={<path d="M12 5v14M5 12h14"/>} sw={2} />,
  trash: <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></>} size={13} />,
  warn:  <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={13} />,
  cal:   <Ic d={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />,
  list:  <Ic d={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>} />,
  clock: <Ic d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} size={13} />,
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 13, r = 4 }) {
  return <span style={{ display: 'inline-block', width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const INP = { background: '#2c313a', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 13, padding: '9px 11px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const LBL = { fontSize: 11, color: '#8a8f96', marginBottom: 5, display: 'block' };

// ── Post Modal (Add / Edit) ───────────────────────────────────────────────────
function PostModal({ initial, defaultDate, projects, onClose, onSave, onDelete }) {
  const blank = { title: '', platform: 'LinkedIn', status: 'Idea', plannedDate: defaultDate || '', projectId: '', draft: '', postUrl: '' };
  const toForm = (p) => ({
    ...blank, ...p,
    plannedDate: p?.plannedDate ? new Date(p.plannedDate).toISOString().split('T')[0] : '',
    projectId: p?.projectId || '',
  });
  const [form,   setForm]   = useState(initial ? toForm(initial) : blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({ ...form, plannedDate: form.plannedDate || null, projectId: form.projectId || null });
    setSaving(false);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px 22px', width: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>{isEdit ? 'Edit Post' : 'Add Post'}</h3>

        <div><label style={LBL}>Title *</label><input style={INP} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post title…" required /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Platform</label>
            <select style={INP} value={form.platform} onChange={e => set('platform', e.target.value)}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Status</label>
            <select style={INP} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Planned Date</label><input style={INP} type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)} /></div>
          <div><label style={LBL}>Linked Project</label>
            <select style={INP} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
              <option value="">— None —</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div><label style={LBL}>Draft Content</label>
          <textarea style={{ ...INP, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }} value={form.draft} onChange={e => set('draft', e.target.value)} placeholder="Write your post here…" />
        </div>

        {form.status === 'Posted' && (
          <div><label style={LBL}>Post URL</label><input style={INP} value={form.postUrl} onChange={e => set('postUrl', e.target.value)} placeholder="https://…" /></div>
        )}

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

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ posts, year, month, today, onDayClick, onPostClick, onPrevMonth, onNextMonth }) {
  const cells = buildGrid(year, month);
  const isToday = (d) => d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px' }}>
        <button onClick={onPrevMonth} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>{Icons.prev}</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>{MONTHS[month]} {year}</span>
        <button onClick={onNextMonth} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>{Icons.next}</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} className="mono" style={{ textAlign: 'center', fontSize: 10, color: '#8a8f96', padding: '6px 0', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} style={{ minHeight: 80 }} />;
          const dayPosts = posts.filter(p => p.plannedDate && isSameDay(p.plannedDate, year, month, day));
          const today_   = isToday(day);

          return (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              style={{
                minHeight: 80, background: '#393E46', border: `1px solid ${today_ ? '#00ADB5' : '#454a52'}`,
                borderRadius: 8, padding: '6px 7px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => { if (!today_) e.currentTarget.style.borderColor = '#56606a'; }}
              onMouseLeave={e => { if (!today_) e.currentTarget.style.borderColor = '#454a52'; }}
            >
              <span className="mono" style={{ fontSize: 11, color: today_ ? '#00ADB5' : '#8a8f96', fontWeight: today_ ? 700 : 400 }}>{day}</span>
              {dayPosts.slice(0, 3).map(p => (
                <button
                  key={p._id}
                  onClick={e => { e.stopPropagation(); onPostClick(p); }}
                  style={{
                    fontSize: 10, background: `${STATUS_COLOR[p.status]}18`, color: STATUS_COLOR[p.status],
                    border: `1px solid ${STATUS_COLOR[p.status]}40`, borderRadius: 4, padding: '2px 5px',
                    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer', textAlign: 'left',
                  }}>
                  {PLATFORM_ICON[p.platform]} {p.title}
                </button>
              ))}
              {dayPosts.length > 3 && <span style={{ fontSize: 9.5, color: '#8a8f96' }}>+{dayPosts.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function PostListView({ posts, projects, statusFilter, onStatusFilter, onPostClick }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const projectMap = Object.fromEntries(projects.map(p => [p._id, p.name]));
  const filtered = posts
    .filter(p => p.plannedDate)
    .filter(p => statusFilter === 'All' || p.status === statusFilter)
    .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));

  const isOverdue = (p) => p.plannedDate && new Date(p.plannedDate) < today && p.status !== 'Posted';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2c313a' }}>
            {['Title', 'Platform', 'Status', 'Date', 'Project', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const overdue = isOverdue(p);
            const sc = STATUS_COLOR[p.status];
            const pc = PLATFORM_COLOR[p.platform];
            return (
              <tr key={p._id} style={{ borderBottom: '1px solid #2c313a', borderLeft: `3px solid ${overdue ? '#ef4f5e' : 'transparent'}` }}>
                <td style={{ padding: '11px 12px', maxWidth: 220 }}>
                  <button onClick={() => onPostClick(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EEEEEE', fontSize: 13, fontWeight: 500, padding: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {p.title}
                  </button>
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <span className="mono" style={{ fontSize: 10, color: pc, background: `${pc}15`, border: `1px solid ${pc}30`, borderRadius: 4, padding: '2px 7px' }}>{PLATFORM_ICON[p.platform]} {p.platform}</span>
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, border: `1px solid ${sc}35`, borderRadius: 4, padding: '2px 7px' }}>{p.status}</span>
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <span style={{ fontSize: 12, color: overdue ? '#ef4f5e' : '#EEEEEE' }}>{fmtDate(p.plannedDate)}</span>
                  {overdue && <span style={{ fontSize: 10, color: '#ef4f5e', marginLeft: 6 }}>overdue</span>}
                </td>
                <td style={{ padding: '11px 12px', fontSize: 12, color: '#8a8f96' }}>
                  {p.projectId ? (projectMap[p.projectId] || '—') : '—'}
                </td>
                <td style={{ padding: '11px 12px' }}>
                  <button onClick={() => onPostClick(p)} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 6, color: '#8a8f96', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: '#8a8f96', fontSize: 13 }}>No posts match the current filter.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Backlog Section ───────────────────────────────────────────────────────────
function BacklogSection({ posts, projects, onPostClick, onSchedule }) {
  const backlog = posts.filter(p => !p.plannedDate && p.status !== 'Posted');
  if (backlog.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#EEEEEE' }}>Backlog</h3>
        <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>ideas without a date</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {backlog.map(p => {
          const sc = STATUS_COLOR[p.status];
          return (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#393E46', border: '1px solid #454a52', borderRadius: 9, padding: '10px 14px' }}>
              <span className="mono" style={{ fontSize: 10, color: PLATFORM_COLOR[p.platform] }}>{PLATFORM_ICON[p.platform]}</span>
              <button onClick={() => onPostClick(p)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#EEEEEE', fontSize: 13, fontWeight: 500, padding: 0, textAlign: 'left' }}>{p.title}</button>
              <span className="mono" style={{ fontSize: 10, color: sc }}>{p.status}</span>
              <button onClick={() => onSchedule(p)} style={{ background: 'rgba(0,173,181,.1)', border: '1px solid rgba(0,173,181,.25)', borderRadius: 6, color: '#00ADB5', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                Schedule it
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const now = new Date();
  const [posts,        setPosts]        = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [overdue,      setOverdue]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [view,         setView]         = useState('calendar');
  const [month,        setMonth]        = useState(now.getMonth());
  const [year,         setYear]         = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal,        setModal]        = useState(null); // null | 'add' | post | { date, post: null }

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [postsR, projectsR, overdueR] = await Promise.all([
        api.get('/content'),
        api.get('/projects'),
        api.get('/content/overdue'),
      ]);
      setPosts(postsR.data);
      setProjects(projectsR.data);
      setOverdue(overdueR.data);
    } catch { setError('Failed to load content calendar.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    const isEdit = modal?.post?._id || (modal?._id);
    const editId = modal?.post?._id || modal?._id;
    try {
      if (isEdit) {
        const { data } = await api.put(`/content/${editId}`, form);
        setPosts(ps => ps.map(p => p._id === editId ? data : p));
      } else {
        const { data } = await api.post('/content', form);
        setPosts(ps => [...ps, data]);
      }
      setModal(null);
      const { data: ov } = await api.get('/content/overdue');
      setOverdue(ov);
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/content/${id}`);
      setPosts(ps => ps.filter(p => p._id !== id));
      setOverdue(ov => ov.filter(p => p._id !== id));
      setModal(null);
    } catch { /* silent */ }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const selStyle = { background: 'rgba(255,255,255,.05)', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 12, padding: '6px 10px', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' };
  const btnStyle = (a) => ({ background: a ? 'rgba(0,173,181,.15)' : 'transparent', border: `1px solid ${a ? 'rgba(0,173,181,.4)' : '#454a52'}`, borderRadius: 7, color: a ? '#00ADB5' : '#8a8f96', fontSize: 12, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 });

  // Determine modal initial + defaultDate
  const modalPost    = modal && modal !== 'add' && !modal.date ? modal : (modal?.post || null);
  const modalDate    = modal?.date ? `${year}-${String(month + 1).padStart(2,'0')}-${String(modal.date).padStart(2,'0')}` : '';

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

        {/* Error */}
        {error && <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '12px 16px', color: '#ef4f5e', fontSize: 13 }}>{error}</div>}

        {/* Overdue badge + toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button style={btnStyle(view === 'calendar')} onClick={() => setView('calendar')}>{Icons.cal} Calendar</button>
          <button style={btnStyle(view === 'list')}     onClick={() => setView('list')}>{Icons.list} List</button>

          {view === 'list' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
              <option value="All">All</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {overdue.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 7, color: '#ef4f5e', fontSize: 12, padding: '5px 10px' }}>
              {Icons.warn} {overdue.length} overdue draft{overdue.length > 1 ? 's' : ''}
            </span>
          )}

          <button onClick={() => setModal('add')} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>
            {Icons.plus} Add Post
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel h={32} w={220} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {Array.from({ length: 35 }).map((_, i) => <Skel key={i} h={80} r={8} />)}
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {view === 'calendar' && (
              <CalendarView
                posts={posts.filter(p => statusFilter === 'All' || p.status === statusFilter)}
                year={year} month={month} today={now}
                onDayClick={day => setModal({ date: day })}
                onPostClick={p => setModal(p)}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
              />
            )}

            {view === 'list' && (
              <PostListView
                posts={posts}
                projects={projects}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                onPostClick={p => setModal(p)}
              />
            )}

            <BacklogSection
              posts={posts}
              projects={projects}
              onPostClick={p => setModal(p)}
              onSchedule={p => setModal({ post: p, date: null, scheduleMode: true })}
            />
          </div>
        )}
      </div>

      {modal && (
        <PostModal
          initial={modalPost}
          defaultDate={modal?.scheduleMode ? todayISO() : (modalDate || '')}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
