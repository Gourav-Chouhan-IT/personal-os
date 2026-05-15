// Project routes — CRUD + nested milestones and work log entries
import { Router } from 'express';
import Project from '../models/Project.js';
import protect from '../middleware/auth.js';

const router = Router();
router.use(protect);

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 }).lean();
    res.json(projects);
  } catch (err) { next(err); }
});

// POST /api/projects
router.post('/', async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) { next(err); }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

// POST /api/projects/:id/milestone
router.post('/:id/milestone', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { milestones: req.body } },
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// PUT /api/projects/:id/milestone/:mid
router.put('/:id/milestone/:mid', async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, 'milestones._id': req.params.mid },
      { $set: { 'milestones.$': { ...req.body, _id: req.params.mid } } },
      { new: true },
    );
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id/milestone/:mid
router.delete('/:id/milestone/:mid', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { milestones: { _id: req.params.mid } } },
      { new: true },
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// POST /api/projects/:id/worklog
router.post('/:id/worklog', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { workLog: req.body } },
      { new: true, runValidators: true },
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id/worklog/:wid
router.delete('/:id/worklog/:wid', async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { workLog: { _id: req.params.wid } } },
      { new: true },
    );
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

export default router;
