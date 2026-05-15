// rescheduleCheck — scans overdue tasks and returns per-timeHorizon suggestions
import Task from '../models/Task.js';

function nextMonday() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
  d.setHours(23, 59, 0, 0);
  return d;
}

function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 0, 0);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 0, 0);
  return d;
}

export async function rescheduleCheck() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = await Task.find({
    dueDate: { $lt: today },
    status:  { $ne: 'Done' },
  }).lean();

  const suggestions = [];
  const atRisk = [];

  for (const task of overdueTasks) {
    if (task.timeHorizon === 'Milestone') {
      atRisk.push({ taskId: task._id, title: task.title, currentDue: task.dueDate });
      continue;
    }

    const suggestedDue =
      task.timeHorizon === 'Daily'  ? tomorrow()    :
      task.timeHorizon === 'Weekly' ? nextMonday()  :
      task.timeHorizon === 'Phase'  ? endOfMonth()  :
      tomorrow();

    suggestions.push({
      taskId:      task._id,
      title:       task.title,
      currentDue:  task.dueDate,
      suggestedDue,
      timeHorizon: task.timeHorizon,
    });
  }

  return { suggestions, atRisk };
}
