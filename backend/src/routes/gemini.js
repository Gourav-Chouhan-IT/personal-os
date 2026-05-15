// Gemini Chat routes — AI assistant with live personal context and action execution
// SECURITY: GEMINI_API_KEY is resolved on the backend only, never sent to the frontend
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import protect from '../middleware/auth.js';
import GeminiSession from '../models/GeminiSession.js';
import Config from '../models/Config.js';
import Task from '../models/Task.js';
import DSAProblem from '../models/DSAProblem.js';
import Project from '../models/Project.js';
import Internship from '../models/Internship.js';
import Goal from '../models/Goal.js';
import ActivityLog from '../models/ActivityLog.js';

const router = Router();
router.use(protect);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getGeminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const cfg = await Config.findOne({ key: 'GEMINI_API_KEY' });
  return cfg?.value || null;
}

async function buildLiveContext() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);

  const [tasks, dsaSolved, dsaTotal, dsaRevision, projects, internships, followups, goals] = await Promise.all([
    Task.find({ status: { $ne: 'Done' }, dueDate: { $lte: weekEnd } }).sort({ dueDate: 1 }).lean(),
    DSAProblem.countDocuments({ status: 'Solved' }),
    DSAProblem.countDocuments(),
    DSAProblem.find({ needsRevision: true }).lean(),
    Project.find().lean(),
    Internship.find({ status: { $nin: ['Rejected', 'Offer'] } }).lean(),
    Internship.find({
      status: { $nin: ['Rejected', 'Offer'] },
      $or: [
        { followUpDate: { $lte: new Date() } },
        { status: 'Applied', dateApplied: { $lte: sevenDaysAgo } },
      ],
    }).lean(),
    Goal.find().lean(),
  ]);

  const overdue   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
  const thisWeek  = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= weekEnd);
  const inProgress = internships.filter(i => ['Screening', 'Technical', 'Final'].includes(i.status));

  let ctx = `Current date: ${today.toISOString().split('T')[0]}\n\n`;

  ctx += `TASKS:\n`;
  if (overdue.length)   ctx += `Overdue (${overdue.length}): ${overdue.map(t => `"${t.title}" [${t.category}, ${t.priority}]`).join(', ')}\n`;
  if (thisWeek.length)  ctx += `Due this week (${thisWeek.length}): ${thisWeek.map(t => `"${t.title}" [${new Date(t.dueDate).toISOString().split('T')[0]}]`).join(', ')}\n`;
  if (!overdue.length && !thisWeek.length) ctx += `No overdue or upcoming tasks this week.\n`;

  ctx += `\nDSA: ${dsaSolved}/${dsaTotal} solved`;
  if (dsaRevision.length) ctx += `, ${dsaRevision.length} needing revision`;
  ctx += '\n';

  ctx += `\nPROJECTS:\n`;
  if (projects.length) projects.forEach(p => { ctx += `- ${p.name}: ${p.status} (${p.progress ?? 0}% done)\n`; });
  else ctx += `No projects tracked.\n`;

  ctx += `\nINTERNSHIPS: ${internships.length} active, ${inProgress.length} in progress, ${followups.length} follow-ups due\n`;

  ctx += `\nGOALS:\n`;
  if (goals.length) {
    goals.forEach(g => { ctx += `- ${g.name}: ${g.progress}% [${g.status}]\n`; });
  } else {
    ctx += `No goals set.\n`;
  }

  return ctx;
}

function parseActions(text) {
  const match = text.match(/<actions>([\s\S]*?)<\/actions>/);
  if (!match) return { cleanText: text, actions: [] };
  try {
    const actions = JSON.parse(match[1].trim());
    return {
      cleanText: text.replace(/<actions>[\s\S]*?<\/actions>/, '').trim(),
      actions: Array.isArray(actions) ? actions : [],
    };
  } catch {
    return { cleanText: text, actions: [] };
  }
}

// ─── Routes (statics before params) ─────────────────────────────────────────

// GET /api/gemini/key-status
router.get('/key-status', async (req, res, next) => {
  try {
    const key = await getGeminiKey();
    if (!key) return res.json({ configured: false, masked: null });
    const masked = key.length > 8 ? `****${key.slice(-4)}` : '****';
    res.json({ configured: true, masked });
  } catch (err) { next(err); }
});

// POST /api/gemini/save-key
router.post('/save-key', async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ message: 'API key is required' });
    }
    await Config.findOneAndUpdate(
      { key: 'GEMINI_API_KEY' },
      { value: key.trim() },
      { upsert: true, new: true },
    );
    const masked = key.length > 8 ? `****${key.slice(-4)}` : '****';
    res.json({ success: true, masked });
  } catch (err) { next(err); }
});

