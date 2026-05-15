// Task model — core entity for the Personal OS task manager
import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  done:  { type: Boolean, default: false },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true },
  category:         { type: String, enum: ['DSA', 'Project', 'CRM', 'Content', 'Goals', 'Personal', 'Other'], default: 'Other' },
  priority:         { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  dueDate:          { type: Date },
  timeHorizon:      { type: String, enum: ['Daily', 'Weekly', 'Phase', 'Milestone'], default: 'Daily' },
  status:           { type: String, enum: ['Todo', 'In Progress', 'Done'], default: 'Todo' },
  subtasks:         [subtaskSchema],
  notes:            { type: String, default: '' },
  source:           { type: String, default: '' },
  rescheduledCount: { type: Number, default: 0 },
  projectId:        { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
