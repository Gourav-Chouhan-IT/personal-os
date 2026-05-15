// Activity routes — GET /api/activity returns last 20 log entries
import { Router } from 'express';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
