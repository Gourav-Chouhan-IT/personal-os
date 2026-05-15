// Internship CRM — 7-column Kanban pipeline with DnD, list view, CSV export
import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, DragOverlay, useDroppable, useDraggable, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import api from '../api/axios.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ['Identified', 'Applied', 'Screening', 'Technical', 'Final', 'Offer', 'Rejected'];
const RATINGS  = ['Dream', 'Good', 'Okay', 'Backup'];

const STATUS_COLOR = {
  Identified: '#8a8f96', Applied: '#00ADB5', Screening: '#f4b740',
  Technical: '#e07b39', Final: '#a78bfa', Offer: '#3ec98a', Rejected: '#ef4f5e',
};
const RATING_COLOR  = { Dream: '#f4b740', Good: '#3ec98a', Okay: '#8a8f96', Backup: '#454a52' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }
function todayISO()  { return new Date().toISOString().split('T')[0]; }

function exportCSV(items) {
  const headers = ['Company', 'Role', 'Status', 'Rating', 'Date Applied', 'Follow-up', 'Contact', 'Cold Email Sent'];
  const rows = items.map(i => [
    i.company, i.role || '', i.status, i.rating || '',
    i.dateApplied  ? new Date(i.dateApplied).toLocaleDateString()  : '',
    i.followUpDate ? new Date(i.followUpDate).toLocaleDateString() : '',
    i.contactPerson || '', i.coldEmailSent ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'internships.csv' });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const Icons = {
  plus:    <Ic d={<path d="M12 5v14M5 12h14"/>} sw={2} />,
  list:    <Ic d={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>} />,
  kanban:  <Ic d={<><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></>} />,
  export:  <Ic d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />,
  trash:   <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></>} size={13} />,
  warn:    <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={14} />,
  sort:    <Ic d={<><path d="M3 6h18M7 12h10M11 18h2"/></>} size={13} />,
  x:       <Ic d={<><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>} size={13} sw={2} />,
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 13, r = 4 }) {
  return <span style={{ display: 'inline-block', width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ── Input style ───────────────────────────────────────────────────────────────
const INP = { background: '#2c313a', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 13, padding: '9px 11px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const LBL = { fontSize: 11, color: '#8a8f96', marginBottom: 5, display: 'block' };

// ── Internship Modal (Add / Edit) ─────────────────────────────────────────────
function InternshipModal({ initial, onClose, onSave, onDelete }) {
  const blank = { company: '', role: '', jdLink: '', jdText: '', dateApplied: todayISO(), status: 'Identified', followUpDate: '', contactPerson: '', contactLinkedIn: '', coldEmailSent: false, coldEmailText: '', notes: '', rating: '' };
  const [form, setForm] = useState(initial ? { ...blank, ...initial, dateApplied: initial.dateApplied ? new Date(initial.dateApplied).toISOString().split('T')[0] : '', followUpDate: initial.followUpDate ? new Date(initial.followUpDate).toISOString().split('T')[0] : '' } : blank);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const days = daysSince(form.dateApplied);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px 22px', width: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>{isEdit ? form.company : 'Add Company'}</h3>
          {isEdit && days !== null && <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>{days} days since applied</span>}
        </div>

        {/* Core fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Company *</label><input style={INP} value={form.company} onChange={e => set('company', e.target.value)} required /></div>
          <div><label style={LBL}>Role</label><input style={INP} value={form.role} onChange={e => set('role', e.target.value)} placeholder="Software Engineer Intern" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Rating</label>
            <select style={INP} value={form.rating} onChange={e => set('rating', e.target.value)}>
              <option value="">—</option>
              {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Status</label>
            <select style={INP} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Date Applied</label><input style={INP} type="date" value={form.dateApplied} onChange={e => set('dateApplied', e.target.value)} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>JD Link</label><input style={INP} value={form.jdLink} onChange={e => set('jdLink', e.target.value)} placeholder="https://…" /></div>
          <div><label style={LBL}>Follow-up Date</label><input style={INP} type="date" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} /></div>
        </div>

        <div><label style={LBL}>JD Text / Description</label><textarea style={{ ...INP, resize: 'vertical', minHeight: 60 }} value={form.jdText} onChange={e => set('jdText', e.target.value)} placeholder="Paste job description…" /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Contact Person</label><input style={INP} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></div>
          <div><label style={LBL}>Contact LinkedIn</label><input style={INP} value={form.contactLinkedIn} onChange={e => set('contactLinkedIn', e.target.value)} placeholder="linkedin.com/in/…" /></div>
        </div>

        <div>
          <label style={{ ...LBL, marginBottom: 8 }}>Cold Email</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.coldEmailSent} onChange={e => set('coldEmailSent', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#00ADB5', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#EEEEEE' }}>Cold email sent</span>
          </label>
          {form.coldEmailSent && (
            <textarea style={{ ...INP, resize: 'vertical', minHeight: 60, marginTop: 8 }} value={form.coldEmailText} onChange={e => set('coldEmailText', e.target.value)} placeholder="Paste cold email text…" />
          )}
        </div>

        <div><label style={LBL}>Notes</label><textarea style={{ ...INP, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {isEdit
            ? <button type="button" onClick={() => onDelete(initial._id)} style={{ background: 'transparent', border: '1px solid rgba(239,79,94,.35)', borderRadius: 7, color: '#ef4f5e', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>Delete</button>
            : <span />
          }
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background: saving ? 'rgba(0,173,181,.5)' : '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({ item, onClick, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item._id });
  const days = daysSince(item.dateApplied);
  const rc   = item.rating ? RATING_COLOR[item.rating] : null;
  const sc   = STATUS_COLOR[item.status];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        background: '#393E46', border: '1px solid #454a52', borderRadius: 9, padding: '11px 12px',
        cursor: overlay ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging && !overlay ? 0 : 1,
        transform: CSS.Transform.toString(transform),
        boxShadow: overlay ? '0 8px 24px rgba(0,0,0,.4)' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Company + role */}
      <button
        onClick={e => { e.stopPropagation(); onClick(item); }}
        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#EEEEEE', marginBottom: 3 }}>{item.company}</div>
        {item.role && <div style={{ fontSize: 11, color: '#8a8f96', marginBottom: 8 }}>{item.role}</div>}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {rc
          ? <span className="mono" style={{ fontSize: 9.5, color: rc, background: `${rc}15`, border: `1px solid ${rc}30`, borderRadius: 4, padding: '2px 7px' }}>{item.rating}</span>
          : <span />
        }
        <div style={{ display: 'flex', align: 'center', gap: 6 }}>
          {item.coldEmailSent && <span title="Cold email sent" style={{ fontSize: 9.5, color: '#00ADB5' }}>✉</span>}
          {days !== null && <span className="mono" style={{ fontSize: 10, color: '#8a8f96' }}>{days}d</span>}
          {item.followUpDate && new Date(item.followUpDate) <= new Date() && (
            <span title="Follow-up due" style={{ color: '#f4b740', fontSize: 11 }}>⏰</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ status, cards, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const sc = STATUS_COLOR[status];

  return (
    <div ref={setNodeRef} style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', background: isOver ? 'rgba(255,255,255,.03)' : 'transparent', borderRadius: 10, border: `1px solid ${isOver ? sc + '50' : '#2c313a'}`, transition: 'border-color .15s, background .15s' }}>
      {/* Column header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #2c313a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#EEEEEE' }}>{status}</span>
        </div>
        <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, borderRadius: 9, padding: '1px 6px' }}>{cards.length}</span>
      </div>
      {/* Cards */}
      <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
        {cards.map(card => (
          <KanbanCard key={card._id} item={card} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({ items, onItemClick, sortKey, sortDir, onSort }) {
  const col = (key, label, w) => (
    <th onClick={() => onSort(key)} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: sortKey === key ? '#00ADB5' : '#8a8f96', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', width: w }}>
      {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2c313a' }}>
            {col('company', 'Company', 160)}
            {col('role',    'Role',    150)}
            {col('status',  'Status',  100)}
            {col('rating',  'Rating',  80)}
            {col('dateApplied', 'Applied', 110)}
            {col('followUpDate', 'Follow-up', 110)}
            <th style={{ padding: '10px 12px', width: 60 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const sc  = STATUS_COLOR[item.status];
            const rc  = item.rating ? RATING_COLOR[item.rating] : null;
            const days = daysSince(item.dateApplied);
            return (
              <tr key={item._id} style={{ borderBottom: '1px solid #2c313a' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px 12px' }}>
                  <button onClick={() => onItemClick(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EEEEEE', fontSize: 13, fontWeight: 600, padding: 0, textAlign: 'left' }}>{item.company}</button>
                </td>
                <td style={{ padding: '12px 12px', fontSize: 12, color: '#8a8f96' }}>{item.role || '—'}</td>
                <td style={{ padding: '12px 12px' }}>
                  <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, border: `1px solid ${sc}30`, borderRadius: 4, padding: '2px 7px' }}>{item.status}</span>
                </td>
                <td style={{ padding: '12px 12px' }}>
                  {rc && <span className="mono" style={{ fontSize: 10, color: rc, background: `${rc}15`, borderRadius: 4, padding: '2px 7px' }}>{item.rating}</span>}
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ fontSize: 12, color: '#EEEEEE' }}>{fmtDate(item.dateApplied)}</div>
                  {days !== null && <div className="mono" style={{ fontSize: 10, color: '#8a8f96' }}>{days}d ago</div>}
                </td>
                <td style={{ padding: '12px 12px', fontSize: 12, color: item.followUpDate && new Date(item.followUpDate) <= new Date() ? '#f4b740' : '#8a8f96' }}>
                  {fmtDate(item.followUpDate)}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  <button onClick={() => onItemClick(item)} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 6, color: '#8a8f96', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InternshipCRM() {
  const [items,        setItems]        = useState([]);
  const [followups,    setFollowups]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [view,         setView]         = useState('kanban'); // 'kanban' | 'list'
  const [modal,        setModal]        = useState(null);     // null | 'add' | item
  const [sortKey,      setSortKey]      = useState('createdAt');
  const [sortDir,      setSortDir]      = useState('desc');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [activeItem,   setActiveItem]   = useState(null);    // DnD active card
  const [fuOpen,       setFuOpen]       = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [itemsR, fuR] = await Promise.all([
        api.get('/internships'),
        api.get('/internships/followups'),
      ]);
      setItems(itemsR.data);
      setFollowups(fuR.data);
    } catch { setError('Failed to load internship data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    const isEdit = modal && modal !== 'add';
    try {
      if (isEdit) {
        const { data } = await api.put(`/internships/${modal._id}`, form);
        setItems(is => is.map(i => i._id === modal._id ? data : i));
      } else {
        const { data } = await api.post('/internships', form);
        setItems(is => [data, ...is]);
      }
      setModal(null);
      // Refresh followups
      const fuR = await api.get('/internships/followups');
      setFollowups(fuR.data);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/internships/${id}`);
      setItems(is => is.filter(i => i._id !== id));
      setFollowups(fu => fu.filter(i => i._id !== id));
      setModal(null);
    } catch { /* ignore */ }
  };

  // DnD handlers
  const handleDragStart = ({ active }) => {
    setActiveItem(items.find(i => i._id === active.id) || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    const prev = activeItem;
    setActiveItem(null);
    if (!over) return;
    const newStatus = over.id;
    if (!STATUSES.includes(newStatus)) return;
    const item = items.find(i => i._id === active.id);
    if (!item || item.status === newStatus) return;

    setItems(is => is.map(i => i._id === active.id ? { ...i, status: newStatus } : i));
    try {
      const { data } = await api.put(`/internships/${active.id}`, { status: newStatus });
      setItems(is => is.map(i => i._id === active.id ? data : i));
    } catch {
      setItems(is => is.map(i => i._id === active.id ? { ...i, status: prev?.status || item.status } : i));
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Stats
  const total     = items.length;
  const applied   = items.filter(i => i.status !== 'Identified').length;
  const inProgress = items.filter(i => ['Screening', 'Technical', 'Final'].includes(i.status)).length;
  const offers    = items.filter(i => i.status === 'Offer').length;
  const rejected  = items.filter(i => i.status === 'Rejected').length;
  const rejectRate = (applied > 0) ? Math.round((rejected / applied) * 100) : 0;

  // Filtered + sorted list
  const filtered = items
    .filter(i => statusFilter === 'All' || i.status === statusFilter)
    .filter(i => ratingFilter === 'All' || i.rating === ratingFilter)
    .sort((a, b) => {
      let va = a[sortKey] || '', vb = b[sortKey] || '';
      if (sortKey === 'dateApplied' || sortKey === 'followUpDate' || sortKey === 'createdAt') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const selStyle = { background: 'rgba(255,255,255,.05)', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 12, padding: '6px 10px', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' };
  const btnStyle = (active) => ({ background: active ? 'rgba(0,173,181,.15)' : 'transparent', border: `1px solid ${active ? 'rgba(0,173,181,.4)' : '#454a52'}`, borderRadius: 7, color: active ? '#00ADB5' : '#8a8f96', fontSize: 12, padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 });

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <Skel h={32} w={220} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[1,2,3,4].map(i => <Skel key={i} h={72} r={10} />)}
        </div>
        <Skel h={300} r={10} />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '12px 16px', color: '#ef4f5e', fontSize: 13 }}>{error} <button onClick={load} style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(239,79,94,.4)', borderRadius: 6, color: '#ef4f5e', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Retry</button></div>}

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <div className="crm-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'Total Tracked', value: total,      color: '#8a8f96' },
            { label: 'Applied',       value: applied,    color: '#00ADB5' },
            { label: 'In Progress',   value: inProgress, color: '#f4b740' },
            { label: 'Offers',        value: offers,     color: '#3ec98a' },
            { label: 'Reject Rate',   value: `${rejectRate}%`, color: rejected > 0 ? '#ef4f5e' : '#8a8f96' },
          ].map(s => (
            <div key={s.label} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 10, padding: '12px 14px' }}>
              <div className="mono" style={{ fontSize: 10, color: '#8a8f96', textTransform: 'uppercase', letterSpacing: .5 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginTop: 4, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Follow-ups banner ─────────────────────────────────────────── */}
        {followups.length > 0 && (
          <div style={{ background: 'rgba(244,183,64,.06)', border: '1px solid rgba(244,183,64,.25)', borderRadius: 10, flexShrink: 0 }}>
            <button onClick={() => setFuOpen(o => !o)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', color: '#f4b740' }}>
              <span style={{ display: 'flex' }}>{Icons.warn}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{followups.length} follow-up{followups.length > 1 ? 's' : ''} due</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#8a8f96' }}>{fuOpen ? '▲' : '▼'}</span>
            </button>
            {fuOpen && (
              <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {followups.map(f => (
                  <button key={f._id} onClick={() => setModal(f)} style={{ fontSize: 12, background: 'rgba(244,183,64,.1)', border: '1px solid rgba(244,183,64,.22)', borderRadius: 6, padding: '4px 10px', color: '#f4b740', cursor: 'pointer' }}>
                    {f.company} — {f.role || f.status}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button style={btnStyle(view === 'kanban')} onClick={() => setView('kanban')}>{Icons.kanban} Kanban</button>
          <button style={btnStyle(view === 'list')}   onClick={() => setView('list')}>{Icons.list} List</button>

          {view === 'list' && <>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
              <option value="All">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={selStyle}>
              <option value="All">All Ratings</option>
              {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => exportCSV(items)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 12, padding: '7px 12px', cursor: 'pointer' }}>
              {Icons.export} Export CSV
            </button>
            <button onClick={() => setModal('add')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '7px 14px', cursor: 'pointer' }}>
              {Icons.plus} Add Company
            </button>
          </div>
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8f96', fontSize: 13 }}>
            No internships tracked yet. Add your first company to get started.
          </div>
        )}

        {/* ── Kanban board ──────────────────────────────────────────────── */}
        {view === 'kanban' && items.length > 0 && (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0, paddingBottom: 4 }}>
                {STATUSES.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    cards={items.filter(i => i.status === status)}
                    onCardClick={(item) => setModal(item)}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeItem
                  ? <div style={{ width: 200 }}><KanbanCard item={activeItem} onClick={() => {}} overlay /></div>
                  : null
                }
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* ── List view ─────────────────────────────────────────────────── */}
        {view === 'list' && filtered.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ListView
              items={filtered}
              onItemClick={setModal}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </div>
        )}

        {view === 'list' && filtered.length === 0 && items.length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#8a8f96', fontSize: 13 }}>No matches for current filters.</div>
        )}
      </div>

      {/* ── Internship modal ──────────────────────────────────────────────── */}
      {modal && (
        <InternshipModal
          initial={modal !== 'add' ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
