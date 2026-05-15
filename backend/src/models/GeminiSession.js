// GeminiSession model — stores chat history and action suggestions per session
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'model'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  // Mixed array preserves all Gemini action fields as-is.
  // Expected shape per element: { type, title?, company?, name?, category?, priority?,
  //   dueDate?, taskId?, projectId?, hours?, description?, confirmed?: Boolean }
  actions:   [mongoose.Schema.Types.Mixed],
}, { _id: false });

const geminiSessionSchema = new mongoose.Schema({
  title:          { type: String, default: 'New Chat' },
  messages:       [messageSchema],
  contextEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('GeminiSession', geminiSessionSchema);
