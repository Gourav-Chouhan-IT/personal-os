// Activity Log — full history of all activity entries, paginated and grouped by date
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

const PAGE_SIZE = 50;

const ACTION_COLOR = {
  created:     '#00ADB5',
  completed:   '#3ec98a',
  rescheduled: '#f4b740',
  updated:     '#8a8f96',
  deleted:     '#ef4f5e',
};

const ENTITY_COLOR = {
  task:    '#a7adb4',
  goal:    '#a78bfa',
  dsa:     '#00ADB5',
  crm:     '#3ec98a',
  content: '#f4b740',
};

const FILTERS = [
  { label: 'All',         action: null,          entityType: null },
  { label: 'CREATED',     action: 'created',     entityType: null },
  { label: 'COMPLETED',   action: 'completed',   entityType: null },
  { label: 'RESCHEDULED', action: 'rescheduled', entityType: null },
  { label: 'DSA',         action: null,          entityType: 'dsa' },
  { label: 'CRM',         action: null,          entityType: 'crm' },
  { label: 'CONTENT',     action: null,          entityType: 'content' },
  { label: 'GOALS',       action: null,          entityType: 'goal' },
];

function formatGroupDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);
  if (d >= todayStart) return 'Today';
  if (d >= yestStart)  return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function groupByDate(logs) {
  const groups = [];
  let currentLabel = null;
  for (const log of logs) {
    const label = formatGroupDate(log.createdAt);
    if (label !== currentLabel) {
      groups.push({ label, items: [log] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].items.push(log);
    }
  }
  return groups;
}

function SkeletonRow({ i }) {
  return (
    <div style={{
      padding: '16px 0', borderBottom: '1px solid #2c313a',
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,.06)', flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 13, borderRadius: 4, background: 'rgba(255,255,255,.06)', width: `${55 + (i % 3) * 15}%` }} />
        <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,.06)', width: '30%' }} />
      </div>
      <div style={{ width: 48, height: 10, borderRadius: 4, background: 'rgba(255,255,255,.06)', marginTop: 3 }} />
    </div>
  );
}

export default function ActivityLog() {
  const navigate = useNavigate();

  const [logs,        setLogs]        = useState([]);
  const [skip,        setSkip]        = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  // Reset + fetch when filter changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLogs([]);
    setSkip(0);

    const params = new URLSearchParams({ limit: PAGE_SIZE, skip: 0 });
    if (activeFilter.action)     params.set('action',     activeFilter.action);
    if (activeFilter.entityType) params.set('entityType', activeFilter.entityType);

    api.get(`/activity?${params}`)
      .then(res => {
        if (cancelled) return;
        const data = res.data;
        setLogs(data);
        setSkip(data.length);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeFilter]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, skip });
    if (activeFilter.action)     params.set('action',     activeFilter.action);
    if (activeFilter.entityType) params.set('entityType', activeFilter.entityType);

    api.get(`/activity?${params}`)
      .then(res => {
        const data = res.data;
        setLogs(prev => [...prev, ...data]);
        setSkip(prev => prev + data.length);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const groups = groupByDate(logs);

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent', border: '1px solid #454a52', borderRadius: 8,
            color: '#a7adb4', fontSize: 13, padding: '7px 12px', cursor: 'pointer',
          }}
        >← Back</button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#EEEEEE' }}>Activity Log</h2>
        <span className="mono" style={{ fontSize: 11, color: '#8a8f96' }}>full history</span>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {FILTERS.map(f => {
          const isActive = f.label === activeFilter.label;
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid',
                borderColor: isActive ? '#00ADB5' : '#454a52',
                background: isActive ? 'rgba(0,173,181,.12)' : 'transparent',
                color: isActive ? '#00ADB5' : '#8a8f96',
                fontSize: 11.5, fontFamily: 'Geist Mono, monospace',
                cursor: 'pointer', letterSpacing: 0.3,
              }}
            >{f.label}</button>
          );
        })}
      </div>

      {/* Log list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} i={i} />)
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8a8f96', fontSize: 13 }}>
            No activity entries found
          </div>
        ) : (
          <>
            {groups.map(group => (
              <div key={group.label}>
                {/* Date group header */}
                <div style={{ padding: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#8a8f96',
                    fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.8,
                    whiteSpace: 'nowrap',
                  }}>{group.label}</span>
                  <div style={{ flex: 1, height: 1, background: '#2c313a' }} />
                </div>

                {/* Entries */}
                {group.items.map((entry, i) => (
                  <div key={entry._id || i} style={{
                    display: 'grid', gridTemplateColumns: '10px 1fr auto',
                    gap: 14, padding: '12px 0',
                    borderBottom: '1px solid #2c313a',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ paddingTop: 5 }}>
                      <span style={{
                        display: 'block', width: 10, height: 10, borderRadius: '50%',
                        background: ACTION_COLOR[entry.action] || '#8a8f96',
                        boxShadow: `0 0 0 3px ${ACTION_COLOR[entry.action] || '#8a8f96'}22`,
                      }} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: '#EEEEEE', lineHeight: 1.4 }}>{entry.description}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontFamily: 'Geist Mono, monospace',
                          color: ACTION_COLOR[entry.action] || '#8a8f96',
                          background: `${ACTION_COLOR[entry.action] || '#8a8f96'}18`,
                          padding: '1px 7px', borderRadius: 10,
                          letterSpacing: 0.6, textTransform: 'uppercase',
                        }}>{entry.action}</span>
                        {entry.entityType && entry.entityType !== 'task' && (
                          <span style={{
                            fontSize: 10, fontFamily: 'Geist Mono, monospace',
                            color: ENTITY_COLOR[entry.entityType] || '#8a8f96',
                            background: `${ENTITY_COLOR[entry.entityType] || '#8a8f96'}18`,
                            padding: '1px 7px', borderRadius: 10,
                            letterSpacing: 0.6, textTransform: 'uppercase',
                          }}>{entry.entityType}</span>
                        )}
                      </div>
                    </div>

                    <div style={{
                      fontFamily: 'Geist Mono, monospace', fontSize: 11,
                      color: '#8a8f96', paddingTop: 3, whiteSpace: 'nowrap',
                    }}>{formatTime(entry.createdAt)}</div>
                  </div>
                ))}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    background: 'transparent', border: '1px solid #454a52',
                    borderRadius: 8, color: '#a7adb4', fontSize: 13,
                    padding: '8px 24px', cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
