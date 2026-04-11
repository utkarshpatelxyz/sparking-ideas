import { ScoringRule, ComplexityLevel } from './types';

export const SCORING_RULES: ScoringRule[] = [
  { flag: "LETHAL_SERVICE", points: 3, label: "Lethal Service (H2S, HF, Cl2, etc.)" },
  { flag: "WET_H2S", points: 2, label: "Wet H2S Service (Sour)" },
  { flag: "H2_SERVICE", points: 2, label: "H2 Service (Hydrogen)" },
  { flag: "AMINE_SERVICE", points: 2, label: "Amine Service" },
  { flag: "REACTOR_CATALYST", points: 3, label: "Reactor with catalyst (multi-bed)" },
  { flag: "REFRACTORY_LINING", points: 2, label: "Reactor with refractory lining" },
  { flag: "H2_HOT_COLD_WALL", points: 2, label: "Reactor H2 + Hot/Cold Wall" },
  { flag: "SPECIAL_MATERIAL", points: 2, label: "Special material (CrMo, SS, Alloy, Clad)" },
  { flag: "LTCS", points: 2, label: "LTCS / MDMT < -10°C" },
  { flag: "FULL_VACUUM", points: 2, label: "Full Vacuum (FV)" },
  { flag: "COMPLEX_INTERNALS", points: 2, label: "Complex internals (trays, reactor)" },
  { flag: "MULTIPLE_CONDITIONS", points: 1, label: "Multiple design conditions (>2)" },
  { flag: "CYCLIC_SERVICE", points: 2, label: "Cyclic Service" },
  { flag: "SIMPLE_CS_TANK", points: -1, label: "Simple CS tank, low pressure (<10 bar)" },
];

export const COMPLEXITY_LEVELS: ComplexityLevel[] = [
  { level: 1, name: "CRITICAL", color: "complexity-critical", minScore: 8, maxScore: 999, description: "Reactor/Column CrMo+H2+Sour. All sections. Maximum depth." },
  { level: 2, name: "HIGH", color: "complexity-high", minScore: 5, maxScore: 7, description: "CS Column Wet H2S or standard CrMo. All sections except Lethal." },
  { level: 3, name: "MEDIUM", color: "complexity-medium", minScore: 3, maxScore: 4, description: "CS vessel with internals and multiple nozzles." },
  { level: 4, name: "LOW", color: "complexity-low", minScore: 1, maxScore: 2, description: "Standard CS vessel without complex internals." },
  { level: 5, name: "ROUTINE", color: "complexity-routine", minScore: -999, maxScore: 0, description: "Simple CS tank." },
];

export function calculateComplexity(specialFlags: string[]) {
  let score = 0;
  const activatedFlags: { label: string; points: number }[] = [];

  SCORING_RULES.forEach(rule => {
    if (specialFlags.includes(rule.flag)) {
      score += rule.points;
      activatedFlags.push({ label: rule.label, points: rule.points });
    }
  });

  const level = score >= 8 ? 1 : score >= 5 ? 2 : score >= 3 ? 3 : score >= 1 ? 4 : 5;
  const levelInfo = COMPLEXITY_LEVELS.find(l => l.level === level)!;

  return { score, level, levelInfo, activatedFlags };
}
