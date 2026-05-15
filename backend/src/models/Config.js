// Config model — key-value store for runtime configuration (API keys, toggles)
import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Config', configSchema);
