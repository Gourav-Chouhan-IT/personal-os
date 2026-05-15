// Seed DSA problems — runs on startup, inserts Striver A2Z sheet only if collection is empty
import DSAProblem from '../models/DSAProblem.js';
import striverSheet from '../data/striverSheet.js';

export async function seedDSA() {
  const count = await DSAProblem.countDocuments();
  if (count > 0) return;
  await DSAProblem.insertMany(striverSheet);
  console.log(`Seeded ${striverSheet.length} DSA problems.`);
}
