import { PlanJSON, PlanJSONSchema } from '@planforge/shared-types';

/** The instruction appended to every real-LLM prompt to force valid output. */
export const JSON_INSTRUCTION =
  'Respond with ONLY a single valid JSON object (no markdown, no code fences, no commentary) ' +
  'matching this exact shape and value rules:\n' +
  '{ executiveSummary: string, currentState:{summary:string,strengths:string[],weaknesses:string[]}, ' +
  'gapAnalysis:{summary:string,gaps:string[]}, strategy:{summary:string,pillars:string[]}, ' +
  'actionPlan:[{title:string,description:string,due:string,effortHours:number}], ' +
  'milestones:[{title:string,description:string,targetDate:string,order:number,status}], ' +
  'timeline:{startDate:string,endDate:string,phases:[{label:string,startWeek:number,endWeek:number,focus:string}]}, ' +
  'learningResources:[{title:string,type,url:string,note:string}], ' +
  'riskAssessment:[{risk:string,likelihood,impact,mitigation:string}], ' +
  'progressTracking:{metrics:[{name:string,unit:string,target:number}],cadence}, ' +
  'successProbability:{score:number,rationale:string}, recommendations:string[] }.\n' +
  'STRICT VALUE RULES — use these EXACT uppercase tokens:\n' +
  '- status: one of PENDING | IN_PROGRESS | COMPLETED | SKIPPED\n' +
  '- type: one of VIDEO | ARTICLE | COURSE | BOOK | TOOL\n' +
  '- likelihood and impact: one of LOW | MEDIUM | HIGH\n' +
  '- cadence: one of DAILY | WEEKLY | MONTHLY\n' +
  '- effortHours, order, startWeek, endWeek, target, score: PLAIN NUMBERS only (no units, no quotes). score is 0-100.';

/** Strip code fences / prose and parse the first JSON object found. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in model output');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Parse + validate model output against the canonical PlanJSON schema. */
export function parsePlan(text: string): PlanJSON {
  return PlanJSONSchema.parse(extractJson(text));
}

/** Retry an async fn up to `times`, with the last error rethrown. */
export async function withRetry<T>(fn: () => Promise<T>, times = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
