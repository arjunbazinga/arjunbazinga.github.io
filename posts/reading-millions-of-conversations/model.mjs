// Hand-authored teaching fixtures. These functions run no inference or clustering.
export const facets = {
  task: {
    question: 'What kind of help is being requested?',
    labels: ['Repair software', 'Revise writing', 'Explain a concept', 'Plan an activity'],
    note: 'A useful view of demand. It says what people asked for; it cannot tell us whether the help worked.'
  },
  friction: {
    question: 'What obstacle is explicitly visible in this exchange?',
    labels: ['Missing context', 'Unsuccessful iteration', 'No stated obstacle'],
    note: 'Five exchanges expose an obstacle. “No stated obstacle” means none is visible here, not that the work was effortless.'
  },
  outcome: {
    question: 'What outcome does the user explicitly report?',
    labels: ['Reported success', 'Reported failure', 'Not observable'],
    note: 'Three reported successes, two reported failures, seven unknowns. An answer appearing in the transcript is not evidence that the task succeeded.'
  }
};

export function groupCases(cases, facet) {
  if (!Object.hasOwn(facets, facet)) throw new Error('Unknown facet');
  return facets[facet].labels.map(label => ({label, cases: cases.filter(item => item[facet] === label)}));
}

export function outcomeCounts(cases) {
  const successes = cases.filter(item => item.outcome === 'Reported success').length;
  const failures = cases.filter(item => item.outcome === 'Reported failure').length;
  return {successes, failures, unknown: cases.length - successes - failures, total: cases.length};
}

// Invented, independent groups; account counts must not be summed across groups.
export const releaseGroups = [
  {id:'debug', label:'Repair software', conversations:1800, accounts:640, description:'Troubleshoot application errors and check proposed repairs.', identifiable:false},
  {id:'writing', label:'Revise writing', conversations:1200, accounts:420, description:'Edit drafts for clarity, tone and length.', identifiable:false},
  {id:'study', label:'Explain coursework', conversations:700, accounts:80, description:'Work through concepts and practice exercises.', identifiable:false},
  {id:'interview', label:'Prepare for interviews', conversations:480, accounts:310, description:'Practice interview answers and ask for feedback.', identifiable:false},
  {id:'repeat', label:'Repeat a template', conversations:90, accounts:2, description:'Generate many variations of a short template.', identifiable:false},
  {id:'specific', label:'Plan a business change', conversations:600, accounts:300, description:'Plan the unannounced acquisition of a named company.', identifiable:true}
];

// Historical count floors from the September 2025 report, not universal policy.
export const floors = {
  counts: {conversations:15, accounts:5},
  descriptions: {conversations:500, accounts:250}
};

export function gate(group, mode, multiplier = 1) {
  if (!Object.hasOwn(floors, mode)) throw new Error('Unknown release mode');
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 10) throw new Error('Invalid multiplier');
  const floor = floors[mode];
  const conversations = group.conversations * multiplier;
  const reasons = [];
  if (conversations < floor.conversations) reasons.push(`Fewer than ${floor.conversations} conversations`);
  if (group.accounts < floor.accounts) reasons.push(`Fewer than ${floor.accounts} accounts`);
  if (mode === 'descriptions' && group.identifiable) reasons.push('Description reveals an organization’s private activity');
  return {...group, conversations, reasons, released: reasons.length === 0};
}
