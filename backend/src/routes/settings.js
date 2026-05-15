// Settings routes — export, backup, password change, danger zone
import { Router }       from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import protect           from '../middleware/auth.js';
import Task              from '../models/Task.js';
import DSAProblem        from '../models/DSAProblem.js';
import Project           from '../models/Project.js';
import Internship        from '../models/Internship.js';
import ContentPost       from '../models/ContentPost.js';
import Goal              from '../models/Goal.js';
import GeminiSession     from '../models/GeminiSession.js';
import ActivityLog       from '../models/ActivityLog.js';

const router = Router();
router.use(protect);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH  = join(__dirname, '../../.env');

// ─── Export ──────────────────────────────────────────────────────────────────

// GET /api/settings/export/json — full backup as downloadable JSON
router.get('/export/json', async (req, res, next) => {
  try {
    const [tasks, dsaProblems, projects, internships, content, goals, sessions] = await Promise.all([
      Task.find().lean(),
      DSAProblem.find({
        $or: [{ status: 'Solved' }, { notes: { $ne: '' } }, { needsRevision: true }, { isCustom: true }],
      }).lean(),
      Project.find().lean(),
      Internship.find().lean(),
      ContentPost.find().lean(),
      Goal.find().lean(),
      GeminiSession.find().sort({ updatedAt: -1 }).limit(20).lean(),
    ]);

    const payload = { exportedAt: new Date(), tasks, dsaProblems, projects, internships, content, goals, sessions };
    const filename = `personal-os-backup-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(payload);
  } catch (err) { next(err); }
});

// GET /api/settings/export/csv — tasks as CSV download
router.get('/export/csv', async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    const headers = ['Title', 'Category', 'Priority', 'Status', 'Due Date', 'Time Horizon', 'Notes', 'Rescheduled Count', 'Created At'];
    const rows = tasks.map(t => [
      t.title, t.category, t.priority, t.status,
      t.dueDate    ? new Date(t.dueDate).toLocaleDateString()    : '',
      t.timeHorizon || '',
      (t.notes || '').replace(/\n/g, ' '),
      t.rescheduledCount || 0,
      new Date(t.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filename = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) { next(err); }
});

// ─── Backup / Restore ────────────────────────────────────────────────────────

// POST /api/settings/backup — restore from uploaded JSON
router.post('/backup', async (req, res, next) => {
  try {
    const { tasks, projects, internships, content, goals } = req.body;
    const restored = {};

    const strip = ({ _id, __v, ...rest }) => rest;

    if (Array.isArray(tasks) && tasks.length) {
      await Task.deleteMany({});
      await Task.insertMany(tasks.map(strip), { ordered: false }).catch(() => {});
      restored.tasks = tasks.length;
    }
    if (Array.isArray(projects) && projects.length) {
      await Project.deleteMany({});
      await Project.insertMany(projects.map(strip), { ordered: false }).catch(() => {});
      restored.projects = projects.length;
    }
    if (Array.isArray(internships) && internships.length) {
      await Internship.deleteMany({});
      await Internship.insertMany(internships.map(strip), { ordered: false }).catch(() => {});
      restored.internships = internships.length;
    }
    if (Array.isArray(content) && content.length) {
      await ContentPost.deleteMany({});
      await ContentPost.insertMany(content.map(strip), { ordered: false }).catch(() => {});
      restored.content = content.length;
    }
    if (Array.isArray(goals) && goals.length) {
      await Goal.deleteMany({});
      await Goal.insertMany(goals.map(strip), { ordered: false }).catch(() => {});
      restored.goals = goals.length;
    }

    res.json({ success: true, restored });
  } catch (err) { next(err); }
});

// ─── Password ─────────────────────────────────────────────────────────────────

// PUT /api/settings/password — change ADMIN_PASSWORD
router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || currentPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    process.env.ADMIN_PASSWORD = newPassword;

    try {
      let envContent = readFileSync(ENV_PATH, 'utf8');
      envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, () => `ADMIN_PASSWORD=${newPassword}`);
      writeFileSync(ENV_PATH, envContent, 'utf8');
    } catch (fileErr) {
      console.warn('[Settings] Could not update .env file:', fileErr.message);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

// ─── Danger Zone ─────────────────────────────────────────────────────────────

// DELETE /api/settings/clear/tasks
router.delete('/clear/tasks', async (req, res, next) => {
  try {
    const result = await Task.deleteMany({});
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) { next(err); }
});

// DELETE /api/settings/clear/activity
router.delete('/clear/activity', async (req, res, next) => {
  try {
    const result = await ActivityLog.deleteMany({});
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) { next(err); }
});

// PUT /api/settings/reset/dsa — reset all DSA progress to Unsolved, remove custom problems
router.put('/reset/dsa', async (req, res, next) => {
  try {
    await DSAProblem.deleteMany({ isCustom: true });
    const result = await DSAProblem.updateMany(
      {},
      { $set: { status: 'Unsolved', notes: '', dateSolved: null, timeTaken: null, needsRevision: false } },
    );
    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) { next(err); }
});

export default router;
