// Internship CRM routes — pipeline management with follow-up reminders
// NOTE: /followups must be registered before /:id
import { Router } from 'express';
import Internship from '../models/Internship.js';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

// GET /api/internships — list all, optional ?status= filter
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: req.query.status.split(',') };
    const items = await Internship.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/internships/followups — due today/overdue OR auto-flag (applied 7+ days ago)
router.get('/followups', async (req, res, next) => {
  try {
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); sevenDaysAgo.setHours(0,0,0,0);

    const items = await Internship.find({
      status: { $nin: ['Rejected', 'Offer'] },
      $or: [
        { followUpDate: { $lte: todayEnd } },
        { status: 'Applied', dateApplied: { $lte: sevenDaysAgo } },
      ],
    }).lean();
    res.json(items);
  } catch (err) { next(err); }
});

// POST /api/internships
router.post('/', async (req, res, next) => {
  try {
    const item = await Internship.create(req.body);
    await ActivityLog.create({
      action: 'created', entityType: 'crm', entityId: item._id,
      description: `Added ${item.company} — ${item.role || 'Internship'}`,
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// PUT /api/internships/:id
router.put('/:id', async (req, res, next) => {
  try {
    const prev = await Internship.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Not found' });

    const item = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (req.body.status && req.body.status !== prev.status) {
      if (req.body.status === 'Offer') {
        await ActivityLog.create({
          action: 'completed', entityType: 'crm', entityId: item._id,
          description: `OFFER: ${item.company} — ${item.role || 'Internship'}`,
        });
      } else {
        await ActivityLog.create({
          action: 'updated', entityType: 'crm', entityId: item._id,
          description: `Moved ${item.company} to ${item.status}`,
        });
      }
    }

    res.json(item);
  } catch (err) { next(err); }
});

// DELETE /api/internships/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Internship.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
