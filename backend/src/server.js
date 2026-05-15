// Entry point — boots Express, connects MongoDB, registers all routes
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activity.js';
import dsaRoutes from './routes/dsa.js';
import projectRoutes from './routes/projects.js';
import internshipRoutes from './routes/internships.js';
import contentRoutes from './routes/content.js';
import goalRoutes from './routes/goals.js';
import geminiRoutes   from './routes/gemini.js';
import settingsRoutes from './routes/settings.js';
import errorHandler from './middleware/errorHandler.js';
import { seedDSA } from './utils/seedDSA.js';
import { seedProjects } from './utils/seedProjects.js';
import { seedGoals } from './utils/seedGoals.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and seed
connectDB().then(() => Promise.all([seedDSA(), seedProjects(), seedGoals()]));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/tasks',    taskRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dsa',          dsaRoutes);
app.use('/api/projects',    projectRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/content',     contentRoutes);
app.use('/api/goals',       goalRoutes);
app.use('/api/gemini',      geminiRoutes);
app.use('/api/settings',    settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Personal OS backend running on http://localhost:${PORT}`);
});
