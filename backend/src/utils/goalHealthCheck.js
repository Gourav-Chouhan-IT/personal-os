// Goal health check — auto-updates progress (for linked trackers) and status on every fetch
import Goal from '../models/Goal.js';
import DSAProblem from '../models/DSAProblem.js';
import Internship from '../models/Internship.js';

const DSA_TOTAL = 308; // matches striverSheet seed count

export async function goalHealthCheck() {
  const goals = await Goal.find().sort({ createdAt: 1 }).lean();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Fetch tracker data in one shot
  const [dsaSolved, offerCount] = await Promise.all([
    DSAProblem.countDocuments({ status: 'Solved' }),
    Internship.countDocuments({ status: 'Offer' }),
  ]);

  const bulkOps = [];

  const enriched = goals.map(goal => {
    if (goal.status === 'Complete') return goal;

    let { progress, status } = goal;

    // Auto-progress from linked tracker
    if (goal.linkedTracker === 'dsa') {
      progress = Math.min(100, Math.round((dsaSolved / DSA_TOTAL) * 100));
    } else if (goal.linkedTracker === 'internship') {
      progress = offerCount > 0 ? 100 : 0;
    }

    // Health status
    if (goal.targetDate) {
      const target  = new Date(goal.targetDate); target.setHours(0, 0, 0, 0);
      const created = new Date(goal.createdAt);  created.setHours(0, 0, 0, 0);

      if (target < today) {
        status = 'Delayed';
      } else {
        const totalDays   = Math.max(1, (target - created) / 86400000);
        const daysElapsed = Math.max(0, (today  - created) / 86400000);
        const timeUsedPct = (daysElapsed / totalDays) * 100;
        // At Risk: more time used than progress allows (with 15% buffer)
        status = timeUsedPct > progress + 15 ? 'At Risk' : 'On Track';
      }
    }

    if (progress !== goal.progress || status !== goal.status) {
      bulkOps.push({
        updateOne: { filter: { _id: goal._id }, update: { $set: { progress, status } } },
      });
    }

    return { ...goal, progress, status };
  });

  if (bulkOps.length > 0) await Goal.bulkWrite(bulkOps);

  return enriched;
}
