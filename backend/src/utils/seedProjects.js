// Seed projects — inserts 4 portfolio projects on startup if collection is empty
import Project from '../models/Project.js';

const SEED = [
  {
    name: 'Reelify',
    status: 'Deployed',
    description: 'AI-powered short-form video script generator using Gemini.',
    techStack: ['React', 'Vite', 'FastAPI', 'Gemini'],
    githubLink: 'https://github.com/Gourav-Chouhan-IT',
    liveLink: 'https://reelify-six.vercel.app',
    progress: 100,
  },
  {
    name: 'Health Dashboard',
    status: 'Complete',
    description: 'Real-time health monitoring dashboard with hardware sensor integration.',
    techStack: ['Arduino', 'Node', 'Express', 'MongoDB', 'React', 'Python'],
    progress: 100,
  },
  {
    name: 'Focus Map',
    status: 'Complete',
    description: 'Eye-gaze tracking productivity tool using WebGazer.js.',
    techStack: ['JavaScript', 'WebGazer.js'],
    progress: 100,
  },
  {
    name: 'CV Benchmarks',
    status: 'Complete',
    description: 'Comparative benchmark of YOLOv8, YOLOv5, ViT, and Swin for object detection.',
    techStack: ['Python', 'YOLOv8', 'YOLOv5', 'ViT', 'Swin'],
    progress: 100,
  },
];

export async function seedProjects() {
  const count = await Project.countDocuments();
  if (count > 0) return;
  await Project.insertMany(SEED);
  console.log(`Seeded ${SEED.length} projects.`);
}
