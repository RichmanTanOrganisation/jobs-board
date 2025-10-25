// carl+ben task: fsae specialisations for filtering
export const Specs = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'COMPOSITES', label: 'Composites' },
  { value: 'MECHANICAL', label: 'Mechanical' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'AUTONOMOUS', label: 'Autonomous' },
  { value: 'RACE_TEAM', label: 'Race Team' },
];

export type SpecValue = (typeof Specs)[number]['value'];