// GET /api/gemini/test — verify the API key works
router.get('/test', async (req, res, next) => {
  try {
    const apiKey = await getGeminiKey();
    if (!apiKey) return res.status(400).json({ message: 'Gemini API key not configured.' });
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Reply with exactly: "Connection successful"');
    res.json({ success: true, reply: result.response.text().trim() });
  } catch (err) { next(err); }
});

// GET /api/gemini/context — structured context snapshot for the preview panel
router.get('/context', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);

    const [tasks, dsaSolved, dsaTotal, projects, internships, followups, goals] = await Promise.all([
      Task.find({ status: { $ne: 'Done' }, dueDate: { $lte: weekEnd } }).sort({ dueDate: 1 }).lean(),
      DSAProblem.countDocuments({ status: 'Solved' }),
      DSAProblem.countDocuments(),
      Project.find().lean(),
      Internship.find({ status: { $nin: ['Rejected', 'Offer'] } }).lean(),
      Internship.find({
        status: { $nin: ['Rejected', 'Offer'] },
        $or: [
          { followUpDate: { $lte: new Date() } },
          { status: 'Applied', dateApplied: { $lte: sevenDaysAgo } },
        ],
      }).lean(),
      Goal.find().lean(),
    ]);

    const overdue  = tasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
    const thisWeek = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today);

    res.json({
      tasks: {
        overdue: overdue.length,
        thisWeek: thisWeek.length,
        overdueItems: overdue.slice(0, 3).map(t => ({ title: t.title, priority: t.priority })),
      },
      dsa: { solved: dsaSolved, total: dsaTotal },
      projects: projects.map(p => ({ name: p.name, status: p.status, progress: p.progress ?? 0 })),
      internships: {
        active: internships.length,
        inProgress: internships.filter(i => ['Screening', 'Technical', 'Final'].includes(i.status)).length,
        followupsDue: followups.length,
      },
      goals: {
        total: goals.length,
        atRisk: goals.filter(g => ['At Risk', 'Delayed'].includes(g.status)).length,
        items: goals.map(g => ({ name: g.name, progress: g.progress, status: g.status })),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/gemini/sessions — last 10 sessions (summary only)
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await GeminiSession.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title createdAt updatedAt messages contextEnabled')
      .lean();
    res.json(sessions.map(s => ({ ...s, messageCount: s.messages?.length ?? 0, messages: undefined })));
  } catch (err) { next(err); }
});

// DELETE /api/gemini/sessions/:id
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const session = await GeminiSession.findByIdAndDelete(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) { next(err); }
});

// GET /api/gemini/sessions/:id — full session with all messages
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await GeminiSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) { next(err); }
});

// POST /api/gemini/chat — main chat with live context injection
router.post('/chat', async (req, res, next) => {
  try {
    const { message, sessionId, contextEnabled = true } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const apiKey = await getGeminiKey();
    if (!apiKey) {
      return res.status(400).json({ message: 'Gemini API key not configured. Go to Settings to add it.' });
    }

    let systemPrompt = `You are a personal AI assistant for Gourav, a 2nd year B.Tech IT student at VIT Bhopal building toward AI + Cybersecurity entrepreneurship.\n\n`;

    if (contextEnabled) {
      const ctx = await buildLiveContext();
      systemPrompt += `CURRENT CONTEXT:\n${ctx}\n`;
    }

    systemPrompt += `
You have the ability to suggest actions. When you want to create a task, add a company, or update something, end your response with a JSON block in this exact format:
<actions>
[{"type":"create_task","title":"...","category":"...","priority":"high|medium|low","dueDate":"YYYY-MM-DD"},
 {"type":"update_task_status","taskId":"...","status":"Done"},
 {"type":"add_internship","company":"...","role":"...","status":"Identified"},
 {"type":"log_worklog","projectId":"...","hours":2,"description":"..."},
 {"type":"create_goal","name":"...","category":"...","targetDate":"YYYY-MM-DD"}]
</actions>

Only include the <actions> block when you are suggesting concrete actionable items. Never include it for general conversation.`;

    let session;
    if (sessionId) {
      session = await GeminiSession.findById(sessionId);
    }
    if (!session) {
      session = new GeminiSession({ contextEnabled, messages: [] });
    }

    const history = session.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: systemPrompt });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message.trim());
    const rawText = result.response.text();

    const { cleanText, actions } = parseActions(rawText);

    session.messages.push({ role: 'user',  content: message.trim(), timestamp: new Date(), actions: [] });
    session.messages.push({ role: 'model', content: cleanText, timestamp: new Date(), actions });

    if (session.messages.length === 2 && session.title === 'New Chat') {
      session.title = message.trim().slice(0, 50) + (message.trim().length > 50 ? '...' : '');
    }

    await session.save();

    res.json({ reply: cleanText, actions, sessionId: session._id });
  } catch (err) { next(err); }
});

const VALID_TASK_CATEGORIES = ['DSA', 'Project', 'CRM', 'Content', 'Goals', 'Personal', 'Other'];

