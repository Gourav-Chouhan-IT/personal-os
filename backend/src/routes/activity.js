// Activity routes — GET /api/activity returns last 20 log entries
import { Router } from 'express';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 500);
    const skip  = parseInt(req.query.skip) || 0;
    const filter = {};
    if (req.query.action)     filter.action     = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
