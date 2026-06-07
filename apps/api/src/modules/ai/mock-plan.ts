import type { PlanJSON, PlannerInput } from '@planforge/shared-types';

/**
 * A realistic, fully-populated 12-section plan used by the MockProvider and
 * as a safe fallback. Lets the entire UI be built and tested with zero API
 * calls and zero cost (Option C in the plan).
 */
export function buildMockPlan(input: PlannerInput): PlanJSON {
  const goal = input.goal || 'Achieve the stated objective';
  return {
    executiveSummary: `A structured 12-week plan to: ${goal}. It sequences quick wins first, then compounding work, with weekly checkpoints and clear success metrics.`,
    currentState: {
      summary: 'You have a clear objective and a workable amount of time and resources to commit.',
      strengths: ['Motivated and committed', 'Defined target', 'Time available each week'],
      weaknesses: ['No structured roadmap yet', 'Progress not currently measured'],
    },
    gapAnalysis: {
      summary: 'The main gap is the absence of a sequenced, measurable plan with accountability.',
      gaps: ['No milestone breakdown', 'No tracking cadence', 'Key risks unaddressed'],
    },
    strategy: {
      summary: 'Break the goal into weekly milestones, track a few leading metrics, and review weekly.',
      pillars: ['Consistency over intensity', 'Measure leading indicators', 'Weekly review and adjust'],
    },
    actionPlan: [
      { title: 'Define the finish line', description: 'Write a one-sentence definition of done.', due: 'Week 1', effortHours: 1 },
      { title: 'Set up tracking', description: 'Pick 3 metrics and log them weekly.', due: 'Week 1', effortHours: 2 },
      { title: 'Execute milestone 1', description: 'Complete the first milestone deliverable.', due: 'Week 3', effortHours: 10 },
    ],
    milestones: [
      { title: 'Foundations set', description: 'Definition of done + tracking in place.', order: 0, status: 'PENDING', targetDate: undefined },
      { title: 'First deliverable', description: 'Ship the first concrete result.', order: 1, status: 'PENDING', targetDate: undefined },
      { title: 'Halfway review', description: 'Assess progress and adjust the plan.', order: 2, status: 'PENDING', targetDate: undefined },
      { title: 'Goal achieved', description: 'Definition of done is met.', order: 3, status: 'PENDING', targetDate: undefined },
    ],
    timeline: {
      phases: [
        { label: 'Setup', startWeek: 1, endWeek: 1, focus: 'Define and instrument' },
        { label: 'Build', startWeek: 2, endWeek: 8, focus: 'Execute core milestones' },
        { label: 'Refine', startWeek: 9, endWeek: 12, focus: 'Optimise and finish' },
      ],
    },
    learningResources: [
      { title: 'Atomic habits overview', type: 'ARTICLE', note: 'Habit-building fundamentals.' },
      { title: 'Goal-setting masterclass', type: 'VIDEO', note: 'Practical framework.' },
    ],
    riskAssessment: [
      { risk: 'Loss of motivation', likelihood: 'MEDIUM', impact: 'HIGH', mitigation: 'Weekly review + visible streak tracking.' },
      { risk: 'Scope creep', likelihood: 'MEDIUM', impact: 'MEDIUM', mitigation: 'Lock the definition of done in week 1.' },
    ],
    progressTracking: {
      metrics: [
        { name: 'Milestones completed', unit: 'count', target: 4 },
        { name: 'Weekly hours invested', unit: 'hours', target: 8 },
      ],
      cadence: 'WEEKLY',
    },
    successProbability: {
      score: 78,
      rationale: 'High commitment and a clear plan; main risk is consistency over the full duration.',
    },
    recommendations: [
      'Start with the smallest first milestone to build momentum.',
      'Review progress every Sunday and adjust next week.',
      'Tell one person your goal for accountability.',
    ],
  };
}
