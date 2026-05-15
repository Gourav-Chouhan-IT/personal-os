// Tasks page — full CRUD task manager with list/kanban views, subtasks, and overdue handling
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES   = ['DSA', 'Project', 'CRM', 'Content', 'Goals', 'Personal', 'Other'];
const PRIORITIES   = ['High', 'Medium', 'Low'];
const STATUSES     = ['Todo', 'In Progress', 'Done'];
const TIME_HORIZONS = ['Daily', 'Weekly', 'Phase', 'Milestone'];

const PRIORITY_COLOR = { High: '#ef4f5e', Medium: '#f4b740', Low: '#3ec98a' };
const STATUS_COLOR   = { Todo: '#8a8f96', 'In Progress': '#00ADB5', Done: '#3ec98a' };
const CAT_COLOR      = {
  DSA: '#00ADB5', Project: '#b48cf2', CRM: '#3ec98a',
  Content: '#f4b740', Goals: '#ef4f5e', Personal: '#a7adb4', Other: '#8a8f96',
};

const EMPTY_FORM = { title: '', category: 'Other', priority: 'Medium', dueDate: '', timeHorizon: 'Daily', notes: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysLate(dueDate) {
  if (!dueDate) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - due) / 86400000));
}
function isOverdue(task) {
  return task.status !== 'Done' && task.dueDate && new Date(task.dueDate) < new Date();
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Tiny icon set ────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const Icons = {
  plus:    <Ic d={<><path d="M12 5v14M5 12h14"/></>} sw={2} />,
  edit:    <Ic d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></>} />,
  trash:   <Ic d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} />,
  check:   <Ic d={<><path d="M4 12l5 5L20 6"/></>} sw={2.2} />,
  chevron: <Ic d={<><path d="m6 9 6 6 6-6"/></>} sw={2} />,
  list:    <Ic d={<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></>} />,
  kanban:  <Ic d={<><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="8" rx="1"/></>} />,
  warn:    <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={14} />,
  x:       <Ic d={<><path d="M18 6 6 18M6 6l12 12"/></>} sw={2} />,
  sub:     <Ic d={<><path d="M9 18l6-6-6-6"/></>} sw={2} />,
};

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 11px',
  background: '#222831', border: '1px solid #454a52', borderRadius: 7,
  color: '#EEEEEE', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 11, color: '#8a8f96',
  fontFamily: 'Geist Mono, monospace', letterSpacing: 0.6,
  textTransform: 'uppercase', marginBottom: 5,
};

