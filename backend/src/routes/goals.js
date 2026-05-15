// Goals routes — CRUD with always-fresh health check on GET
// NOTE: /health must be registered before /:id
import { Router } from 'express';
import Goal from '../models/Goal.js';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';
import { goalHealthCheck } from '../utils/goalHealthCheck.js';

const router = Router();
router.use(protect);

// GET /api/goals — returns goals with fresh health status
router.get('/', async (req, res, next) => {
  try {
    const goals = await goalHealthCheck();
    res.json(goals);
  } catch (err) { next(err); }
});

// GET /api/goals/health — returns only at-risk goals
router.get('/health', async (req, res, next) => {
  try {
    const all = await goalHealthCheck();
    res.json(all.filter(g => g.status === 'At Risk' || g.status === 'Delayed'));
  } catch (err) { next(err); }
});

// POST /api/goals
router.post('/', async (req, res, next) => {
  try {
    const goal = await Goal.create(req.body);
    await ActivityLog.create({
      action: 'created', entityType: 'goal', entityId: goal._id,
      description: `New goal: ${goal.name}`,
    });
    res.status(201).json(goal);
  } catch (err) { next(err); }
});

// PUT /api/goals/:id
router.put('/:id', async (req, res, next) => {
  try {
    const prev = await Goal.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Goal not found' });

    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (req.body.status === 'Complete' && prev.status !== 'Complete') {
      await ActivityLog.create({
        action: 'completed', entityType: 'goal', entityId: goal._id,
        description: `Completed goal: ${goal.name}`,
      });
    }

    res.json(goal);
  } catch (err) { next(err); }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (err) { next(err); }
});

export default router;