// POST /api/gemini/action — execute confirmed actions from chat
router.post('/action', async (req, res, next) => {
  try {
    console.log('[Gemini action] Request body:', JSON.stringify(req.body, null, 2));
    const { actions, sessionId } = req.body;
    if (!Array.isArray(actions) || !actions.length) {
      return res.status(400).json({ message: 'Actions array is required' });
    }

    const executed = [];
    const skipped  = [];
    const errors   = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_task': {
            console.log(`[Gemini action] Creating task: ${action.title}`);
            // Deduplication — skip if a task with this title already exists (case-insensitive)
            if (action.title) {
              const escapedTitle = action.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const existing = await Task.findOne({
                title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') },
              });
              if (existing) {
                console.log(`[Gemini action] Skipped duplicate task: ${action.title}`);
                skipped.push({ type: action.type, skipped: true, reason: 'Task already exists', title: action.title });
                break;
              }
            }
            const priority = action.priority
              ? action.priority.charAt(0).toUpperCase() + action.priority.slice(1).toLowerCase()
              : 'Medium';
            const task = await Task.create({
              title:    action.title,
              category: VALID_TASK_CATEGORIES.includes(action.category) ? action.category : 'Other',
              priority: ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
              dueDate:  action.dueDate || null,
              status:   'Todo',
              source:   'Gemini Chat',
            });
            await ActivityLog.create({
              action: 'created', entityType: 'task', entityId: task._id,
              description: `[Gemini] Created task: ${task.title}`,
            });
            executed.push({ type: action.type, id: task._id, title: task.title });
            break;
          }
          case 'update_task_status': {
            const task = await Task.findByIdAndUpdate(
              action.taskId,
              { status: action.status },
              { new: true },
            );
            if (!task) { errors.push({ type: action.type, error: `Task ${action.taskId} not found` }); break; }
            if (action.status === 'Done') {
              await ActivityLog.create({
                action: 'completed', entityType: 'task', entityId: task._id,
                description: `[Gemini] Completed: ${task.title}`,
              });
            }
            executed.push({ type: action.type, id: task._id, title: task.title });
            break;
          }
          case 'add_internship': {
            const item = await Internship.create({
              company:     action.company,
              role:        action.role || '',
              status:      action.status || 'Identified',
              dateApplied: action.dateApplied || null,
            });
            await ActivityLog.create({
              action: 'created', entityType: 'crm', entityId: item._id,
              description: `[Gemini] Added ${item.company} — ${item.role || 'Internship'}`,
            });
            executed.push({ type: action.type, id: item._id, company: item.company });
            break;
          }
          case 'log_worklog': {
            const project = await Project.findByIdAndUpdate(
              action.projectId,
              { $push: { workLog: { date: new Date(), hours: action.hours || 1, description: action.description || '' } } },
              { new: true },
            );
            if (!project) { errors.push({ type: action.type, error: `Project ${action.projectId} not found` }); break; }
            executed.push({ type: action.type, id: project._id, name: project.name });
            break;
          }
          case 'create_goal': {
            const goal = await Goal.create({
              name:       action.name,
              category:   action.category || 'Career',
              targetDate: action.targetDate || null,
              status:     'On Track',
            });
            await ActivityLog.create({
              action: 'created', entityType: 'goal', entityId: goal._id,
              description: `[Gemini] Created goal: ${goal.name}`,
            });
            executed.push({ type: action.type, id: goal._id, name: goal.name });
            break;
          }
          default:
            errors.push({ type: action.type, error: 'Unknown action type' });
        }
      } catch (actionErr) {
        errors.push({ type: action.type, error: actionErr.message });
      }
    }

    // Persist confirmed: true on matching actions in the session document
    if (sessionId && executed.length > 0) {
      try {
        const sessionDoc = await GeminiSession.findById(sessionId);
        if (sessionDoc) {
          let dirty = false;
          sessionDoc.messages.forEach((msg, msgIdx) => {
            if (!msg.actions?.length) return;
            let messageModified = false;
            const updatedActions = msg.actions.map(a => {
              if (!a || a.confirmed) return a;
              const wasExecuted = executed.some(r =>
                r.type === a.type &&
                (r.title === a.title || r.company === a.company || r.name === a.name),
              );
              if (wasExecuted) { messageModified = true; dirty = true; return { ...a, confirmed: true }; }
              return a;
            });
            if (messageModified) sessionDoc.messages[msgIdx].actions = updatedActions;
          });
          if (dirty) {
            sessionDoc.markModified('messages');
            await sessionDoc.save();
          }
        }
      } catch (sessionErr) {
        console.error('[Gemini action] Failed to persist confirmed state:', sessionErr.message);
      }
    }

    res.json({ executed, skipped, errors });
  } catch (err) { next(err); }
});

export default router;
