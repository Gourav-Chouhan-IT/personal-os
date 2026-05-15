// Goal model — career/technical/life goals with health tracking and linked trackers
import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  category:      { type: String, enum: ['Career', 'Technical', 'Life'], default: 'Career' },
  phase:         { type: String, default: 'Phase 1' },
  targetDate:    { type: Date },
  progress:      { type: Number, default: 0, min: 0, max: 100 },
  linkedTasks:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  linkedTracker: { type: String, enum: ['dsa', 'internship', null, ''], default: null },
  status:        { type: String, enum: ['On Track', 'At Risk', 'Delayed', 'Complete'], default: 'On Track' },
  notes:         { type: String, default: '' },
  isLife:        { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Goal', goalSchema);