// ─── Task Modal (Add / Edit) ──────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose }) {
  const [form, setForm]   = useState(task ? {
    title: task.title, category: task.category, priority: task.priority,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    timeHorizon: task.timeHorizon, notes: task.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true); setErr('');
    try { await onSave(form); }
    catch { setErr('Failed to save task. Try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#EEEEEE' }}>{task ? 'Edit task' : 'New task'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', display: 'flex', padding: 4 }}>{Icons.x}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="What needs to be done?" autoFocus />
          </div>

          {/* Row: Category + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Due Date + Time Horizon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }} value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)} min={todayISO()} />
            </div>
            <div>
              <label style={labelStyle}>Time Horizon</label>
              <select style={inputStyle} value={form.timeHorizon} onChange={e => set('timeHorizon', e.target.value)}>
                {TIME_HORIZONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes…" />
          </div>

          {err && <p style={{ margin: 0, color: '#ef4f5e', fontSize: 12 }}>{err}</p>}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid #454a52',
              borderRadius: 8, color: '#8a8f96', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 18px', background: saving ? 'rgba(0,173,181,.4)' : '#00ADB5',
              border: 'none', borderRadius: 8, color: '#06222a', fontWeight: 600,
              fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
            }}>{saving ? 'Saving…' : (task ? 'Save changes' : 'Add task')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Subtask list (rendered inside expanded row) ──────────────────────────────
function SubtaskList({ task, onUpdate }) {
  const [newText, setNewText] = useState('');
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef(null);

  const patch = async (subtasks) => {
    setSaving(true);
    try { const { data } = await api.put(`/tasks/${task._id}`, { subtasks }); onUpdate(data); }
    finally { setSaving(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const t = newText.trim(); if (!t) return;
    await patch([...task.subtasks, { title: t, done: false }]);
    setNewText('');
    inputRef.current?.focus();
  };

  const handleToggle = (id) =>
    patch(task.subtasks.map(s => s._id === id ? { ...s, done: !s.done } : s));

  const handleDelete = (id) =>
    patch(task.subtasks.filter(s => s._id !== id));

  return (
    <div style={{ padding: '10px 0 4px 24px' }}>
      {task.subtasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {task.subtasks.map(s => (
            <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => handleToggle(s._id)} style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                background: s.done ? '#00ADB5' : 'transparent',
                border: `1.5px solid ${s.done ? '#00ADB5' : '#454a52'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#06222a', padding: 0,
              }}>
                {s.done && <Ic d={<path d="M4 12l5 5L20 6"/>} size={10} sw={2.5} />}
              </button>
              <span style={{ flex: 1, fontSize: 12.5, color: s.done ? '#8a8f96' : '#EEEEEE',
                textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.title}
              </span>
              <button onClick={() => handleDelete(s._id)} style={{
                background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer',
                padding: '0 2px', display: 'flex', opacity: 0.6,
              }}><Ic d={<path d="M18 6 6 18M6 6l12 12"/>} size={12} sw={2} /></button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6 }}>
        <input ref={inputRef} value={newText} onChange={e => setNewText(e.target.value)}
          placeholder="Add subtask…" disabled={saving}
          style={{ ...inputStyle, padding: '5px 9px', fontSize: 12, flex: 1 }} />
        <button type="submit" disabled={saving || !newText.trim()} style={{
          background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a',
          padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
          opacity: (!newText.trim() || saving) ? 0.5 : 1,
        }}>Add</button>
      </form>
    </div>
  );
}

// ─── Task row (list view) ─────────────────────────────────────────────────────
function TaskRow({ task, onEdit, onDelete, onStatusChange, onUpdate, expanded, onToggleExpand }) {
  const overdue   = isOverdue(task);
  const late      = overdue ? daysLate(task.dueDate) : 0;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(true);
    await onDelete(task._id);
  };

  return (
    <div style={{
      background: '#393E46',
      border: '1px solid #454a52',
      borderLeft: `3px solid ${overdue ? '#ef4f5e' : 'transparent'}`,
      borderRadius: 9, marginBottom: 5, overflow: 'hidden',
      opacity: deleting ? 0.5 : 1,
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
        {/* Expand toggle */}
        <button onClick={() => onToggleExpand(task._id)} style={{
          background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer',
          display: 'flex', padding: 2, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms',
        }}>{Icons.sub}</button>

        {/* Title + late badge */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 500, color: task.status === 'Done' ? '#8a8f96' : '#EEEEEE',
            textDecoration: task.status === 'Done' ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title}</span>
          {overdue && (
            <span className="mono" style={{
              fontSize: 10, color: '#ef4f5e', background: 'rgba(239,79,94,.12)',
              padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap', flexShrink: 0,
            }}>{late}d late</span>
          )}
          {task.rescheduledCount >= 3 && (
            <span style={{ color: '#f4b740', display: 'flex', flexShrink: 0 }}>{Icons.warn}</span>
          )}
        </div>

        {/* Category chip */}
        <span className="mono" style={{
          fontSize: 10, color: CAT_COLOR[task.category] || '#8a8f96',
          background: `${CAT_COLOR[task.category] || '#8a8f96'}18`,
          border: `1px solid ${CAT_COLOR[task.category] || '#8a8f96'}33`,
          padding: '2px 7px', borderRadius: 5, letterSpacing: 0.3, textTransform: 'uppercase',
          flexShrink: 0,
        }}>{task.category}</span>

        {/* Priority dot + label */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[task.priority], flexShrink: 0 }} />
          <span className="mono" style={{ fontSize: 10.5, color: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
        </span>

        {/* Due date */}
        <span className="mono" style={{ fontSize: 11, color: overdue ? '#ef4f5e' : '#8a8f96', flexShrink: 0 }}>
          {formatDate(task.dueDate)}
        </span>

        {/* Status select */}
        <select
          value={task.status}
          onChange={e => onStatusChange(task._id, e.target.value)}
          style={{
            background: `${STATUS_COLOR[task.status]}18`, border: `1px solid ${STATUS_COLOR[task.status]}44`,
            borderRadius: 6, color: STATUS_COLOR[task.status], fontSize: 11,
            padding: '3px 6px', cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {STATUSES.map(s => <option key={s} value={s} style={{ background: '#393E46', color: '#EEEEEE' }}>{s}</option>)}
        </select>

        {/* Subtask count */}
        {task.subtasks?.length > 0 && (
          <span className="mono" style={{ fontSize: 10, color: '#8a8f96', flexShrink: 0 }}>
            {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
          </span>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(task)} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', padding: 4, display: 'flex' }}>{Icons.edit}</button>
          <button onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', padding: 4, display: 'flex' }}>{Icons.trash}</button>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && <SubtaskList task={task} onUpdate={onUpdate} />}
    </div>
  );
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
function KanbanCard({ task, onEdit, onDelete, onStatusChange }) {
  const overdue = isOverdue(task);
  const NEXT = { 'Todo': 'In Progress', 'In Progress': 'Done' };

  return (
    <div style={{
      background: '#222831', border: '1px solid #454a52',
      borderLeft: `3px solid ${overdue ? '#ef4f5e' : CAT_COLOR[task.category] || '#454a52'}`,
      borderRadius: 8, padding: '11px 13px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#EEEEEE', lineHeight: 1.35, flex: 1 }}>{task.title}</span>
        <button onClick={() => onEdit(task)} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>{Icons.edit}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 10, color: CAT_COLOR[task.category] || '#8a8f96' }}>{task.category}</span>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: PRIORITY_COLOR[task.priority] }} />
        <span className="mono" style={{ fontSize: 10, color: '#8a8f96' }}>{formatDate(task.dueDate)}</span>
        {overdue && <span className="mono" style={{ fontSize: 10, color: '#ef4f5e' }}>{daysLate(task.dueDate)}d late</span>}
        {task.subtasks?.length > 0 && (
          <span className="mono" style={{ fontSize: 10, color: '#8a8f96', marginLeft: 'auto' }}>
            {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} sub
          </span>
        )}
      </div>
      {NEXT[task.status] && (
        <button onClick={() => onStatusChange(task._id, NEXT[task.status])} style={{
          marginTop: 9, width: '100%', background: 'rgba(0,173,181,.08)', border: '1px solid rgba(0,173,181,.25)',
          borderRadius: 6, color: '#00ADB5', fontSize: 11, fontWeight: 500, padding: '5px 0',
          cursor: 'pointer', fontFamily: 'Geist Mono, monospace',
        }}>→ Move to {NEXT[task.status]}</button>
      )}
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanColumn({ title, color, tasks, onEdit, onDelete, onStatusChange }) {
  return (
    <div style={{
      background: '#393E46', border: '1px solid #454a52',
      borderTop: `2px solid ${color}`, borderRadius: 10,
      padding: '14px 14px 10px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#EEEEEE' }}>{title}</span>
        <span className="mono" style={{ fontSize: 11, color, background: `${color}1a`, padding: '1px 7px', borderRadius: 9 }}>
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a8f96', fontSize: 12 }}>No tasks</div>
      ) : (
        tasks.map(t => (
          <KanbanCard key={t._id} task={t} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))
      )}
    </div>
  );
}

// ─── Filter/Sort select ───────────────────────────────────────────────────────
function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span className="mono" style={{ fontSize: 10.5, color: '#8a8f96' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: '#393E46', border: '1px solid #454a52', borderRadius: 7,
        color: value ? '#EEEEEE' : '#8a8f96', fontSize: 12.5, padding: '6px 10px',
        cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
      }}>
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Main Tasks component ─────────────────────────────────────────────────────
export default function Tasks() {
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [view,         setView]         = useState('list');
  const [filters,      setFilters]      = useState({ category: '', priority: '', status: '' });
  const [sort,         setSort]         = useState('dueDate');
  const [showModal,    setShowModal]    = useState(false);
  const [editingTask,  setEditingTask]  = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status)   params.status   = filters.status;
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch {
      setError('Failed to load tasks. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    if (editingTask) {
      const { data } = await api.put(`/tasks/${editingTask._id}`, form);
      setTasks(ts => ts.map(t => t._id === data._id ? data : t));
    } else {
      const { data } = await api.post('/tasks', form);
      setTasks(ts => [data, ...ts]);
    }
    setShowModal(false); setEditingTask(null);
  };

  const handleDelete = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks(ts => ts.filter(t => t._id !== id));
    if (expandedTask === id) setExpandedTask(null);
  };

  const handleStatusChange = async (id, status) => {
    const { data } = await api.put(`/tasks/${id}`, { status });
    setTasks(ts => ts.map(t => t._id === id ? data : t));
  };

  const handleUpdate = (updated) => {
    setTasks(ts => ts.map(t => t._id === updated._id ? updated : t));
  };

  const openAdd  = () => { setEditingTask(null); setShowModal(true); };
  const openEdit = (task) => { setEditingTask(task); setShowModal(true); };
  const toggleExpand = (id) => setExpandedTask(x => x === id ? null : id);
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  // ── Sort + partition ───────────────────────────────────────────────────────
  const sorted = [...tasks].sort((a, b) => {
    if (sort === 'dueDate')  return (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity);
    if (sort === 'priority') return ['High','Medium','Low'].indexOf(a.priority) - ['High','Medium','Low'].indexOf(b.priority);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const chronical = sorted.filter(t => t.rescheduledCount >= 3 && t.status !== 'Done');
  const normal    = sorted.filter(t => t.rescheduledCount < 3 || t.status === 'Done');

  const kanbanCols = [
    { title: 'Todo',        color: '#8a8f96', status: 'Todo' },
    { title: 'In Progress', color: '#00ADB5', status: 'In Progress' },
    { title: 'Done',        color: '#3ec98a', status: 'Done' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '22px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <FilterSelect label="Category" value={filters.category} options={CATEGORIES} onChange={v => setFilter('category', v)} />
        <FilterSelect label="Priority" value={filters.priority} options={PRIORITIES} onChange={v => setFilter('priority', v)} />
        <FilterSelect label="Status"   value={filters.status}   options={STATUSES}   onChange={v => setFilter('status', v)} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="mono" style={{ fontSize: 10.5, color: '#8a8f96' }}>Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            background: '#393E46', border: '1px solid #454a52', borderRadius: 7,
            color: '#EEEEEE', fontSize: 12.5, padding: '6px 10px', cursor: 'pointer',
            outline: 'none', fontFamily: 'inherit',
          }}>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="created">Created</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#393E46', border: '1px solid #454a52', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'list',   icon: Icons.list },
            { id: 'kanban', icon: Icons.kanban },
          ].map(({ id, icon }) => (
            <button key={id} onClick={() => setView(id)} style={{
              background: view === id ? 'rgba(0,173,181,.15)' : 'transparent',
              border: view === id ? '1px solid rgba(0,173,181,.4)' : '1px solid transparent',
              borderRadius: 6, color: view === id ? '#00ADB5' : '#8a8f96',
              cursor: 'pointer', padding: '5px 10px', display: 'flex',
            }}>{icon}</button>
          ))}
        </div>

        {/* Add task */}
        <button onClick={openAdd} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: '#00ADB5', color: '#06222a', fontWeight: 600, fontSize: 13,
          border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          boxShadow: '0 1px 0 rgba(0,0,0,.25), inset 0 -1px 0 rgba(0,0,0,.2)',
        }}>
          {Icons.plus} Add Task
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '12px 16px', color: '#ef4f5e', fontSize: 13 }}>
          {error}
          <button onClick={fetchTasks} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#00ADB5', cursor: 'pointer', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 9, height: 44,
              opacity: 1 - i * 0.15, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Chronically delayed section */}
          {chronical.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: '#f4b740', display: 'flex' }}>{Icons.warn}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f4b740' }}>Chronically delayed</span>
                <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>rescheduled 3+ times</span>
              </div>
              <div style={{ background: 'rgba(244,183,64,.05)', border: '1px solid rgba(244,183,64,.2)', borderRadius: 10, padding: '10px 14px' }}>
                {chronical.map(task => (
                  <TaskRow key={task._id} task={task} onEdit={openEdit} onDelete={handleDelete}
                    onStatusChange={handleStatusChange} onUpdate={handleUpdate}
                    expanded={expandedTask === task._id} onToggleExpand={toggleExpand} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#8a8f96' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#EEEEEE', marginBottom: 6 }}>No tasks yet</div>
              <div style={{ fontSize: 13 }}>Hit "Add Task" to create your first one.</div>
            </div>
          )}

          {/* List view */}
          {view === 'list' && normal.length > 0 && (
            <div>
              {normal.map(task => (
                <TaskRow key={task._id} task={task} onEdit={openEdit} onDelete={handleDelete}
                  onStatusChange={handleStatusChange} onUpdate={handleUpdate}
                  expanded={expandedTask === task._id} onToggleExpand={toggleExpand} />
              ))}
            </div>
          )}

          {/* Kanban view */}
          {view === 'kanban' && (
            <div className="kanban-scroll">
            <div className="kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, alignItems: 'start' }}>
              {kanbanCols.map(col => (
                <KanbanColumn key={col.status} title={col.title} color={col.color}
                  tasks={sorted.filter(t => t.status === col.status)}
                  onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
              ))}
            </div>
            </div>
          )}

          {/* Filtered empty state */}
          {tasks.length > 0 && normal.length === 0 && chronical.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a8f96', fontSize: 13 }}>
              No tasks match the current filters.
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal task={editingTask} onSave={handleSave} onClose={() => { setShowModal(false); setEditingTask(null); }} />
      )}

      {/* Keyframe for skeleton pulse */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}
