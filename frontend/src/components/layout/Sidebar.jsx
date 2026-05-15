import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios.js';

// SVG icon primitive
const Icon = ({ d, size = 18, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const Icons = {
  home:    <Icon d={<><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></>} />,
  tasks:   <Icon d={<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10l2.5 2.5L16 7"/><path d="M8 16h8"/></>} />,
  dsa:     <Icon d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></>} />,
  projects:<Icon d={<><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>} />,
  crm:     <Icon d={<><path d="M4 7h16v12H4z"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M4 12h16"/></>} />,
  content: <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></>} />,
  goals:   <Icon d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>} />,
  chat:    <Icon d={<><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>} sw={1.8} />,
  settings:<Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} sw={1.4} />,
  logout:  <Icon d={<><path d="M9 4H5v16h4"/><path d="M16 16l4-4-4-4"/><path d="M20 12H10"/></>} />,
};

const NAV = [
  { id: 'home',      path: '/',           label: 'Home',             icon: Icons.home,     end: true },
  { id: 'tasks',     path: '/tasks',      label: 'Tasks',            icon: Icons.tasks },
  { id: 'dsa',       path: '/dsa',        label: 'DSA Tracker',      icon: Icons.dsa },
  { id: 'projects',  path: '/projects',   label: 'Projects',         icon: Icons.projects },
  { id: 'crm',       path: '/internship', label: 'Internship CRM',   icon: Icons.crm },
  { id: 'content',   path: '/content',    label: 'Content Calendar', icon: Icons.content },
  { id: 'goals',     path: '/goals',      label: 'Goals & Roadmap',  icon: Icons.goals },
  { id: 'chat',      path: '/chat',       label: 'Gemini Chat',      icon: Icons.chat },
  { id: 'settings',  path: '/settings',   label: 'Settings',         icon: Icons.settings },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [taskCount, setTaskCount]   = useState(null);
  const [crmCount,  setCrmCount]    = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/tasks?status=Todo,In Progress'),
      api.get('/internships'),
    ]).then(([tasksRes, crmRes]) => {
      setTaskCount(tasksRes.data.length ?? 0);
      setCrmCount(crmRes.data.length  ?? 0);
    }).catch(() => {
      // silent — badges simply won't render if fetch fails
    });
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside style={{
      width: 236, flexShrink: 0,
      background: '#393E46',
      borderRight: '1px solid #2c313a',
      display: 'flex', flexDirection: 'column',
      padding: '22px 0 18px',
      height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 20px 22px' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: '#00ADB5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#06222a', fontWeight: 700, fontFamily: 'Geist Mono, monospace', fontSize: 14,
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.18)',
          flexShrink: 0,
        }}>P</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ color: '#00ADB5', fontWeight: 600, fontSize: 15, letterSpacing: 0.2 }}>Personal OS</span>
          <span className="mono" style={{ color: '#8a8f96', fontSize: 10.5, letterSpacing: 0.4, marginTop: 2 }}>v1.0 · prod</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <div className="mono" style={{
          color: '#8a8f96', fontSize: 10, letterSpacing: 1.2,
          textTransform: 'uppercase', padding: '8px 10px 6px',
        }}>Workspace</div>

        {NAV.map(({ id, path, label, icon, end }) => {
          const badge = id === 'tasks' ? (taskCount > 0 ? String(taskCount) : null)
                      : id === 'crm'   ? (crmCount  > 0 ? String(crmCount)  : null)
                      : null;
          return (
          <NavLink
            key={id}
            to={path}
            end={end}
            style={({ isActive }) => ({
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 12px',
              borderRadius: 7,
              color: isActive ? '#00ADB5' : '#a7adb4',
              background: isActive ? 'rgba(0,173,181,0.08)' : 'transparent',
              fontSize: 13.5,
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'color 120ms, background 120ms',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span style={{
                    position: 'absolute', left: -12, top: 6, bottom: 6, width: 3,
                    background: '#00ADB5', borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span className="mono" style={{
                    fontSize: 10.5,
                    color: isActive ? '#00ADB5' : '#8a8f96',
                    background: isActive ? 'rgba(0,173,181,.12)' : 'rgba(255,255,255,.04)',
                    padding: '1px 6px', borderRadius: 10,
                  }}>{badge}</span>
                )}
              </>
            )}
          </NavLink>
          )
        })}

      </div>

      {/* Streak pill */}
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{
          background: 'rgba(0,173,181,.07)',
          border: '1px solid rgba(0,173,181,.25)',
          borderRadius: 9, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#00ADB5', flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(0,173,181,.18)',
          }} />
          <div style={{ flex: 1, lineHeight: 1.2 }}>
            <div style={{ fontSize: 12, color: '#EEEEEE' }}>Daily streak</div>
            <div className="mono" style={{ fontSize: 11, color: '#8a8f96', marginTop: 2 }}>keep going</div>
          </div>
          <span className="mono" style={{ color: '#00ADB5', fontSize: 13, fontWeight: 600 }}>🔥</span>
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '14px 12px 0', borderTop: '1px solid #2c313a', marginTop: 14 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 11,
            padding: '9px 12px', borderRadius: 7, width: '100%',
            color: '#8a8f96', fontSize: 13.5, cursor: 'pointer',
            background: 'transparent', border: 'none',
            transition: 'color 120ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4f5e'}
          onMouseLeave={e => e.currentTarget.style.color = '#8a8f96'}
        >
          <span style={{ display: 'flex', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
            {Icons.logout}
          </span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
