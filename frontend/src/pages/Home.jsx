// Home Dashboard — live data from /api/tasks, /api/activity, /api/tasks/overdue-check
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const Icons = {
  tasks:  <Ic d={<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10l2.5 2.5L16 7"/><path d="M8 16h8"/></>} />,
  dsa:    <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></>} />,
  crm:    <Ic d={<><path d="M4 7h16v12H4z"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 12h16"/></>} />,
  goals:  <Ic d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>} />,
  filter: <Ic d={<><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>} />,
  plus:   <Ic d={<><path d="M12 5v14M5 12h14"/></>} sw={2} />,
  warn:   <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={15} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysLate(dueDate) {
  if (!dueDate) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDate); due.setHours(0,0,0,0);
  return Math.max(0, Math.floor((today - due) / 86400000));
}

const ACTION_COLOR = { created: '#00ADB5', completed: '#3ec98a', rescheduled: '#f4b740', updated: '#8a8f96', deleted: '#ef4f5e' };

const SNAP_FILTER_CATS = [
  { label: 'All',        value: null },
  { label: 'DSA',        value: 'DSA' },
  { label: 'Projects',   value: 'Project' },
  { label: 'LinkedIn',   value: 'Content' },
  { label: 'Internship', value: 'CRM' },
  { label: 'Learning',   value: 'Personal' },
  { label: 'Other',      value: 'Other' },
];

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
function Skel({ w = '100%', h = 14, r = 5 }) {
  return (
    <span style={{
      display: 'inline-block', width: w, height: h, borderRadius: r,
      background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// ─── Snap column ─────────────────────────────────────────────────────────────
function SnapColumn({ title, count, color, items, loading }) {
  return (
    <div style={{
      background: '#222831', border: '1px solid #2c313a',
      borderRadius: 9, padding: '12px 12px 10px',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 3px ${color}22` }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#EEEEEE' }}>{title}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color, background: `${color}1a`, padding: '1px 7px', borderRadius: 9 }}>
          {loading ? '…' : count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          [1,2].map(i => <Skel key={i} h={54} r={7} />)
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#8a8f96', fontSize: 12 }}>All clear ✓</div>
        ) : items.map((it, i) => (
          <div key={i} style={{
            background: '#393E46', border: '1px solid #454a52',
            borderLeft: `3px solid ${color}`, borderRadius: 7, padding: '9px 10px',
          }}>
            <div style={{ fontSize: 13, color: '#EEEEEE', fontWeight: 500, lineHeight: 1.3 }}>{it.t}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
              <span className="mono" style={{ fontSize: 10.5, color: '#8a8f96' }}>{it.meta}</span>
              <span className="mono" style={{ fontSize: 10.5, color }}>{it.age}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [tasks,          setTasks]          = useState([]);
  const [activity,       setActivity]       = useState([]);
  const [overdueCheck,   setOverdueCheck]   = useState(null);
  const [dsaStats,       setDsaStats]       = useState(null);
  const [internships,    setInternships]    = useState([]);
  const [followups,      setFollowups]      = useState([]);
  const [goals,          setGoals]          = useState([]);
  const [loadingTasks,   setLoadingTasks]   = useState(true);
  const [loadingActivity,setLoadingActivity]= useState(true);
  const [error,          setError]          = useState(null);
  const [rescheduling,   setRescheduling]   = useState(false);
  const [bannerDismissed,setBannerDismissed]= useState(false);
  const [filterCat,      setFilterCat]      = useState(null);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    setLoadingTasks(true); setLoadingActivity(true); setError(null);

    Promise.allSettled([
      api.get('/tasks'),
      api.get('/activity'),
      api.get('/tasks/overdue-check'),
      api.get('/dsa/stats'),
      api.get('/internships'),
      api.get('/internships/followups'),
      api.get('/goals'),
    ]).then(([tasksR, activityR, overdueR, dsaR, internR, fuR, goalsR]) => {
      if (tasksR.status   === 'fulfilled') setTasks(tasksR.value.data);
      else setError('Could not load tasks.');
      if (activityR.status === 'fulfilled') setActivity(activityR.value.data);
      if (overdueR.status  === 'fulfilled') setOverdueCheck(overdueR.value.data);
      if (dsaR.status      === 'fulfilled') setDsaStats(dsaR.value.data);
      if (internR.status   === 'fulfilled') setInternships(internR.value.data);
      if (fuR.status       === 'fulfilled') setFollowups(fuR.value.data);
      if (goalsR.status    === 'fulfilled') setGoals(goalsR.value.data);
    }).finally(() => {
      setLoadingTasks(false);
      setLoadingActivity(false);
    });
  }, []);

  // ── Close filter dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    if (!filterOpen) return;
    const handle = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [filterOpen]);

  // ── Reschedule all suggestions ─────────────────────────────────────────────
  const handleRescheduleAll = async () => {
    if (!overdueCheck?.suggestions?.length) return;
    setRescheduling(true);
    try {
      await Promise.all(
        overdueCheck.suggestions.map(s =>
          api.put(`/tasks/${s.taskId}/reschedule`, { newDueDate: s.suggestedDue })
        )
      );
      // Refresh tasks + overdue check
      const [tasksR, overdueR] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/overdue-check'),
      ]);
      setTasks(tasksR.data);
      setOverdueCheck(overdueR.data);
      setBannerDismissed(true);
    } catch {
      // silently ignore partial failures
    } finally {
      setRescheduling(false);
    }
  };

  // ── Computed summary values ────────────────────────────────────────────────
  const pending    = tasks.filter(t => t.status !== 'Done').length;
  const dsaToday   = dsaStats?.todayCount ?? tasks.filter(t => t.category === 'DSA' && t.status === 'Done' && isToday(t.updatedAt)).length;
  const dsaStreak  = dsaStats?.streak ?? 0;
  const appsSent   = internships.length > 0
    ? internships.filter(i => i.status !== 'Identified').length
    : tasks.filter(t => t.category === 'CRM').length;
  const goalTasks     = tasks.filter(t => t.category === 'Goals');
  const activeGoals   = goals.filter(g => g.status !== 'Complete');
  const goalsPct      = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : goalTasks.length > 0
      ? Math.round((goalTasks.filter(t => t.status === 'Done').length / goalTasks.length) * 100)
      : 0;
  const atRiskGoals   = goals.filter(g => g.status === 'At Risk' || g.status === 'Delayed');

  const overdueCount = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const snapFilter   = (t) => !filterCat || t.category === filterCat.value;

  const summary = [
    { label: 'Tasks Pending',     value: loadingTasks ? '…' : String(pending),            delta: `${overdueCount} overdue`,     deltaColor: overdueCount > 0 ? '#ef4f5e' : '#8a8f96', sub: `${tasks.filter(t=>t.status==='In Progress').length} in progress`, icon: Icons.tasks, link: '/tasks' },
    { label: 'DSA Solved Today',  value: loadingTasks ? '…' : String(dsaToday),            delta: `${dsaStreak} day streak`,     deltaColor: '#00ADB5',  sub: `${dsaStats ? (dsaStats.total - dsaStats.solved) : tasks.filter(t=>t.category==='DSA'&&t.status!=='Done').length} remaining`,         icon: Icons.dsa,   link: '/dsa' },
    { label: 'Applications Sent', value: loadingTasks ? '…' : String(appsSent),            delta: `${internships.filter(i=>['Screening','Technical','Final'].includes(i.status)).length} in pipeline`, deltaColor: '#3ec98a', sub: internships.length > 0 ? `${internships.filter(i=>i.status==='Offer').length} offers received` : 'tracked in CRM',  icon: Icons.crm,   link: '/internship' },
    { label: 'Goals Progress',    value: loadingTasks ? '…' : (goals.length || goalTasks.length ? `${goalsPct}%` : '—'), delta: atRiskGoals.length > 0 ? `${atRiskGoals.length} at risk` : `${goals.filter(g=>g.status==='Complete').length}/${goals.length} complete`, deltaColor: atRiskGoals.length > 0 ? '#f4b740' : '#3ec98a', sub: goals.length > 0 ? `${activeGoals.length} active goals` : 'Goals category tasks', icon: Icons.goals, link: '/goals' },
  ];

  // ── Today's snapshot data ──────────────────────────────────────────────────
  const todayStart  = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd    = new Date(); todayEnd.setHours(23,59,59,999);
  const nextWeekEnd = new Date(todayStart); nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const overdueItems  = tasks
    .filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < todayStart)
    .filter(snapFilter)
    .slice(0, 3)
    .map(t => ({ t: t.title, meta: t.category, age: `${daysLate(t.dueDate)} days late` }));

  const dueTodayItems = tasks
    .filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= todayEnd)
    .filter(snapFilter)
    .slice(0, 3)
    .map(t => ({ t: t.title, meta: t.category, age: formatDate(t.dueDate) }));

  const upcomingItems = tasks
    .filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) > todayEnd && new Date(t.dueDate) <= nextWeekEnd)
    .filter(snapFilter)
    .slice(0, 3)
    .map(t => ({ t: t.title, meta: t.category, age: formatDate(t.dueDate) }));

  // ── Render ─────────────────────────────────────────────────────────────────
  const showBanner = !bannerDismissed && overdueCheck?.suggestions?.length > 0;

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        .home-activity-scroll::-webkit-scrollbar{width:4px}
        .home-activity-scroll::-webkit-scrollbar-track{background:#2c313a;border-radius:2px}
        .home-activity-scroll::-webkit-scrollbar-thumb{background:rgba(0,173,181,.45);border-radius:2px}
        .home-activity-scroll::-webkit-scrollbar-thumb:hover{background:rgba(0,173,181,.75)}
      `}</style>
      <div style={{ padding: '22px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', boxSizing: 'border-box' }}>

        {/* Error banner */}
        {error && (
          <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '11px 16px', color: '#ef4f5e', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Overdue reschedule banner */}
        {showBanner && (
          <div style={{
            background: 'rgba(244,183,64,.07)', border: '1px solid rgba(244,183,64,.25)',
            borderRadius: 10, padding: '12px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: '#f4b740', display: 'flex' }}>{Icons.warn}</span>
              <span style={{ fontSize: 13, color: '#EEEEEE' }}>
                <b style={{ color: '#f4b740' }}>{overdueCheck.suggestions.length} task{overdueCheck.suggestions.length > 1 ? 's' : ''} overdue</b>
                {' '}— smart reschedule available
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setBannerDismissed(true)} style={{
                background: 'transparent', border: '1px solid rgba(244,183,64,.3)',
                borderRadius: 7, color: '#8a8f96', fontSize: 12, padding: '6px 12px', cursor: 'pointer',
              }}>Dismiss</button>
              <button onClick={handleRescheduleAll} disabled={rescheduling} style={{
                background: rescheduling ? 'rgba(0,173,181,.4)' : '#00ADB5',
                border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 600,
                fontSize: 12, padding: '6px 14px', cursor: rescheduling ? 'not-allowed' : 'pointer',
              }}>{rescheduling ? 'Rescheduling…' : 'Reschedule All'}</button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {summary.map(s => (
            <Link key={s.label} to={s.link} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#393E46', border: '1px solid #454a52',
                borderRadius: 12, padding: '18px 18px 16px',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
              }}>
                <span style={{ position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, background: '#00ADB5', borderRadius: '0 3px 3px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 11, color: '#8a8f96', letterSpacing: 0.6, textTransform: 'uppercase' }}>{s.label}</span>
                  <span style={{ color: '#00ADB5', display: 'flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,173,181,.08)', borderRadius: 6 }}>{s.icon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1, color: '#EEEEEE' }}>
                    {loadingTasks ? <Skel w={48} h={32} r={6} /> : s.value}
                  </span>
                  {!loadingTasks && <span className="mono" style={{ fontSize: 11, color: s.deltaColor }}>{s.delta}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#a7adb4' }}>{loadingTasks ? <Skel w={80} h={10} /> : s.sub}</span>
                  {!loadingTasks && <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>view →</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Snapshot + Activity */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, minHeight: 0 }}>

          {/* Today's snapshot */}
          <section style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 12, padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#EEEEEE' }}>Today's snapshot</h3>
                <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>
                  {loadingTasks ? '…' : `${overdueItems.length + dueTodayItems.length + upcomingItems.length} items`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div ref={filterRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setFilterOpen(o => !o)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      background: filterCat ? 'rgba(0,173,181,.1)' : '#393E46',
                      color: filterCat ? '#00ADB5' : '#a7adb4',
                      border: `1px solid ${filterCat ? '#00ADB5' : '#454a52'}`,
                      borderRadius: 8, padding: '7px 11px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    }}
                  >
                    {Icons.filter}{filterCat ? ` Filter · ${filterCat.label}` : ' Filter'}
                  </button>
                  {filterOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                      background: '#2c313a', border: '1px solid #454a52', borderRadius: 8,
                      zIndex: 100, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,.4)',
                      overflow: 'hidden',
                    }}>
                      {SNAP_FILTER_CATS.map(cat => {
                        const isSelected = (filterCat?.value ?? null) === cat.value;
                        return (
                          <button
                            key={cat.label}
                            onClick={() => { setFilterCat(cat.value === null ? null : cat); setFilterOpen(false); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '9px 14px', border: 'none', textAlign: 'left', cursor: 'pointer',
                              background: isSelected ? 'rgba(0,173,181,.1)' : 'transparent',
                              color: isSelected ? '#00ADB5' : '#a7adb4',
                              fontSize: 13,
                            }}
                          >
                            {cat.label}
                            {isSelected && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Link to="/tasks" style={{ textDecoration: 'none' }}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00ADB5', color: '#06222a', fontWeight: 600, fontSize: 13, border: '1px solid #00ADB5', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', boxShadow: '0 1px 0 rgba(0,0,0,.25), inset 0 -1px 0 rgba(0,0,0,.2)' }}>
                    {Icons.plus} Add task
                  </button>
                </Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, flex: 1, minHeight: 0 }}>
              <SnapColumn title="Overdue"    count={overdueItems.length}  color="#ef4f5e" items={overdueItems}   loading={loadingTasks} />
              <SnapColumn title="Due today"  count={dueTodayItems.length} color="#f4b740" items={dueTodayItems}  loading={loadingTasks} />
              <SnapColumn title="Upcoming"   count={upcomingItems.length} color="#3ec98a" items={upcomingItems}  loading={loadingTasks} />
              <SnapColumn title="Follow-ups" count={followups.length}     color="#a78bfa"
                items={followups.slice(0,3).map(f => ({ t: f.company, meta: f.role || f.status, age: f.followUpDate ? new Date(f.followUpDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'auto' }))}
                loading={loadingTasks} />
            </div>
          </section>

          {/* Recent activity */}
          <section style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 12, padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#EEEEEE' }}>Recent activity</h3>
                <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>last 20</span>
              </div>
              <Link to="/activity" style={{ textDecoration: 'none' }}>
                <span className="mono" style={{ fontSize: 11, color: '#00ADB5', cursor: 'pointer' }}>view all →</span>
              </Link>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="home-activity-scroll" style={{ overflowY: 'auto', maxHeight: 400 }}>
                {loadingActivity ? (
                  [1,2,3,4,5].map(i => (
                    <div key={i} style={{ padding: '12px 2px', borderTop: i > 1 ? '1px solid #2c313a' : 'none', display: 'flex', gap: 12 }}>
                      <Skel w={8} h={8} r="50%" />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <Skel w="80%" h={12} />
                        <Skel w="40%" h={9} />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#8a8f96', fontSize: 12 }}>
                    No activity yet — start adding tasks!
                  </div>
                ) : (
                  activity.slice(0, 8).map((a, i) => (
                    <div key={a._id || i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr auto', gap: 12, padding: '11px 2px', borderTop: i ? '1px solid #2c313a' : 'none', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACTION_COLOR[a.action] || '#8a8f96', flexShrink: 0, boxShadow: `0 0 0 3px ${ACTION_COLOR[a.action] || '#8a8f96'}22` }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#EEEEEE', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <span className="mono" style={{ fontSize: 10, color: ACTION_COLOR[a.action] || '#8a8f96', letterSpacing: 0.6, textTransform: 'uppercase' }}>{a.action}</span>
                          <span className="mono" style={{ fontSize: 10.5, color: '#8a8f96' }}>{timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!loadingActivity && activity.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2c313a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#a7adb4' }}><b style={{ color: '#EEEEEE' }}>{activity.length}</b> events total</span>
                  <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>tasks · crm · dsa</span>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
