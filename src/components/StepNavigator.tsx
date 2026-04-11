import { useState } from 'react';
import { useMeridian } from '@/context/MeridianContext';
import { getStepsForEquipment, StepConfig } from '@/data/equipmentHierarchy';
import { generateChecklist } from '@/data/checklistEngine';
import { calculateComplexity } from '@/data/complexity';

export default function StepNavigator() {
  const { state, dispatch } = useMeridian();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!state.equipmentType) return null;
  // For DRUM and TANK, need subtype
  if ((state.equipmentType === 'DRUM' || state.equipmentType === 'TANK') && !state.subType) return null;
  if (state.checklistGenerated) return null;

  // For COLUMN and REACTOR, no subtype needed so set a default
  const subType = state.subType || undefined;
  const steps = getStepsForEquipment(state.equipmentType, subType);

  if (steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) return;
    setCurrentStepIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStepIndex === 0) return;
    setCurrentStepIndex(prev => prev - 1);
  };

  const handleGenerateChecklist = () => {
    // Collect complexity flags from selections
    const flags = [...state.specialFlags];
    
    // Check material selection for complexity flags
    steps.forEach(step => {
      if (step.type === 'single' && step.options) {
        const selectedValue = state.selections[step.id];
        if (typeof selectedValue === 'string') {
          const option = step.options.find(o => o.id === selectedValue);
          if (option?.complexityFlag && !flags.includes(option.complexityFlag)) {
            flags.push(option.complexityFlag);
          }
        }
      }
      // Check multi-select options for complexity flags
      if (step.type === 'multi' && step.options) {
        const selectedValues = state.multiSelections[step.id] || [];
        step.options.forEach(opt => {
          if (selectedValues.includes(opt.id) && opt.complexityFlag && !flags.includes(opt.complexityFlag)) {
            flags.push(opt.complexityFlag);
          }
        });
      }
    });

    // Auto-detect complexity flags from selections
    if (state.equipmentType === 'REACTOR') {
      if (state.selections.catalyst_bed === true) flags.push('REACTOR_CATALYST');
      if (state.selections.refractory_lining === true) flags.push('REFRACTORY_LINING');
      if (state.selections.hot_cold_wall === true) flags.push('H2_HOT_COLD_WALL');
    }
    if (state.equipmentType === 'COLUMN') {
      const internals = state.multiSelections.internals || [];
      if (internals.includes('TRAYS') || internals.includes('PACKING')) {
        if (!flags.includes('COMPLEX_INTERNALS')) flags.push('COMPLEX_INTERNALS');
      }
    }

    // Update flags
    dispatch({ type: 'SET_SPECIAL_FLAGS', payload: [...new Set(flags)] });

    // Generate
    const updatedState = { ...state, specialFlags: [...new Set(flags)] };
    const items = generateChecklist(updatedState);
    const { score, level } = calculateComplexity([...new Set(flags)]);

    dispatch({
      type: 'GENERATE_CHECKLIST',
      payload: { items, score, level },
    });
  };

  const canGenerate = steps.filter(s => s.required).every(s => {
    if (s.type === 'single') return !!state.selections[s.id];
    if (s.type === 'multi' && s.required) return (state.multiSelections[s.id]?.length || 0) > 0;
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground flex-wrap">
        <button onClick={() => dispatch({ type: 'RESET' })} className="hover:text-primary transition-colors cursor-pointer">HOME</button>
        <span>›</span>
        <span className="text-primary">{state.equipmentType}</span>
        {state.subType && (
          <>
            <span>›</span>
            <span className="text-primary">{state.subType}</span>
          </>
        )}
        {currentStepIndex > 0 && steps.slice(0, currentStepIndex).map((s, i) => (
          <span key={i} className="flex items-center gap-2">
            <span>›</span>
            <button onClick={() => setCurrentStepIndex(i)} className="hover:text-primary transition-colors cursor-pointer">
              {s.label}
            </button>
          </span>
        ))}
        <span>›</span>
        <span className="text-foreground font-medium">▶ {currentStep?.label}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full mb-6">
        <div
          className="h-1 bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">
        Step {currentStepIndex + 1} of {steps.length}: {currentStep?.label}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {currentStep?.type === 'yesno' ? 'Toggle yes/no, then select applicable options' :
         currentStep?.type === 'multi' ? 'Select all that apply' :
         'Select one option'}
      </p>

      {currentStep && <StepContent step={currentStep} />}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          ← Previous
        </button>

        <div className="flex gap-3">
          {!isLastStep && (
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all cursor-pointer"
            >
              Next →
            </button>
          )}
          
          <button
            onClick={handleGenerateChecklist}
            disabled={!canGenerate}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer
              ${canGenerate
                ? 'bg-primary text-primary-foreground glow-cyan hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
          >
            ⚡ Generate Checklist
          </button>
        </div>
      </div>
    </div>
  );
}

function StepContent({ step }: { step: StepConfig }) {
  const { state, dispatch } = useMeridian();

  if (step.type === 'yesno') {
    const isYes = state.selections[step.id] === true;
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <button
            onClick={() => {
              dispatch({ type: 'SET_SELECTION', payload: { key: step.id, value: true } });
            }}
            className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all cursor-pointer
              ${isYes ? 'border-primary bg-primary/10 text-primary glow-cyan-sm' : 'border-border bg-card text-foreground hover:border-primary/50'}`}
          >
            Yes
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'SET_SELECTION', payload: { key: step.id, value: false } });
              dispatch({ type: 'SET_MULTI_SELECTION', payload: { key: step.id, values: [] } });
            }}
            className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all cursor-pointer
              ${state.selections[step.id] === false ? 'border-primary bg-primary/10 text-primary glow-cyan-sm' : 'border-border bg-card text-foreground hover:border-primary/50'}`}
          >
            No
          </button>
        </div>

        {isYes && step.options && step.options.length > 0 && (
          <div className="pl-4 border-l-2 border-primary/30 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-2">Select applicable sub-options:</p>
            <div className="flex flex-wrap gap-2">
              {step.options.map(opt => {
                const selected = (state.multiSelections[step.id] || []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      dispatch({ type: 'TOGGLE_MULTI_SELECTION', payload: { key: step.id, value: opt.id } });
                      if (opt.complexityFlag) {
                        if (!selected) {
                          dispatch({ type: 'ADD_SPECIAL_FLAG', payload: opt.complexityFlag });
                        } else {
                          dispatch({ type: 'REMOVE_SPECIAL_FLAG', payload: opt.complexityFlag });
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-full border text-sm transition-all cursor-pointer
                      ${selected
                        ? 'border-primary bg-primary/15 text-primary font-medium'
                        : 'border-border bg-card text-foreground hover:border-primary/50'
                      }`}
                  >
                    {selected ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step.type === 'single') {
    const selected = state.selections[step.id];
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {step.options?.map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              // Remove old flag if any
              const oldOpt = step.options?.find(o => o.id === selected);
              if (oldOpt?.complexityFlag) {
                dispatch({ type: 'REMOVE_SPECIAL_FLAG', payload: oldOpt.complexityFlag });
              }
              dispatch({ type: 'SET_SELECTION', payload: { key: step.id, value: opt.id } });
              if (opt.complexityFlag) {
                dispatch({ type: 'ADD_SPECIAL_FLAG', payload: opt.complexityFlag });
              }
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer
              ${selected === opt.id
                ? 'border-primary bg-primary/10 text-primary glow-cyan-sm'
                : 'border-border bg-card text-foreground hover:border-primary/50'
              }`}
          >
            <div className="font-medium text-sm">{opt.label}</div>
          </button>
        ))}
      </div>
    );
  }

  if (step.type === 'multi') {
    const selectedValues = state.multiSelections[step.id] || [];
    return (
      <div className="flex flex-wrap gap-2">
        {step.options?.map(opt => {
          const selected = selectedValues.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => {
                dispatch({ type: 'TOGGLE_MULTI_SELECTION', payload: { key: step.id, value: opt.id } });
                if (opt.complexityFlag) {
                  if (!selected) {
                    dispatch({ type: 'ADD_SPECIAL_FLAG', payload: opt.complexityFlag });
                  } else {
                    dispatch({ type: 'REMOVE_SPECIAL_FLAG', payload: opt.complexityFlag });
                  }
                }
              }}
              className={`px-4 py-3 rounded-lg border-2 text-sm transition-all cursor-pointer
                ${selected
                  ? 'border-primary bg-primary/10 text-primary font-medium glow-cyan-sm'
                  : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
            >
              {selected ? '✓ ' : ''}{opt.label}
              {opt.complexityPoints && (
                <span className="ml-1 text-xs opacity-60">({opt.complexityPoints > 0 ? '+' : ''}{opt.complexityPoints} pts)</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
