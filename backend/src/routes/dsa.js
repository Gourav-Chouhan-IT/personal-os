// DSA routes — Striver A2Z tracker: list, stats, update, custom CRUD
// NOTE: /stats must be registered before /:id so Express doesn't treat it as an ID
import { Router } from 'express';
import DSAProblem from '../models/DSAProblem.js';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

// GET /api/dsa — all problems with optional ?topic=&status=&difficulty= filters
router.get('/', async (req, res, next) => {
  try {
    const { topic, status, difficulty } = req.query;
    const filter = {};
    if (topic)      filter.topic      = { $in: topic.split(',') };
    if (status)     filter.status     = { $in: status.split(',') };
    if (difficulty) filter.difficulty = { $in: difficulty.split(',') };

    const problems = await DSAProblem.find(filter).sort({ topic: 1, createdAt: 1 }).lean();
    res.json(problems);
  } catch (err) {
    next(err);
  }
});

// GET /api/dsa/stats — topic-wise counts, streak, today's solve count
router.get('/stats', async (req, res, next) => {
  try {
    const all = await DSAProblem.find().lean();

    // Topic stats
    const topicMap = {};
    for (const p of all) {
      if (!topicMap[p.topic]) topicMap[p.topic] = { total: 0, solved: 0 };
      topicMap[p.topic].total++;
      if (p.status === 'Solved') topicMap[p.topic].solved++;
    }
    const topicStats = Object.entries(topicMap).map(([topic, v]) => ({ topic, ...v }));

    // Today's solve count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = all.filter(
      p => p.status === 'Solved' && p.dateSolved && new Date(p.dateSolved) >= todayStart
    ).length;

    // Streak — consecutive days ending today (or yesterday) with at least one solve
    const dateSet = new Set(
      all
        .filter(p => p.status === 'Solved' && p.dateSolved)
        .map(p => new Date(p.dateSolved).toISOString().split('T')[0])
    );
    let streak = 0;
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 366; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dateSet.has(key)) {
        streak++;
      } else if (i === 0) {
        // today has no solve — check if yesterday starts a streak
        continue;
      } else {
        break;
      }
    }

    res.json({ topicStats, todayCount, streak, total: all.length, solved: all.filter(p => p.status === 'Solved').length });
  } catch (err) {
    next(err);
  }
});

// PUT /api/dsa/:id — update (mark solved, notes, revision flag, timeTaken)
router.put('/:id', async (req, res, next) => {
  try {
    const prev = await DSAProblem.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Problem not found' });

    // Auto-set dateSolved when marking solved
    const updates = { ...req.body };
    if (updates.status === 'Solved' && prev.status !== 'Solved') {
      updates.dateSolved = new Date();
    }
    if (updates.status === 'Unsolved' && prev.status === 'Solved') {
      updates.dateSolved = null;
    }

    const problem = await DSAProblem.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });

    // Activity log
    if (updates.status === 'Solved' && prev.status !== 'Solved') {
      await ActivityLog.create({
        action: 'completed', entityType: 'dsa', entityId: problem._id,
        description: `Solved ${problem.name} · ${problem.topic}`,
      });
    } else if (updates.needsRevision === true && !prev.needsRevision) {
      await ActivityLog.create({
        action: 'updated', entityType: 'dsa', entityId: problem._id,
        description: `Flagged for revision: ${problem.name}`,
      });
    }

    res.json(problem);
  } catch (err) {
    next(err);
  }
});

// POST /api/dsa/custom — add a custom problem
router.post('/custom', async (req, res, next) => {
  try {
    const problem = await DSAProblem.create({ ...req.body, isCustom: true });
    await ActivityLog.create({
      action: 'created', entityType: 'dsa', entityId: problem._id,
      description: `Added custom problem: ${problem.name}`,
    });
    res.status(201).json(problem);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dsa/:id — custom problems only
router.delete('/:id', async (req, res, next) => {
  try {
    const problem = await DSAProblem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    if (!problem.isCustom) return res.status(403).json({ message: 'Cannot delete seeded problems' });

    await problem.deleteOne();
    res.json({ message: 'Problem deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
