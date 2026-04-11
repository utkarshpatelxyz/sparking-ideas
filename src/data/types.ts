export interface MeridianState {
  equipmentType: string | null;
  subType: string | null;
  selections: Record<string, string | boolean>;
  multiSelections: Record<string, string[]>;
  specialFlags: string[];
  complexityScore: number;
  complexityLevel: number | null;
  checklistItems: VerificationItem[];
  currentStep: number;
  completedSteps: number[];
  checklistGenerated: boolean;
  itemStatuses: Record<string, 'reviewed' | 'open' | 'na'>;
}

export interface VerificationItem {
  id: string;
  section: string;
  subSection: string;
  condition: string;
  conditionFlags: string[];
  verificationItem: string;
  codeReference: string;
  weight: number;
  discipline: string;
  notes: string;
}

export interface HierarchyNode {
  id: string;
  label: string;
  type: 'single' | 'multi' | 'yesno' | 'info';
  children?: HierarchyNode[];
  subOptions?: HierarchyNode[];
  complexityPoints?: number;
  complexityFlag?: string;
  comingSoon?: boolean;
}

export interface ScoringRule {
  flag: string;
  points: number;
  label: string;
}

export type ComplexityLevel = {
  level: number;
  name: string;
  color: string;
  minScore: number;
  maxScore: number;
  description: string;
};
