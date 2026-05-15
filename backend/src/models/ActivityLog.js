// ActivityLog model — append-only audit trail for task actions
import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  action:      { type: String, enum: ['created', 'completed', 'rescheduled', 'updated', 'deleted'], required: true },
  entityType:  { type: String, enum: ['task', 'goal', 'dsa', 'crm', 'content'], default: 'task' },
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('ActivityLog', activityLogSchema);
