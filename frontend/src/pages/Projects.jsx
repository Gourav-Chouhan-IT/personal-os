// Projects page — portfolio grid with detail view (Overview, Milestones, Tasks, Work Log, Notes)
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLOR = { Planning: '#8a8f96', Building: '#f4b740', Complete: '#3ec98a', Deployed: '#00ADB5' };
const TASK_STATUS_COLOR = { Todo: '#8a8f96', 'In Progress': '#f4b740', Done: '#3ec98a' };
const TABS = ['Overview', 'Milestones', 'Tasks', 'Work Log', 'Notes'];

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, size = 15, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const Icons = {
  back:     <Ic d={<><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></>} />,
  plus:     <Ic d={<path d="M12 5v14M5 12h14"/>} sw={2} />,
  trash:    <Ic d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></>} size={13} />,
  github:   <Ic d={<><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></>} size={13} />,
  link:     <Ic d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} size={13} />,
  check:    <Ic d={<path d="M20 6 9 17l-5-5"/>} sw={2.5} size={13} />,
  edit:     <Ic d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} size={13} />,
  warn:     <Ic d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>} size={13} />,
  x:        <Ic d={<><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>} size={13} sw={2} />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const due = new Date(dateStr); due.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return due < now;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w = '100%', h = 13, r = 4 }) {
  return <span style={{ display: 'inline-block', width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,.06)', animation: 'pulse 1.4s ease-in-out infinite' }} />;
}

// ── Input style ───────────────────────────────────────────────────────────────
const INP = { background: '#2c313a', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', fontSize: 13, padding: '9px 11px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const LBL = { fontSize: 11, color: '#8a8f96', marginBottom: 5, display: 'block' };

// ── Add / Edit Project Modal ──────────────────────────────────────────────────
function ProjectModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: '', status: 'Planning', description: '', techStack: [], githubLink: '', liveLink: '', progress: 0 });
  const [techInput, setTechInput] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.techStack.includes(t)) set('techStack', [...form.techStack, t]);
    setTechInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 14, padding: '26px 28px 22px', width: 460, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE' }}>{initial ? 'Edit Project' : 'Add Project'}</h3>

        <div><label style={LBL}>Project Name *</label><input style={INP} value={form.name} onChange={e => set('name', e.target.value)} required /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>Status</label>
            <select style={INP} value={form.status} onChange={e => set('status', e.target.value)}>
              {['Planning', 'Building', 'Complete', 'Deployed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Progress %</label>
            <input style={INP} type="number" min="0" max="100" value={form.progress} onChange={e => set('progress', Number(e.target.value))} />
          </div>
        </div>

        <div><label style={LBL}>Description</label><textarea style={{ ...INP, resize: 'vertical', minHeight: 60 }} value={form.description} onChange={e => set('description', e.target.value)} /></div>

        <div>
          <label style={LBL}>Tech Stack</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...INP, flex: 1 }} value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())} placeholder="Add tech and press Enter" />
            <button type="button" onClick={addTech} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', padding: '0 14px', cursor: 'pointer' }}>Add</button>
          </div>
          {form.techStack.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {form.techStack.map(t => (
                <span key={t} style={{ fontSize: 11, background: 'rgba(0,173,181,.12)', color: '#00ADB5', border: '1px solid rgba(0,173,181,.25)', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t}
                  <button type="button" onClick={() => set('techStack', form.techStack.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00ADB5', display: 'flex', padding: 0 }}>{Icons.x}</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={LBL}>GitHub Link</label><input style={INP} value={form.githubLink} onChange={e => set('githubLink', e.target.value)} placeholder="https://github.com/…" /></div>
          <div><label style={LBL}>Live Link</label><input style={INP} value={form.liveLink} onChange={e => set('liveLink', e.target.value)} placeholder="https://…" /></div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ background: saving ? 'rgba(0,173,181,.5)' : '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const sc = STATUS_COLOR[project.status] || '#8a8f96';
  return (
    <div
      onClick={() => onClick(project)}
      style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 12, padding: '20px 20px 16px', cursor: 'pointer', transition: 'border-color .15s', display: 'flex', flexDirection: 'column', gap: 12 }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#00ADB5'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#454a52'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#EEEEEE', lineHeight: 1.3 }}>{project.name}</h3>
        <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, border: `1px solid ${sc}35`, borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>{project.status}</span>
      </div>

      {project.description && <p style={{ margin: 0, fontSize: 12, color: '#8a8f96', lineHeight: 1.5 }}>{project.description.slice(0, 90)}{project.description.length > 90 ? '…' : ''}</p>}

      {project.techStack?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {project.techStack.slice(0, 5).map(t => (
            <span key={t} style={{ fontSize: 10.5, background: 'rgba(0,173,181,.08)', color: '#00ADB5', border: '1px solid rgba(0,173,181,.18)', borderRadius: 4, padding: '2px 7px' }}>{t}</span>
          ))}
          {project.techStack.length > 5 && <span style={{ fontSize: 10.5, color: '#8a8f96' }}>+{project.techStack.length - 5}</span>}
        </div>
      )}

      <div>
        <div style={{ height: 4, background: '#2c313a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: sc, borderRadius: 2, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 11, color: '#8a8f96' }}>Progress</span>
          <span className="mono" style={{ fontSize: 11, color: sc }}>{project.progress}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {project.githubLink && (
          <a href={project.githubLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a7adb4', textDecoration: 'none', border: '1px solid #454a52', borderRadius: 5, padding: '4px 9px' }}>
            {Icons.github} GitHub
          </a>
        )}
        {project.liveLink && (
          <a href={project.liveLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#00ADB5', textDecoration: 'none', border: '1px solid rgba(0,173,181,.3)', borderRadius: 5, padding: '4px 9px' }}>
            {Icons.link} Live
          </a>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#8a8f96' }}>Updated {fmtDate(project.updatedAt)}</span>
      </div>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ project, onUpdate }) {
  const [form,      setForm]      = useState({ name: project.name, status: project.status, description: project.description, githubLink: project.githubLink, liveLink: project.liveLink, progress: project.progress, techStack: [...(project.techStack || [])] });
  const [techInput, setTechInput] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addTech = () => {
    const t = techInput.trim();
    if (t && !form.techStack.includes(t)) set('techStack', [...form.techStack, t]);
    setTechInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(project._id, form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label style={LBL}>Project Name</label><input style={INP} value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label style={LBL}>Status</label>
          <select style={INP} value={form.status} onChange={e => set('status', e.target.value)}>
            {['Planning', 'Building', 'Complete', 'Deployed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div><label style={LBL}>Description</label><textarea style={{ ...INP, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => set('description', e.target.value)} /></div>

      <div><label style={LBL}>Progress % — {form.progress}%</label>
        <input type="range" min="0" max="100" value={form.progress} onChange={e => set('progress', Number(e.target.value))}
          style={{ width: '100%', accentColor: '#00ADB5', cursor: 'pointer' }} />
      </div>

      <div>
        <label style={LBL}>Tech Stack</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...INP, flex: 1 }} value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())} placeholder="Press Enter to add" />
          <button type="button" onClick={addTech} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 7, color: '#EEEEEE', padding: '0 14px', cursor: 'pointer' }}>+</button>
        </div>
        {form.techStack.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {form.techStack.map(t => (
              <span key={t} style={{ fontSize: 11, background: 'rgba(0,173,181,.1)', color: '#00ADB5', border: '1px solid rgba(0,173,181,.22)', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                {t}
                <button type="button" onClick={() => set('techStack', form.techStack.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00ADB5', display: 'flex', padding: 0 }}>{Icons.x}</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label style={LBL}>GitHub Link</label><input style={INP} value={form.githubLink} onChange={e => set('githubLink', e.target.value)} placeholder="https://github.com/…" /></div>
        <div><label style={LBL}>Live Link</label><input style={INP} value={form.liveLink} onChange={e => set('liveLink', e.target.value)} placeholder="https://…" /></div>
      </div>

      <div>
        <button onClick={handleSave} disabled={saving} style={{ background: saved ? '#3ec98a' : saving ? 'rgba(0,173,181,.5)' : '#00ADB5', border: 'none', borderRadius: 8, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '10px 24px', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Milestones ───────────────────────────────────────────────────────────
function MilestonesTab({ project, onUpdate }) {
  const [newTitle,  setNewTitle]  = useState('');
  const [newDate,   setNewDate]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data } = await api.post(`/projects/${project._id}/milestone`, { title: newTitle.trim(), targetDate: newDate || undefined });
    onUpdate(data);
    setNewTitle(''); setNewDate('');
    setSaving(false);
  };

  const toggleMilestone = async (m) => {
    const { data } = await api.put(`/projects/${project._id}/milestone/${m._id}`, { ...m, status: m.status === 'Complete' ? 'Pending' : 'Complete' });
    onUpdate(data);
  };

  const deleteMilestone = async (mid) => {
    const { data } = await api.delete(`/projects/${project._id}/milestone/${mid}`);
    onUpdate(data);
  };

  const milestones = project.milestones || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      {/* Add form */}
      <div style={{ background: '#2c313a', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}><label style={LBL}>Milestone Title</label><input style={INP} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMilestone()} placeholder="e.g. MVP release" /></div>
        <div style={{ flex: '0 0 160px' }}><label style={LBL}>Target Date</label><input style={INP} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
        <button onClick={addMilestone} disabled={saving || !newTitle.trim()} style={{ background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          {saving ? '…' : 'Add'}
        </button>
      </div>

      {/* List */}
      {milestones.length === 0 ? (
        <p style={{ color: '#8a8f96', fontSize: 13 }}>No milestones yet.</p>
      ) : (
        milestones.map(m => {
          const done    = m.status === 'Complete';
          const overdue = !done && isOverdue(m.targetDate);
          return (
            <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#393E46', border: `1px solid ${overdue ? 'rgba(239,79,94,.35)' : '#454a52'}`, borderRadius: 9, padding: '12px 14px' }}>
              <button onClick={() => toggleMilestone(m)} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${done ? '#3ec98a' : '#454a52'}`, background: done ? 'rgba(62,201,138,.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3ec98a', flexShrink: 0 }}>
                {done && Icons.check}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: done ? '#8a8f96' : '#EEEEEE', textDecoration: done ? 'line-through' : 'none' }}>{m.title}</div>
                {m.targetDate && <div style={{ fontSize: 11, color: overdue ? '#ef4f5e' : '#8a8f96', marginTop: 2 }}>{overdue && '⚠ Overdue · '}{fmtDate(m.targetDate)}</div>}
              </div>
              <button onClick={() => deleteMilestone(m._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#454a52', display: 'flex', padding: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4f5e'}
                onMouseLeave={e => e.currentTarget.style.color = '#454a52'}
              >
                {Icons.trash}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Tab: Tasks (project-scoped) ───────────────────────────────────────────────
function TasksTab({ project }) {
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTask,  setNewTask]  = useState({ title: '', priority: 'Medium', status: 'Todo' });
  const [saving,   setSaving]   = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tasks?projectId=${project._id}`);
      setTasks(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [project._id]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/tasks', { ...newTask, projectId: project._id, category: 'Project' });
      setTasks(ts => [data, ...ts]);
      setNewTask({ title: '', priority: 'Medium', status: 'Todo' });
      setShowForm(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    const { data } = await api.put(`/tasks/${id}`, { status });
    setTasks(ts => ts.map(t => t._id === id ? data : t));
  };

  const deleteTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks(ts => ts.filter(t => t._id !== id));
  };

  if (loading) return <div style={{ padding: '20px 0' }}><Skel w="100%" h={40} r={8} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowForm(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer' }}>
          {Icons.plus} Add Task
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#2c313a', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}><label style={LBL}>Title</label><input style={INP} value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Task title…" /></div>
          <div style={{ flex: '0 0 120px' }}><label style={LBL}>Priority</label>
            <select style={INP} value={newTask.priority} onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}>
              {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={addTask} disabled={saving} style={{ background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '9px 16px', cursor: 'pointer' }}>
            {saving ? '…' : 'Add'}
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p style={{ color: '#8a8f96', fontSize: 13 }}>No tasks linked to this project yet.</p>
      ) : (
        tasks.map(t => {
          const sc = TASK_STATUS_COLOR[t.status] || '#8a8f96';
          return (
            <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#393E46', border: '1px solid #454a52', borderRadius: 9, padding: '11px 14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#EEEEEE', fontWeight: 500 }}>{t.title}</div>
                <span className="mono" style={{ fontSize: 10, color: '#8a8f96' }}>{t.priority}</span>
              </div>
              <select value={t.status} onChange={e => updateStatus(t._id, e.target.value)}
                style={{ background: `${sc}18`, border: `1px solid ${sc}35`, borderRadius: 5, color: sc, fontSize: 11, padding: '3px 7px', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                {['Todo', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => deleteTask(t._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#454a52', display: 'flex', padding: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4f5e'}
                onMouseLeave={e => e.currentTarget.style.color = '#454a52'}
              >{Icons.trash}</button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Tab: Work Log ─────────────────────────────────────────────────────────────
function WorkLogTab({ project, onUpdate }) {
  const [date,  setDate]  = useState(todayISO());
  const [hours, setHours] = useState('');
  const [desc,  setDesc]  = useState('');
  const [saving, setSaving] = useState(false);

  const addEntry = async () => {
    if (!hours || Number(hours) <= 0) return;
    setSaving(true);
    const { data } = await api.post(`/projects/${project._id}/worklog`, { date, hours: Number(hours), description: desc });
    onUpdate(data);
    setHours(''); setDesc(''); setDate(todayISO());
    setSaving(false);
  };

  const deleteEntry = async (wid) => {
    const { data } = await api.delete(`/projects/${project._id}/worklog/${wid}`);
    onUpdate(data);
  };

  const log   = project.workLog || [];
  const total = log.reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 580 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#EEEEEE' }}>Total Hours</span>
        <span className="mono" style={{ fontSize: 20, color: '#00ADB5', fontWeight: 700 }}>{total}h</span>
      </div>

      <div style={{ background: '#2c313a', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '0 0 140px' }}><label style={LBL}>Date</label><input style={INP} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div style={{ flex: '0 0 80px' }}><label style={LBL}>Hours</label><input style={INP} type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="2" /></div>
        <div style={{ flex: '1 1 160px' }}><label style={LBL}>Description</label><input style={INP} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What did you work on?" /></div>
        <button onClick={addEntry} disabled={saving || !hours} style={{ background: '#00ADB5', border: 'none', borderRadius: 7, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer', flexShrink: 0 }}>
          {saving ? '…' : 'Log'}
        </button>
      </div>

      {log.length === 0 ? (
        <p style={{ color: '#8a8f96', fontSize: 13 }}>No work logged yet.</p>
      ) : (
        [...log].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
          <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#393E46', border: '1px solid #454a52', borderRadius: 9, padding: '11px 14px' }}>
            <span className="mono" style={{ fontSize: 11, color: '#8a8f96', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</span>
            <span className="mono" style={{ fontSize: 13, color: '#00ADB5', fontWeight: 700, whiteSpace: 'nowrap' }}>{e.hours}h</span>
            <span style={{ fontSize: 13, color: '#EEEEEE', flex: 1 }}>{e.description}</span>
            <button onClick={() => deleteEntry(e._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#454a52', display: 'flex', padding: 4 }}
              onMouseEnter={x => x.currentTarget.style.color = '#ef4f5e'}
              onMouseLeave={x => x.currentTarget.style.color = '#454a52'}
            >{Icons.trash}</button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab: Notes ────────────────────────────────────────────────────────────────
function NotesTab({ project, onUpdate }) {
  const [text,     setText]     = useState(project.notes || '');
  const [lastSaved, setLastSaved] = useState(null);

  const save = async () => {
    if (text === project.notes) return;
    await onUpdate(project._id, { notes: text });
    setLastSaved(new Date());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
      {lastSaved && <span style={{ fontSize: 11, color: '#8a8f96' }}>Last saved {lastSaved.toLocaleTimeString()}</span>}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        placeholder="Project notes, ideas, decisions…"
        style={{ ...INP, resize: 'vertical', minHeight: 300, lineHeight: 1.6 }}
      />
    </div>
  );
}

// ── Project Detail View ───────────────────────────────────────────────────────
function ProjectDetail({ project: initial, onBack, onProjectUpdate, onDelete }) {
  const [project,  setProject]  = useState(initial);
  const [activeTab, setActiveTab] = useState('Overview');

  const handleUpdate = async (id, data) => {
    const { data: updated } = await api.put(`/projects/${id}`, data);
    setProject(updated);
    onProjectUpdate(updated);
    return updated;
  };

  const handleFullUpdate = (updated) => { setProject(updated); onProjectUpdate(updated); };

  const sc = STATUS_COLOR[project.status] || '#8a8f96';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '18px 28px 16px', borderBottom: '1px solid #2c313a', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #454a52', borderRadius: 7, color: '#8a8f96', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
          {Icons.back} Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#EEEEEE' }}>{project.name}</h2>
            <span className="mono" style={{ fontSize: 10, color: sc, background: `${sc}18`, border: `1px solid ${sc}35`, borderRadius: 5, padding: '3px 8px' }}>{project.status}</span>
          </div>
        </div>
        <button onClick={() => onDelete(project._id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid rgba(239,79,94,.3)', borderRadius: 7, color: '#ef4f5e', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
          {Icons.trash} Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ display: 'flex', gap: 2, padding: '0 28px', borderBottom: '1px solid #2c313a', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#00ADB5' : 'transparent'}`, color: activeTab === tab ? '#00ADB5' : '#8a8f96', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, padding: '12px 16px', cursor: 'pointer', transition: 'color .15s' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {activeTab === 'Overview'   && <OverviewTab   project={project} onUpdate={handleUpdate} />}
        {activeTab === 'Milestones' && <MilestonesTab project={project} onUpdate={handleFullUpdate} />}
        {activeTab === 'Tasks'      && <TasksTab      project={project} />}
        {activeTab === 'Work Log'   && <WorkLogTab    project={project} onUpdate={handleFullUpdate} />}
        {activeTab === 'Notes'      && <NotesTab      project={project} onUpdate={handleUpdate} />}
      </div>
    </div>
  );
}

// ── Main: Projects ────────────────────────────────────────────────────────────
export default function Projects() {
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch { setError('Failed to load projects.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    const { data } = await api.post('/projects', form);
    setProjects(ps => [data, ...ps]);
    setShowModal(false);
  };

  const handleUpdate = async (id, data) => {
    const { data: updated } = await api.put(`/projects/${id}`, data);
    setProjects(ps => ps.map(p => p._id === id ? updated : p));
    return updated;
  };

  const handleDelete = async (id) => {
    await api.delete(`/projects/${id}`);
    setProjects(ps => ps.filter(p => p._id !== id));
    setSelected(null);
  };

  if (selected) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
        <ProjectDetail
          project={selected}
          onBack={() => setSelected(null)}
          onProjectUpdate={(updated) => setProjects(ps => ps.map(p => p._id === updated._id ? updated : p))}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#EEEEEE' }}>Projects</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8a8f96' }}>
              {loading ? '…' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#00ADB5', border: 'none', borderRadius: 8, color: '#06222a', fontWeight: 700, fontSize: 13, padding: '9px 16px', cursor: 'pointer' }}>
            {Icons.plus} Add Project
          </button>
        </div>

        {/* Error */}
        {error && <div style={{ background: 'rgba(239,79,94,.1)', border: '1px solid rgba(239,79,94,.3)', borderRadius: 9, padding: '12px 16px', color: '#ef4f5e', fontSize: 13 }}>{error} <button onClick={load} style={{ marginLeft: 10, background: 'transparent', border: '1px solid rgba(239,79,94,.4)', borderRadius: 6, color: '#ef4f5e', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}>Retry</button></div>}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background: '#393E46', border: '1px solid #454a52', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}><Skel h={18} w="60%" /><Skel h={12} /><Skel h={12} w="80%" /><Skel h={4} r={2} /></div>)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a8f96', fontSize: 13 }}>No projects yet. Add your first one!</div>
        )}

        {/* Grid */}
        {!loading && projects.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, overflowY: 'auto' }}>
            {projects.map(p => <ProjectCard key={p._id} project={p} onClick={setSelected} />)}
          </div>
        )}
      </div>

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
    </>
  );
}
