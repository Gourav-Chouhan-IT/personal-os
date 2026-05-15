// Content post model — LinkedIn, GitHub, Twitter drafts and scheduling
import mongoose from 'mongoose';

const contentPostSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  platform:    { type: String, enum: ['LinkedIn', 'GitHub', 'Twitter'], required: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  status:      { type: String, enum: ['Idea', 'Draft', 'Scheduled', 'Posted'], default: 'Idea' },
  plannedDate: { type: Date, default: null },
  draft:       { type: String, default: '' },
  postUrl:     { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('ContentPost', contentPostSchema);
