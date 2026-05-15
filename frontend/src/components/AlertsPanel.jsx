// AlertsPanel — dropdown panel with live categorized alerts, auto-refreshes every 5 min
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const ALERT_TYPES = {
  overdue_task:    { icon: '🔴', label: 'Overdue Task',       path: '/tasks'      },
  at_risk_goal:    { icon: '🟠', label: 'Goal At Risk',        path: '/goals'      },
  followup_due:    { icon: '🟡', label: 'Follow-up Due',       path: '/internship' },
  streak_risk:     { icon: '🟢', label: 'Streak at Risk',      path: '/dsa'        },
  overdue_content: { icon: '📅', label: 'Content Overdue',     path: '/content'    },
};

export default function AlertsPanel({ isOpen, onClose, onUnreadChange }) {
  const navigate  = useNavigate();
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [cleared,  setCleared]  = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [tasksRes, goalsRes, followupsRes, dsaRes, contentRes] = await Promise.allSettled([
        api.get('/tasks?status=Todo,In Progress'),
        api.get('/goals/health'),
        api.get('/internships/followups'),
        api.get('/dsa/stats'),
        api.get('/content/overdue'),
      ]);

      const built = [];

      // Overdue tasks
      if (tasksRes.status === 'fulfilled') {
        tasksRes.value.data
          .filter(t => t.dueDate && new Date(t.dueDate) < today)
          .forEach(t => {
            const days = Math.floor((today - new Date(t.dueDate)) / 86400000);
            built.push({ type: 'overdue_task', id: `task_${t._id}`, title: t.title, subtitle: `${days}d overdue · ${t.category}`, path: '/tasks' });
          });
      }

      // At-risk / delayed goals
      if (goalsRes.status === 'fulfilled') {
        goalsRes.value.data.forEach(g => {
          built.push({ type: 'at_risk_goal', id: `goal_${g._id}`, title: g.name, subtitle: g.status, path: '/goals' });
        });
      }

      // Internship follow-ups
      if (followupsRes.status === 'fulfilled') {
        followupsRes.value.data.slice(0, 5).forEach(i => {
          built.push({ type: 'followup_due', id: `fu_${i._id}`, title: i.company, subtitle: i.role || i.status, path: '/internship' });
        });
      }

      // DSA streak at risk (no solve today + past 6pm)
      if (dsaRes.status === 'fulfilled') {
        const { todayCount, streak } = dsaRes.value.data;
        if (todayCount === 0 && new Date().getHours() >= 18 && streak > 0) {
          built.push({ type: 'streak_risk', id: 'dsa_streak', title: 'DSA streak at risk', subtitle: `${streak}-day streak · no solve today`, path: '/dsa' });
        }
      }

      // Overdue content
      if (contentRes.status === 'fulfilled') {
        contentRes.value.data.slice(0, 5).forEach(p => {
          built.push({ type: 'overdue_content', id: `content_${p._id}`, title: p.title, subtitle: `${p.platform} · ${p.status}`, path: '/content' });
        });
      }

      setAlerts(built);
      setCleared(false); // new fetch invalidates the cleared state
    } catch {
      // silent — panel just won't show
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 5-min auto-refresh
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Communicate unread count to parent (for bell badge)
  useEffect(() => {
    onUnreadChange(cleared ? 0 : alerts.length);
  }, [cleared, alerts.length, onUnreadChange]);

  const markAllRead = () => setCleared(true);

  const handleAlertClick = (path) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  const visibleAlerts = cleared ? [] : alerts;

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 290 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 64, right: 32, zIndex: 300,
        width: 340, maxHeight: 480,
        background: '#2c313a', border: '1px solid #393E46',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #393E46', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#EEEEEE', fontWeight: 700, fontSize: 14 }}>Alerts</span>
            {!cleared && alerts.length > 0 && (
              <span style={{ background: '#ef4f5e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                {alerts.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!cleared && alerts.length > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: '#00ADB5', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8f96', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 52, background: '#393E46', borderRadius: 8, animation: 'alertPulse 1.4s ease-in-out infinite' }} />
              ))}
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
              <div style={{ color: '#EEEEEE', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>All clear!</div>
              <div style={{ color: '#8a8f96', fontSize: 13 }}>No alerts right now. Keep it up!</div>
            </div>
          ) : (
            // Group by type
            Object.entries(ALERT_TYPES).map(([type, meta]) => {
              const group = visibleAlerts.filter(a => a.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, color: '#8a8f96', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {meta.icon} {meta.label}
                  </div>
                  {group.map(alert => (
                    <button
                      key={alert.id}
                      onClick={() => handleAlertClick(alert.path)}
                      style={{
                        width: '100%', background: 'none', border: 'none',
                        padding: '8px 16px', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{ color: '#EEEEEE', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {alert.title}
                      </span>
                      <span style={{ color: '#8a8f96', fontSize: 11 }}>{alert.subtitle}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <style>{`@keyframes alertPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      </div>
    </>
  );
}
