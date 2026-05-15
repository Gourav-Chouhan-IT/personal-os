// Seed Phase 1 goals — inserts on startup only if goals collection is empty
import Goal from '../models/Goal.js';

const SEED = [
  { name: 'DSA Sheet Complete',    category: 'Technical', phase: 'Phase 1', targetDate: new Date('2026-09-15'), linkedTracker: 'dsa',          status: 'On Track', isLife: false },
  { name: 'Portfolio Live',        category: 'Career',    phase: 'Phase 1', targetDate: new Date('2026-05-31'), progress: 0, linkedTracker: null, status: 'On Track', isLife: false },
  { name: 'Internship Offer',      category: 'Career',    phase: 'Phase 1', targetDate: new Date('2026-12-31'), linkedTracker: 'internship',   status: 'On Track', isLife: false },
  { name: 'CommHub V1',            category: 'Technical', phase: 'Phase 1', targetDate: new Date('2026-12-15'), progress: 0, linkedTracker: null, status: 'On Track', isLife: false },
  { name: 'Health Dashboard V2',   category: 'Technical', phase: 'Phase 1', targetDate: new Date('2026-07-31'), progress: 0, linkedTracker: null, status: 'On Track', isLife: false },
  { name: '5DCT Formalization',    category: 'Life',      phase: 'Phase 1', targetDate: new Date('2026-12-31'), progress: 0, linkedTracker: null, status: 'On Track', isLife: true  },
  { name: 'EAGIS Documentation',   category: 'Life',      phase: 'Phase 1', targetDate: new Date('2026-12-31'), progress: 0, linkedTracker: null, status: 'On Track', isLife: true  },
];

export async function seedGoals() {
  const count = await Goal.countDocuments();
  if (count > 0) return;
  await Goal.insertMany(SEED);
  console.log(`Seeded ${SEED.length} goals.`);
}
