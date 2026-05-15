// DSA Problem model — Striver A2Z sheet + custom problems
import mongoose from 'mongoose';

const dsaProblemSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  topic:         { type: String, required: true, trim: true },
  difficulty:    { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  leetcodeLink:  { type: String, default: '' },
  status:        { type: String, enum: ['Unsolved', 'Solved'], default: 'Unsolved' },
  notes:         { type: String, default: '' },
  dateSolved:    { type: Date, default: null },
  timeTaken:     { type: Number, default: 0 }, // minutes
  needsRevision: { type: Boolean, default: false },
  isCustom:      { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('DSAProblem', dsaProblemSchema);
