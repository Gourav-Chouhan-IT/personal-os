// Project model — portfolio projects with milestones, work log, and notes
import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  targetDate: { type: Date },
  status:     { type: String, enum: ['Pending', 'Complete'], default: 'Pending' },
}, { _id: true });

const workLogSchema = new mongoose.Schema({
  date:        { type: Date, default: Date.now },
  hours:       { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  status:      { type: String, enum: ['Planning', 'Building', 'Complete', 'Deployed'], default: 'Planning' },
  description: { type: String, default: '' },
  techStack:   [{ type: String, trim: true }],
  githubLink:  { type: String, default: '' },
  liveLink:    { type: String, default: '' },
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  milestones:  [milestoneSchema],
  workLog:     [workLogSchema],
  notes:       { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
