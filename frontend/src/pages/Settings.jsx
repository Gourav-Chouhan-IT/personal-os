// Settings — Gemini key, data export, backup/restore, password change, danger zone
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios.js';

// ─── Shared layout components ─────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: '#393E46', borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <h2 style={{ color: '#EEEEEE', fontWeight: 700, fontSize: 16, margin: '0 0 20px' }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={{ color: '#EEEEEE', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>}
      {hint  && <div style={{ color: '#8a8f96', fontSize: 12, marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Msg({ type, text }) {
  if (!text) return null;
  const c = { success: '#3ec98a', error: '#ef4f5e', info: '#00ADB5' }[type] || '#00ADB5';
  return (
    <div style={{
      marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `${c}15`, border: `1px solid ${c}40`,
      borderRadius: 6, padding: '6px 12px', fontSize: 13, color: c,
    }}>
      {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'} {text}
    </div>
  );
}

const INP = {
  background: '#2c313a', border: '1px solid #454a52', borderRadius: 8,
  color: '#EEEEEE', fontSize: 14, padding: '9px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
};

const BTN = (active, danger) => ({
  background: danger ? 'rgba(239,79,94,0.12)' : active ? '#00ADB5' : '#2c313a',
  color: danger ? '#ef4f5e' : active ? '#17292a' : '#8a8f96',
  border: `1px solid ${danger ? 'rgba(239,79,94,0.35)' : active ? 'transparent' : '#454a52'}`,
  borderRadius: 8, padding: '9px 18px', cursor: active ? 'pointer' : 'default',
  fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0,
});

// ─── Danger action component ──────────────────────────────────────────────────

function DangerAction({ title, description, onExecute, busy }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState('');
  const canGo = confirm === 'CONFIRM';

  const execute = async () => {
    if (!canGo) return;
    await onExecute();
    setOpen(false);
    setConfirm('');
  };

  return (
    <div style={{ borderBottom: '1px solid #2c313a', paddingBottom: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#EEEEEE', fontSize: 14, fontWeight: 500 }}>{title}</div>
          <div style={{ color: '#8a8f96', fontSize: 12, marginTop: 2 }}>{description}</div>
        </div>
        <button onClick={() => { setOpen(v => !v); setConfirm(''); }} style={BTN(true, !open)}>
          {open ? 'Cancel' : 'Execute'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder='Type "CONFIRM" to proceed'
            style={{ ...INP, flex: '1 1 200px' }}
            onFocus={e => { e.target.style.borderColor = '#ef4f5e'; }}
            onBlur={e  => { e.target.style.borderColor = '#454a52'; }}
          />
          <button
            onClick={execute}
            disabled={!canGo || busy}
            style={{ ...BTN(canGo && !busy, true), cursor: canGo && !busy ? 'pointer' : 'default' }}
          >
            {busy ? 'Working…' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Settings() {
  // ── Gemini API key ──────────────────────────────────────────────────────────
  const [keyStatus,   setKeyStatus]   = useState(null);
  const [keyInput,    setKeyInput]    = useState('');
  const [showKey,     setShowKey]     = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [saveMsg,     setSaveMsg]     = useState(null);
  const [testMsg,     setTestMsg]     = useState(null);

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportMsg,   setExportMsg]   = useState(null);

  // ── Backup / Restore ────────────────────────────────────────────────────────
  const [backupData,    setBackupData]    = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [backupMsg,     setBackupMsg]     = useState(null);
  const [restoring,     setRestoring]     = useState(false);
  const fileRef = useRef(null);

  // ── Password ────────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg,  setPwMsg]  = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  // ── Danger zone ─────────────────────────────────────────────────────────────
  const [dangerMsg,    setDangerMsg]    = useState(null);
  const [dangerBusy,   setDangerBusy]   = useState('');

  useEffect(() => {
    api.get('/gemini/key-status')
      .then(({ data }) => setKeyStatus(data))
      .catch(() => setKeyStatus({ configured: false, masked: null }));
  }, []);

  // ── Gemini handlers ─────────────────────────────────────────────────────────
  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSaveLoading(true); setSaveMsg(null);
    try {
      const { data } = await api.post('/gemini/save-key', { key: keyInput.trim() });
      setKeyStatus({ configured: true, masked: data.masked });
      setKeyInput('');
      setSaveMsg({ type: 'success', text: `Key saved — ${data.masked}` });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save key' });
    } finally { setSaveLoading(false); }
  };

  const handleTestConnection = async () => {
    setTestLoading(true); setTestMsg(null);
    try {
      const { data } = await api.get('/gemini/test');
      setTestMsg({ type: 'success', text: `Gemini replied: "${data.reply}"` });
    } catch (err) {
      setTestMsg({ type: 'error', text: err.response?.data?.message || 'Connection failed' });
    } finally { setTestLoading(false); }
  };

  // ── Export handlers ─────────────────────────────────────────────────────────
  const handleExport = async (type) => {
    setExportMsg(null);
    try {
      const res = await api.get(`/settings/export/${type}`, { responseType: 'blob' });
      const mime = type === 'json' ? 'application/json' : 'text/csv';
      const ext  = type === 'json' ? 'json' : 'csv';
      const name = type === 'json'
        ? `personal-os-backup-${new Date().toISOString().split('T')[0]}.json`
        : `tasks-${new Date().toISOString().split('T')[0]}.csv`;
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click(); URL.revokeObjectURL(url);
      setExportMsg({ type: 'success', text: `${name} downloaded` });
    } catch {
      setExportMsg({ type: 'error', text: 'Export failed. Try again.' });
    }
  };

  // ── Backup / Restore handlers ────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBackupMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setBackupData(data);
        setBackupPreview({
          tasks:       data.tasks?.length       || 0,
          projects:    data.projects?.length    || 0,
          internships: data.internships?.length || 0,
          content:     data.content?.length     || 0,
          goals:       data.goals?.length       || 0,
          exportedAt:  data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '—',
        });
      } catch {
        setBackupMsg({ type: 'error', text: 'Invalid JSON file — could not parse' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!backupData) return;
    setRestoring(true); setBackupMsg(null);
    try {
      const { data } = await api.post('/settings/backup', backupData);
      const counts = Object.entries(data.restored || {}).map(([k, v]) => `${v} ${k}`).join(', ');
      setBackupMsg({ type: 'success', text: `Restored: ${counts || 'nothing to restore'}` });
      setBackupData(null); setBackupPreview(null);
    } catch {
      setBackupMsg({ type: 'error', text: 'Restore failed. Check your backup file.' });
    } finally { setRestoring(false); }
  };

  // ── Password handler ─────────────────────────────────────────────────────────
  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) return setPwMsg({ type: 'error', text: 'All fields are required' });
    if (pwForm.next !== pwForm.confirm) return setPwMsg({ type: 'error', text: 'New passwords do not match' });
    if (pwForm.next.length < 6) return setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' });
    setPwBusy(true);
    try {
      await api.put('/settings/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    } finally { setPwBusy(false); }
  };

  // ── Danger zone handler ──────────────────────────────────────────────────────
  const runDanger = async (action) => {
    setDangerBusy(action); setDangerMsg(null);
    try {
      if (action === 'clear_tasks')    await api.delete('/settings/clear/tasks');
      if (action === 'clear_activity') await api.delete('/settings/clear/activity');
      if (action === 'reset_dsa')      await api.put('/settings/reset/dsa');
      setDangerMsg({ type: 'success', text: 'Done! Changes may require a page refresh.' });
    } catch {
      setDangerMsg({ type: 'error', text: 'Operation failed. Try again.' });
    } finally { setDangerBusy(''); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 32px', maxWidth: 660, overflowY: 'auto' }}>

      {/* ── Section 1: Gemini API Key ── */}
      <Section title="Gemini AI">
        <Field label="API Key" hint="Your key is stored on the backend server — never sent to the browser.">
          {keyStatus === null ? (
            <div style={{ height: 40, background: '#2c313a', borderRadius: 8, animation: 'skel 1.5s ease-in-out infinite' }} />
          ) : (
            <>
              {keyStatus.configured && (
                <div style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(62,201,138,0.1)', border: '1px solid rgba(62,201,138,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#3ec98a', fontFamily: 'monospace' }}>
                  ✓ Key set: {keyStatus.masked}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder={keyStatus.configured ? 'Enter new key to replace…' : 'Enter your Gemini API key…'}
                    style={{ ...INP, paddingRight: 36 }}
                    onFocus={e => { e.target.style.borderColor = '#00ADB5'; }}
                    onBlur={e  => { e.target.style.borderColor = '#454a52'; }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(); }}
                  />
                  <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a8f96', fontSize: 14 }}>
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button onClick={handleSaveKey} disabled={!keyInput.trim() || saveLoading} style={BTN(!!keyInput.trim() && !saveLoading, false)}>
                  {saveLoading ? 'Saving…' : 'Save Key'}
                </button>
              </div>
              <Msg {...(saveMsg || {})} />
            </>
          )}
        </Field>

        <Field label="Test Connection" hint="Sends a quick message to verify the key is working.">
          <button onClick={handleTestConnection} disabled={testLoading || !keyStatus?.configured} style={BTN(!!keyStatus?.configured && !testLoading, false)}>
            {testLoading ? 'Testing…' : '⚡ Test Connection'}
          </button>
          {!keyStatus?.configured && <div style={{ color: '#8a8f96', fontSize: 12, marginTop: 6 }}>Save a key first</div>}
          <Msg {...(testMsg || {})} />
        </Field>
      </Section>

      {/* ── Section 2: Export ── */}
      <Section title="Export Data">
        <Field label="Full Backup (JSON)" hint="Exports all tasks, projects, internships, goals, content, and Gemini sessions.">
          <button onClick={() => handleExport('json')} style={BTN(true, false)}>
            ⬇ Export as JSON
          </button>
        </Field>
        <Field label="Tasks Only (CSV)" hint="Exports all tasks as a spreadsheet-compatible CSV file.">
          <button onClick={() => handleExport('csv')} style={BTN(true, false)}>
            ⬇ Export Tasks as CSV
          </button>
        </Field>
        <Msg {...(exportMsg || {})} />
      </Section>

      {/* ── Section 3: Backup & Restore ── */}
      <Section title="Backup & Restore">
        <Field
          label="Restore from JSON"
          hint="Upload a backup file. Tasks, projects, internships, goals, and content will be overwritten. DSA progress is excluded."
        >
          <div style={{ padding: 12, background: 'rgba(244,183,64,0.08)', border: '1px solid rgba(244,183,64,0.25)', borderRadius: 8, fontSize: 12, color: '#f4b740', marginBottom: 12 }}>
            ⚠ This will overwrite existing data. This cannot be undone.
          </div>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={BTN(true, false)}>
            📂 Choose Backup File
          </button>
        </Field>

        {backupPreview && (
          <div style={{ background: '#2c313a', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ color: '#EEEEEE', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Preview — what will be restored:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                ['Tasks',       backupPreview.tasks],
                ['Projects',    backupPreview.projects],
                ['Internships', backupPreview.internships],
                ['Content',     backupPreview.content],
                ['Goals',       backupPreview.goals],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#8a8f96' }}>{k}</span>
                  <span style={{ color: '#EEEEEE', fontFamily: 'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#8a8f96' }}>Exported: {backupPreview.exportedAt}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={handleRestore} disabled={restoring} style={BTN(!restoring, false)}>
                {restoring ? 'Restoring…' : '✓ Confirm Restore'}
              </button>
              <button onClick={() => { setBackupData(null); setBackupPreview(null); }} style={{ ...BTN(true, false), background: 'transparent', color: '#8a8f96', border: '1px solid #454a52' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <Msg {...(backupMsg || {})} />
      </Section>

      {/* ── Section 4: Change Password ── */}
      <Section title="Change Password">
        <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Current Password">
            <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
              placeholder="Your current password" style={INP}
              onFocus={e => { e.target.style.borderColor = '#00ADB5'; }} onBlur={e => { e.target.style.borderColor = '#454a52'; }} />
          </Field>
          <Field label="New Password">
            <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              placeholder="At least 6 characters" style={INP}
              onFocus={e => { e.target.style.borderColor = '#00ADB5'; }} onBlur={e => { e.target.style.borderColor = '#454a52'; }} />
          </Field>
          <Field label="Confirm New Password">
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password" style={INP}
              onFocus={e => { e.target.style.borderColor = '#00ADB5'; }} onBlur={e => { e.target.style.borderColor = '#454a52'; }} />
          </Field>
          <div>
            <button type="submit" disabled={pwBusy} style={BTN(!pwBusy, false)}>
              {pwBusy ? 'Saving…' : 'Save Password'}
            </button>
            <Msg {...(pwMsg || {})} />
          </div>
        </form>
      </Section>

      {/* ── Section 5: Danger Zone ── */}
      <Section title="⚠ Danger Zone">
        <p style={{ color: '#8a8f96', fontSize: 13, marginBottom: 20 }}>
          These actions are irreversible. Type <code style={{ background: '#2c313a', padding: '1px 5px', borderRadius: 4, color: '#ef4f5e' }}>CONFIRM</code> in each field to proceed.
        </p>
        <DangerAction
          title="Clear all tasks"
          description="Permanently deletes every task and subtask. Activity log entries are preserved."
          onExecute={() => runDanger('clear_tasks')}
          busy={dangerBusy === 'clear_tasks'}
        />
        <DangerAction
          title="Reset DSA progress"
          description="Sets all 308 problems back to Unsolved. Removes custom problems and clears notes/timers."
          onExecute={() => runDanger('reset_dsa')}
          busy={dangerBusy === 'reset_dsa'}
        />
        <DangerAction
          title="Clear activity log"
          description="Wipes the entire activity history shown on the Home page. Cannot be recovered."
          onExecute={() => runDanger('clear_activity')}
          busy={dangerBusy === 'clear_activity'}
        />
        <Msg {...(dangerMsg || {})} />
      </Section>

      <style>{`@keyframes skel{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
