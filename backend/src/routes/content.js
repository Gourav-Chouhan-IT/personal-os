// Content calendar routes — post scheduling for LinkedIn, GitHub, Twitter
// NOTE: /overdue must be before /:id
import { Router } from 'express';
import ContentPost from '../models/ContentPost.js';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

// GET /api/content — all posts, optional ?status=
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: req.query.status.split(',') };
    const posts = await ContentPost.find(filter).sort({ plannedDate: 1, createdAt: -1 }).lean();
    res.json(posts);
  } catch (err) { next(err); }
});

// GET /api/content/overdue — not Posted AND plannedDate < today
router.get('/overdue', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const posts = await ContentPost.find({
      status: { $ne: 'Posted' },
      plannedDate: { $lt: today, $ne: null },
    }).lean();
    res.json(posts);
  } catch (err) { next(err); }
});

// POST /api/content
router.post('/', async (req, res, next) => {
  try {
    const post = await ContentPost.create(req.body);
    res.status(201).json(post);
  } catch (err) { next(err); }
});

// PUT /api/content/:id
router.put('/:id', async (req, res, next) => {
  try {
    const prev = await ContentPost.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Post not found' });

    const post = await ContentPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Log when status flips to Posted
    if (req.body.status === 'Posted' && prev.status !== 'Posted') {
      await ActivityLog.create({
        action: 'completed', entityType: 'content', entityId: post._id,
        description: `Posted: ${post.title} on ${post.platform}`,
      });
    }

    res.json(post);
  } catch (err) { next(err); }
});

// DELETE /api/content/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await ContentPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
