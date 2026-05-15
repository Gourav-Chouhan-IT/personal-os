// GeminiChat — AI chat with live personal context and write-back action cards (Sprint 6)
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'How is my DSA progress going?',
  'Which internships need follow-up?',
];

const ACTION_META = {
  create_task:         { icon: '📋', label: 'Create Task' },
  update_task_status:  { icon: '✏️',  label: 'Update Task' },
  add_internship:      { icon: '🏢', label: 'Add Company' },
  log_worklog:         { icon: '⏱️',  label: 'Log Work' },
  create_goal:         { icon: '🎯', label: 'Create Goal' },
};

const STATUS_COLORS = {
  'On Track': '#3ec98a',
  'At Risk':  '#f4b740',
  'Delayed':  '#ef4f5e',
  'Complete': '#00ADB5',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', maxWidth: 80,
      background: '#393E46', borderRadius: '12px 12px 12px 2px', marginBottom: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#8a8f96', display: 'inline-block',
          animation: `gemBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function ActionCard({ action, state, onConfirm, onDismiss }) {
  const meta = ACTION_META[action.type] || { icon: '⚡', label: 'Action' };

  let mainText = action.title || action.company || action.name || action.description || '';
  let detailText = '';
  if (action.type === 'create_task')        detailText = `${action.category || 'Other'} · ${action.priority || 'Medium'}${action.dueDate ? ` · Due ${action.dueDate}` : ''}`;
  if (action.type === 'add_internship')     detailText = action.role || 'Internship';
  if (action.type === 'log_worklog')        detailText = `${action.hours || 1}h · ${action.description || ''}`;
  if (action.type === 'create_goal')        detailText = `${action.category || 'Career'}${action.targetDate ? ` · ${action.targetDate}` : ''}`;
  if (action.type === 'update_task_status') { mainText = `Status → ${action.status}`; detailText = `Task ID: ${(action.taskId || '').slice(-6)}`; }

  const confirmed = state === 'confirmed';
  const dismissed = state === 'dismissed';
  const skipped   = state === 'skipped';
  const isLoading = state === 'loading';
  const hasError  = state === 'error';

  return (
    <div style={{
      border: `1px solid ${confirmed ? '#3ec98a' : skipped ? '#393E46' : dismissed ? '#2c313a' : '#00ADB5'}`,
      borderRadius: 8, padding: '10px 14px', marginTop: 8,
      background: confirmed ? 'rgba(62,201,138,0.07)' : skipped ? 'rgba(57,62,70,0.2)' : dismissed ? 'rgba(34,40,49,0.4)' : 'rgba(0,173,181,0.06)',
      opacity: (dismissed || skipped) ? 0.6 : 1, transition: 'opacity 200ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
        <span style={{ color: confirmed ? '#3ec98a' : (dismissed || skipped) ? '#8a8f96' : '#00ADB5', fontWeight: 600, fontSize: 12 }}>
          {meta.label}
        </span>
      </div>
      {mainText && <div style={{ color: '#EEEEEE', fontSize: 13, marginBottom: 2 }}>{mainText}</div>}
      {detailText && <div style={{ color: '#8a8f96', fontSize: 11 }}>{detailText}</div>}

      {!confirmed && !dismissed && !skipped && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: isLoading ? '#393E46' : '#00ADB5', color: isLoading ? '#8a8f96' : '#222831',
              border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12,
              cursor: isLoading ? 'default' : 'pointer', fontWeight: 600,
            }}
          >
            {isLoading ? '…' : '✓ Add to Dashboard'}
          </button>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', color: '#8a8f96', border: '1px solid #393E46',
              borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
            }}
          >
            ✗ Dismiss
          </button>
        </div>
      )}
      {confirmed && <div style={{ color: '#3ec98a', fontSize: 11, marginTop: 6 }}>✓ Added to dashboard</div>}
      {skipped   && <div style={{ color: '#8a8f96', fontSize: 11, marginTop: 6 }}>✓ Already in Dashboard</div>}
      {hasError   && <div style={{ color: '#ef4f5e', fontSize: 11, marginTop: 6 }}>Failed to execute</div>}
    </div>
  );
}

function MessageBubble({ msg, msgIdx, actionStates, onConfirmAction, onDismissAction, onConfirmAll }) {
  const isUser = msg.role === 'user';
  const [showTime, setShowTime] = useState(false);
  const hasActions = msg.actions && msg.actions.length > 0;

  const pendingCount = hasActions
    ? msg.actions.filter((_, i) => {
        const s = actionStates[`${msgIdx}_${i}`];
        return !s || s === 'pending';
      }).length
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4, marginBottom: 4 }}>
      <div
        onClick={() => setShowTime(v => !v)}
        style={{
          maxWidth: '72%', padding: '10px 14px', cursor: 'default',
          borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
          background: isUser ? '#00ADB5' : '#393E46',
          color: isUser ? '#1a2a2b' : '#EEEEEE',
          fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {msg.content}
      </div>
      {showTime && (
        <div style={{ fontSize: 10, color: '#8a8f96', padding: '0 4px' }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {hasActions && (
        <div style={{ maxWidth: '72%', width: '100%' }}>
          {pendingCount > 1 && (
            <button
              onClick={onConfirmAll}
              style={{
                background: 'rgba(0,173,181,0.12)', color: '#00ADB5', border: '1px solid rgba(0,173,181,0.3)',
                borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, marginBottom: 4,
              }}
            >
              ✓ Add All ({pendingCount})
            </button>
          )}
          {msg.actions.map((action, actIdx) => (
            <ActionCard
              key={actIdx}
              action={action}
              state={actionStates[`${msgIdx}_${actIdx}`] || 'pending'}
              onConfirm={() => onConfirmAction(action, msgIdx, actIdx)}
              onDismiss={() => onDismissAction(msgIdx, actIdx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onPromptClick }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
      <h2 style={{ color: '#EEEEEE', fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>Gemini is ready</h2>
      <p style={{ color: '#8a8f96', fontSize: 14, margin: '0 0 24px', maxWidth: 300 }}>
        Ask anything about your tasks, DSA progress, internships, or goals.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
        {SUGGESTED_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(p)}
            style={{
              background: '#393E46', color: '#EEEEEE', border: '1px solid #454a52',
              borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
              textAlign: 'left', transition: 'border-color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#00ADB5'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#454a52'}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function SessionItem({ session, active, onClick, onDelete }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 12px', cursor: 'pointer', position: 'relative',
        background: active ? 'rgba(0,173,181,0.1)' : hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderLeft: active ? '2px solid #00ADB5' : '2px solid transparent',
        transition: 'background 120ms',
      }}
    >
      <div style={{ color: active ? '#00ADB5' : '#EEEEEE', fontSize: 13, fontWeight: active ? 500 : 400,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 24 }}>
        {session.title || 'New Chat'}
      </div>
      <div style={{ color: '#8a8f96', fontSize: 11, marginTop: 2 }}>
        {new Date(session.updatedAt || session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        {' · '}{session.messageCount ?? 0} msgs
      </div>
      {hover && (
        <button
          onClick={e => onDelete(session._id, e)}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(239,79,94,0.15)', color: '#ef4f5e', border: 'none',
            borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ContextPreview({ contextData, contextEnabled }) {
  if (!contextEnabled) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8a8f96', fontSize: 13, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚪</div>
        Context is OFF.<br />Gemini won't see your dashboard data.
      </div>
    );
  }

  if (!contextData) {
    return (
      <div style={{ padding: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: '#2c313a', borderRadius: 6, height: 48, marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  const { tasks, dsa, projects, internships, goals } = contextData;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ color: '#8a8f96', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        Live Context
      </div>

      {/* Tasks */}
      <CtxSection title="Tasks" icon="📋">
        {tasks.overdue > 0 && <CtxRow label="Overdue" value={tasks.overdue} color="#ef4f5e" />}
        <CtxRow label="This week" value={tasks.thisWeek} color="#f4b740" />
        {tasks.overdueItems?.map((t, i) => (
          <div key={i} style={{ fontSize: 11, color: '#8a8f96', marginTop: 3, paddingLeft: 8 }}>
            · {t.title}
          </div>
        ))}
      </CtxSection>

      {/* DSA */}
      <CtxSection title="DSA" icon="🧩">
        <CtxRow label="Solved" value={`${dsa.solved} / ${dsa.total}`} color="#00ADB5" />
        <div style={{ height: 4, background: '#2c313a', borderRadius: 2, marginTop: 6 }}>
          <div style={{ height: '100%', borderRadius: 2, background: '#00ADB5', width: `${Math.round((dsa.solved / Math.max(dsa.total, 1)) * 100)}%`, transition: 'width 400ms' }} />
        </div>
      </CtxSection>

      {/* Projects */}
      <CtxSection title="Projects" icon="🗂️">
        {projects.length === 0 && <div style={{ color: '#8a8f96', fontSize: 12 }}>None tracked</div>}
        {projects.slice(0, 4).map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: '#EEEEEE', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{p.name}</span>
            <span style={{ fontSize: 11, color: '#8a8f96' }}>{p.status}</span>
          </div>
        ))}
      </CtxSection>

      {/* Internships */}
      <CtxSection title="Internships" icon="💼">
        <CtxRow label="Active"        value={internships.active}      color="#EEEEEE" />
        <CtxRow label="In Progress"   value={internships.inProgress}  color="#f4b740" />
        {internships.followupsDue > 0 && <CtxRow label="Follow-ups due" value={internships.followupsDue} color="#ef4f5e" />}
      </CtxSection>

      {/* Goals */}
      <CtxSection title="Goals" icon="🎯">
        <CtxRow label="Total"   value={goals.total}  color="#EEEEEE" />
        {goals.atRisk > 0 && <CtxRow label="At risk" value={goals.atRisk} color="#ef4f5e" />}
        {goals.items?.slice(0, 3).map((g, i) => (
          <div key={i} style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#EEEEEE', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{g.name}</span>
              <span style={{ fontSize: 10, color: STATUS_COLORS[g.status] || '#8a8f96' }}>{g.status}</span>
            </div>
            <div style={{ height: 3, background: '#2c313a', borderRadius: 2, marginTop: 3 }}>
              <div style={{ height: '100%', borderRadius: 2, background: STATUS_COLORS[g.status] || '#8a8f96', width: `${g.progress}%` }} />
            </div>
          </div>
        ))}
      </CtxSection>
    </div>
  );
}

function CtxSection({ title, icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ color: '#EEEEEE', fontSize: 12, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CtxRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
      <span style={{ color: '#8a8f96', fontSize: 12 }}>{label}</span>
      <span style={{ color: color || '#EEEEEE', fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PasteModal({ pasteText, setPasteText, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#2c313a', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#EEEEEE', fontWeight: 700, fontSize: 16, margin: 0 }}>📋 Paste &amp; Parse</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <p style={{ color: '#8a8f96', fontSize: 13, margin: 0 }}>
          Paste any text (notes, Claude conversations, plans) and Gemini will extract actionable tasks.
        </p>
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder="Paste your text here…"
          rows={8}
          style={{
            background: '#393E46', color: '#EEEEEE', border: '1px solid #454a52',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, resize: 'vertical',
            fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#8a8f96', border: '1px solid #393E46', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!pasteText.trim()}
            style={{
              background: pasteText.trim() ? '#00ADB5' : '#393E46',
              color: pasteText.trim() ? '#222831' : '#8a8f96',
              border: 'none', borderRadius: 8, padding: '8px 20px', cursor: pasteText.trim() ? 'pointer' : 'default',
              fontWeight: 700, fontSize: 14,
            }}
          >
            Extract Tasks
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GeminiChat() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(true);
  const [contextData, setContextData] = useState(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [actionStates, setActionStates] = useState({});
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    loadSessions();
    loadContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await api.get('/gemini/sessions');
      setSessions(data);
    } catch {
      // non-critical
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadContext = async () => {
    try {
      const { data } = await api.get('/gemini/context');
      setContextData(data);
    } catch {
      setContextData(null);
    }
  };

  const loadSession = async (id) => {
    try {
      const { data } = await api.get(`/gemini/sessions/${id}`);
      setActiveSessionId(id);
      setMessages(data.messages || []);
      setContextEnabled(data.contextEnabled ?? true);

      // Restore confirmed states from DB so cards don't reset on reload
      const initialStates = {};
      (data.messages || []).forEach((msg, msgIdx) => {
        (msg.actions || []).forEach((action, actIdx) => {
          if (action.confirmed) initialStates[`${msgIdx}_${actIdx}`] = 'confirmed';
        });
      });
      setActionStates(initialStates);
      setError(null);
      if (isMobile) setShowMobileSidebar(false);
    } catch {
      setError('Failed to load session.');
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setActionStates({});
    setError(null);
    setMessage('');
    if (isMobile) setShowMobileSidebar(false);
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/gemini/sessions/${id}`);
      setSessions(prev => prev.filter(s => s._id !== id));
      if (activeSessionId === id) startNewChat();
    } catch {
      // silent
    }
  };

  const sendMessage = useCallback(async (textOverride) => {
    const text = typeof textOverride === 'string' ? textOverride : message.trim();
    if (!text || loading) return;

    setMessage('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setError(null);
    setLoading(true);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString(), actions: [] };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await api.post('/gemini/chat', {
        message: text,
        sessionId: activeSessionId,
        contextEnabled,
      });

      const geminiMsg = { role: 'model', content: data.reply, timestamp: new Date().toISOString(), actions: data.actions || [] };
      setMessages(prev => [...prev, geminiMsg]);

      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId);
        loadSessions();
      }
      if (contextEnabled) loadContext();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to get a response. Check your API key in Settings.';
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [message, loading, activeSessionId, contextEnabled]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const confirmAction = async (action, msgIdx, actIdx) => {
    console.log('[Gemini] Confirming action:', action);
    const key = `${msgIdx}_${actIdx}`;
    setActionStates(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const { data } = await api.post('/gemini/action', { actions: [action], sessionId: activeSessionId });
      if (data.skipped?.length > 0) {
        setActionStates(prev => ({ ...prev, [key]: 'skipped' }));
      } else if (data.errors?.length > 0) {
        console.error('[Gemini] Action failed on backend:', data.errors[0]);
        setActionStates(prev => ({ ...prev, [key]: 'error' }));
      } else {
        setActionStates(prev => ({ ...prev, [key]: 'confirmed' }));
      }
    } catch {
      setActionStates(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const dismissAction = (msgIdx, actIdx) => {
    setActionStates(prev => ({ ...prev, [`${msgIdx}_${actIdx}`]: 'dismissed' }));
  };

  const confirmAllActions = async (actions, msgIdx, currentStates) => {
    const toConfirm = actions
      .map((a, i) => ({ action: a, i }))
      .filter(({ i }) => { const s = currentStates[`${msgIdx}_${i}`]; return !s || s === 'pending'; });

    if (!toConfirm.length) return;

    const loadingUpdates = {};
    toConfirm.forEach(({ i }) => { loadingUpdates[`${msgIdx}_${i}`] = 'loading'; });
    setActionStates(prev => ({ ...prev, ...loadingUpdates }));

    try {
      const { data } = await api.post('/gemini/action', { actions: toConfirm.map(({ action }) => action), sessionId: activeSessionId });
      const stateUpdates = {};
      toConfirm.forEach(({ action, i }) => {
        const wasSkipped = (data.skipped || []).some(s => s.type === action.type && s.title === action.title);
        const hasFailed  = (data.errors  || []).some(e => e.type === action.type);
        stateUpdates[`${msgIdx}_${i}`] = wasSkipped ? 'skipped' : hasFailed ? 'error' : 'confirmed';
      });
      setActionStates(prev => ({ ...prev, ...stateUpdates }));
    } catch {
      const errUpdates = {};
      toConfirm.forEach(({ i }) => { errUpdates[`${msgIdx}_${i}`] = 'error'; });
      setActionStates(prev => ({ ...prev, ...errUpdates }));
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    const text = `Parse this text and extract all action items, tasks, and things I need to do. Return them as actions I can add to my dashboard:\n\n${pasteText}`;
    setShowPasteModal(false);
    setPasteText('');
    await sendMessage(text);
  };

  const toggleContext = () => {
    const next = !contextEnabled;
    setContextEnabled(next);
    if (next) loadContext();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const showLeftPanel  = !isMobile || showMobileSidebar;
  const showRightPanel = !isTablet;

  return (
    <div style={{ display: 'flex', height: '100%', background: '#222831', overflow: 'hidden', position: 'relative' }}>

      {/* Mobile overlay backdrop */}
      {isMobile && showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40 }}
        />
      )}

      {/* ── Left panel: Sessions ── */}
      {showLeftPanel && (
        <div style={{
          width: 240, flexShrink: 0, background: '#1a1f26',
          borderRight: '1px solid #393E46', display: 'flex', flexDirection: 'column',
          position: isMobile ? 'fixed' : 'relative', top: 0, left: 0, height: '100%', zIndex: isMobile ? 50 : 'auto',
        }}>
          <div style={{ padding: '14px 12px 12px', borderBottom: '1px solid #2c313a', flexShrink: 0 }}>
            <button
              onClick={startNewChat}
              style={{
                width: '100%', background: '#00ADB5', color: '#17292a',
                border: 'none', borderRadius: 8, padding: '9px 0',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              + New Chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sessionsLoading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 50, background: '#2c313a', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '24px 16px', color: '#8a8f96', fontSize: 13, textAlign: 'center' }}>No chats yet</div>
            ) : (
              sessions.map(s => (
                <SessionItem
                  key={s._id}
                  session={s}
                  active={s._id === activeSessionId}
                  onClick={() => loadSession(s._id)}
                  onDelete={deleteSession}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Middle panel: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Chat header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid #2c313a',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#222831',
        }}>
          {isMobile && (
            <button
              onClick={() => setShowMobileSidebar(true)}
              style={{ background: 'none', border: 'none', color: '#EEEEEE', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}
            >
              ☰
            </button>
          )}
          <span style={{ color: '#EEEEEE', fontWeight: 600, fontSize: 15 }}>
            {activeSessionId ? (sessions.find(s => s._id === activeSessionId)?.title || 'Chat') : 'New Chat'}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{
            fontSize: 11, color: contextEnabled ? '#00ADB5' : '#8a8f96',
            background: contextEnabled ? 'rgba(0,173,181,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${contextEnabled ? 'rgba(0,173,181,0.25)' : '#393E46'}`,
            borderRadius: 20, padding: '3px 10px',
          }}>
            {contextEnabled ? '🟢 Context ON' : '⚪ Context OFF'}
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && !loading
            ? <EmptyState onPromptClick={sendMessage} />
            : messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  msgIdx={i}
                  actionStates={actionStates}
                  onConfirmAction={confirmAction}
                  onDismissAction={dismissAction}
                  onConfirmAll={() => confirmAllActions(msg.actions || [], i, actionStates)}
                />
              ))
          }
          {loading && (
            <div style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
              <TypingDots />
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(239,79,94,0.1)', border: '1px solid rgba(239,79,94,0.25)', borderRadius: 8, padding: '10px 14px', color: '#ef4f5e', fontSize: 13, marginBottom: 8 }}>
              {error}
            </div>
          )}
          <div ref={messagesEndRef} style={{ height: 16 }} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #2c313a', background: '#222831', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={() => setShowPasteModal(true)}
              title="Paste and parse text for tasks"
              style={{
                background: '#393E46', color: '#8a8f96', border: '1px solid #454a52',
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EEEEEE'; e.currentTarget.style.borderColor = '#5a5f68'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8a8f96'; e.currentTarget.style.borderColor = '#454a52'; }}
            >
              📋 Paste
            </button>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              placeholder="Ask Gemini anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{
                flex: 1, background: '#393E46', color: '#EEEEEE',
                border: '1px solid #454a52', borderRadius: 8,
                padding: '8px 12px', fontSize: 14, resize: 'none',
                fontFamily: 'inherit', outline: 'none',
                lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              }}
              onFocus={e => { e.target.style.borderColor = '#00ADB5'; }}
              onBlur={e => { e.target.style.borderColor = '#454a52'; }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <button
                onClick={toggleContext}
                style={{
                  background: contextEnabled ? 'rgba(0,173,181,0.15)' : '#393E46',
                  color: contextEnabled ? '#00ADB5' : '#8a8f96',
                  border: `1px solid ${contextEnabled ? 'rgba(0,173,181,0.35)' : '#454a52'}`,
                  borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                  fontSize: 11, whiteSpace: 'nowrap',
                }}
                title="Toggle personal context"
              >
                {contextEnabled ? '🟢 ON' : '⚪ OFF'}
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={!message.trim() || loading}
                style={{
                  background: message.trim() && !loading ? '#00ADB5' : '#393E46',
                  color: message.trim() && !loading ? '#17292a' : '#8a8f96',
                  border: 'none', borderRadius: 6, padding: '5px 14px',
                  cursor: message.trim() && !loading ? 'pointer' : 'default',
                  fontWeight: 700, fontSize: 13, transition: 'background 150ms',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Context preview ── */}
      {showRightPanel && (
        <div style={{
          width: 280, flexShrink: 0, background: '#1a1f26',
          borderLeft: '1px solid #393E46', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #2c313a', flexShrink: 0 }}>
            <div style={{ color: '#EEEEEE', fontWeight: 600, fontSize: 14 }}>Context Preview</div>
            <div style={{ color: '#8a8f96', fontSize: 11, marginTop: 2 }}>What Gemini can see</div>
          </div>
          <ContextPreview contextData={contextData} contextEnabled={contextEnabled} />
        </div>
      )}

      {/* Paste modal */}
      {showPasteModal && (
        <PasteModal
          pasteText={pasteText}
          setPasteText={setPasteText}
          onSubmit={handlePasteSubmit}
          onClose={() => { setShowPasteModal(false); setPasteText(''); }}
        />
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes gemBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
