import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AlertsPanel from '../AlertsPanel.jsx';

const Icon = ({ d, size = 18, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const SearchIcon = <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />;
const BellIcon   = <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />;

const PAGE_META = {
  '/':           { title: 'Home' },
  '/tasks':      { title: 'Tasks' },
  '/dsa':        { title: 'DSA Tracker' },
  '/projects':   { title: 'Projects' },
  '/internship': { title: 'Internship CRM' },
  '/content':    { title: 'Content Calendar' },
  '/goals':      { title: 'Goals & Roadmap' },
  '/chat':       { title: 'Gemini Chat' },
  '/settings':   { title: 'Settings' },
};

function TopBar({ onBellClick, unreadCount }) {
  const { pathname } = useLocation();
  const meta     = PAGE_META[pathname] || { title: '' };
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const subtitle = pathname === '/' ? today : null;
  const searchRef = useRef(null);

  // Update document title on route change
  useEffect(() => {
    document.title = meta.title ? `${meta.title} | Personal OS` : 'Personal OS';
  }, [pathname, meta.title]);

  // Ctrl+K / Cmd+K → focus search
  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '18px 32px 16px',
      borderBottom: '1px solid #2c313a',
      background: '#222831',
      flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.2, color: '#EEEEEE' }}>
          {meta.title}
        </h1>
        {subtitle && (
          <span className="mono" style={{
            color: '#8a8f96', fontSize: 11, padding: '3px 8px',
            background: 'rgba(255,255,255,.04)', borderRadius: 6,
            border: '1px solid #454a52',
          }}>{subtitle}</span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search — real input, focused by Ctrl+K */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#393E46', border: '1px solid #454a52',
        borderRadius: 8, padding: '7px 12px', minWidth: 280, color: '#8a8f96',
      }}>
        <span style={{ display: 'flex', flexShrink: 0 }}>{SearchIcon}</span>
        <input
          ref={searchRef}
          placeholder="Search tasks, companies, notes…"
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#8a8f96', fontSize: 13, flex: 1, fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.parentElement.style.borderColor = '#00ADB5'; }}
          onBlur={e  => { e.currentTarget.parentElement.style.borderColor = '#454a52'; }}
        />
        <span className="mono" style={{
          fontSize: 10, color: '#8a8f96',
          border: '1px solid #454a52', padding: '1px 5px', borderRadius: 4,
        }}>⌘K</span>
      </div>

      {/* Bell with unread badge */}
      <button
        onClick={onBellClick}
        style={{
          background: '#393E46', border: '1px solid #454a52',
          width: 36, height: 36, borderRadius: 8, color: '#a7adb4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {BellIcon}
        {unreadCount > 0 ? (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 17, height: 17, padding: '0 4px',
            background: '#ef4f5e', borderRadius: 9,
            fontSize: 9, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, monospace',
            boxShadow: '0 0 0 2px #222831',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : (
          <span style={{
            position: 'absolute', top: 8, right: 8, width: 7, height: 7,
            background: '#00ADB5', borderRadius: '50%',
            boxShadow: '0 0 0 2px #393E46',
          }} />
        )}
      </button>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: '#5b6573', flexShrink: 0,
          color: '#EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: 13, letterSpacing: 0.4,
        }}>GC</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#EEEEEE' }}>Gourav C.</div>
          <div className="mono" style={{ fontSize: 10.5, color: '#8a8f96' }}>SWE · Dev</div>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const [alertsOpen,  setAlertsOpen]  = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: '#222831' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopBar
          onBellClick={() => setAlertsOpen(v => !v)}
          unreadCount={unreadCount}
        />
        <AlertsPanel
          isOpen={alertsOpen}
          onClose={() => setAlertsOpen(false)}
          onUnreadChange={setUnreadCount}
        />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
