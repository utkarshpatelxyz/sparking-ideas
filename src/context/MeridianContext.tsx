import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MeridianState } from '@/data/types';

const initialState: MeridianState = {
  equipmentType: null,
  subType: null,
  selections: {},
  multiSelections: {},
  specialFlags: [],
  complexityScore: 0,
  complexityLevel: null,
  checklistItems: [],
  currentStep: 0,
  completedSteps: [],
  checklistGenerated: false,
  itemStatuses: {},
};

type Action =
  | { type: 'SET_EQUIPMENT'; payload: string }
  | { type: 'SET_SUBTYPE'; payload: string }
  | { type: 'SET_SELECTION'; payload: { key: string; value: string | boolean } }
  | { type: 'SET_MULTI_SELECTION'; payload: { key: string; values: string[] } }
  | { type: 'TOGGLE_MULTI_SELECTION'; payload: { key: string; value: string } }
  | { type: 'ADD_SPECIAL_FLAG'; payload: string }
  | { type: 'REMOVE_SPECIAL_FLAG'; payload: string }
  | { type: 'SET_SPECIAL_FLAGS'; payload: string[] }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'GENERATE_CHECKLIST'; payload: { items: any[]; score: number; level: number } }
  | { type: 'SET_ITEM_STATUS'; payload: { id: string; status: 'reviewed' | 'open' | 'na' } }
  | { type: 'RESET' }
  | { type: 'GO_BACK_TO_STEP'; payload: number };

function reducer(state: MeridianState, action: Action): MeridianState {
  switch (action.type) {
    case 'SET_EQUIPMENT':
      return { ...initialState, equipmentType: action.payload, currentStep: 1 };
    case 'SET_SUBTYPE':
      return { ...state, subType: action.payload, currentStep: 2, selections: {}, multiSelections: {}, specialFlags: [] };
    case 'SET_SELECTION':
      return { ...state, selections: { ...state.selections, [action.payload.key]: action.payload.value } };
    case 'SET_MULTI_SELECTION':
      return { ...state, multiSelections: { ...state.multiSelections, [action.payload.key]: action.payload.values } };
    case 'TOGGLE_MULTI_SELECTION': {
      const current = state.multiSelections[action.payload.key] || [];
      const exists = current.includes(action.payload.value);
      const newValues = exists ? current.filter(v => v !== action.payload.value) : [...current, action.payload.value];
      return { ...state, multiSelections: { ...state.multiSelections, [action.payload.key]: newValues } };
    }
    case 'SET_SPECIAL_FLAGS':
      return { ...state, specialFlags: action.payload };
    case 'ADD_SPECIAL_FLAG':
      return { ...state, specialFlags: [...new Set([...state.specialFlags, action.payload])] };
    case 'REMOVE_SPECIAL_FLAG':
      return { ...state, specialFlags: state.specialFlags.filter(f => f !== action.payload) };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'GENERATE_CHECKLIST':
      return {
        ...state,
        checklistItems: action.payload.items,
        complexityScore: action.payload.score,
        complexityLevel: action.payload.level,
        checklistGenerated: true,
      };
    case 'SET_ITEM_STATUS':
      return { ...state, itemStatuses: { ...state.itemStatuses, [action.payload.id]: action.payload.status } };
    case 'RESET':
      return initialState;
    case 'GO_BACK_TO_STEP': {
      return { ...state, currentStep: action.payload, checklistGenerated: false };
    }
    default:
      return state;
  }
}

const MeridianContext = createContext<{ state: MeridianState; dispatch: React.Dispatch<Action> } | null>(null);

export function MeridianProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <MeridianContext.Provider value={{ state, dispatch }}>{children}</MeridianContext.Provider>;
}

export function useMeridian() {
  const ctx = useContext(MeridianContext);
  if (!ctx) throw new Error('useMeridian must be used within MeridianProvider');
  return ctx;
}
