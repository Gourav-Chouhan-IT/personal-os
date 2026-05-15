// Task routes — full CRUD + overdue-check + reschedule
// NOTE: /overdue-check must be registered before /:id so Express doesn't treat it as an ID
import { Router } from 'express';
import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import protect from '../middleware/auth.js';
import { rescheduleCheck } from '../utils/rescheduleCheck.js';

const router = Router();
router.use(protect);

// GET /api/tasks — list with optional ?category=&status=&priority= filters
router.get('/', async (req, res, next) => {
  try {
    const { category, status, priority, projectId } = req.query;
    const filter = {};
    if (category)  filter.category  = { $in: category.split(',') };
    if (status)    filter.status    = { $in: status.split(',') };
    if (priority)  filter.priority  = { $in: priority.split(',') };
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter).sort({ dueDate: 1, createdAt: -1 }).lean();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/overdue-check — must be before /:id
router.get('/overdue-check', async (req, res, next) => {
  try {
    const result = await rescheduleCheck();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks — create
router.post('/', async (req, res, next) => {
  try {
    const task = await Task.create(req.body);
    await ActivityLog.create({
      action: 'created', entityType: 'task', entityId: task._id,
      description: `Added task: ${task.title}`,
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id — update (handles status changes, subtasks, etc.)
router.put('/:id', async (req, res, next) => {
  try {
    const prev = await Task.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Task not found' });

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });

    // Log completion event
    if (req.body.status === 'Done' && prev.status !== 'Done') {
      await ActivityLog.create({
        action: 'completed', entityType: 'task', entityId: task._id,
        description: `Completed task: ${task.title}`,
      });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/reschedule — accepts { newDueDate }, increments rescheduledCount
router.put('/:id/reschedule', async (req, res, next) => {
  try {
    const { newDueDate } = req.body;
    if (!newDueDate) return res.status(400).json({ message: 'newDueDate is required' });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { dueDate: newDueDate, $inc: { rescheduledCount: 1 } },
      { new: true },
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await ActivityLog.create({
      action: 'rescheduled', entityType: 'task', entityId: task._id,
      description: `Rescheduled: ${task.title}`,
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

export default router;
