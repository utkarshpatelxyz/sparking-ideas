import { MeridianProvider, useMeridian } from '@/context/MeridianContext';
import SelectionSummary from '@/components/SelectionSummary';
import EquipmentSelector from '@/components/EquipmentSelector';
import StepNavigator from '@/components/StepNavigator';
import ChecklistView from '@/components/ChecklistView';

function MeridianApp() {
  const { state, dispatch } = useMeridian();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-5">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            
            {/* LOGO REPLACED HERE */}
            <div className="flex items-center gap-3">
              <img 
                src="/MERIDIAN_LOGO.png" 
                alt="MERIDIAN" 
                className="h-28 w-auto"
              />
              <div>
                <div className="h-0.5 w-full bg-primary/50 rounded-full mt-0.5" />
              </div>
            </div>

            <span className="text-sm text-muted-foreground hidden sm:inline">
              Static Equipment Review Tool
            </span>
          </div>

          {state.equipmentType && (
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              🔄 New Review
            </button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        {/* Left Panel - Summary */}
        <aside className="w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r border-border p-5 bg-surface overflow-y-auto lg:min-h-[calc(100vh-73px)] lg:max-h-[calc(100vh-73px)] lg:sticky lg:top-0 scrollbar-thin">
          <SelectionSummary />
        </aside>

        {/* Right Panel - Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto lg:max-h-[calc(100vh-73px)] scrollbar-thin">
          <EquipmentSelector />
          <StepNavigator />
          <ChecklistView />
        </main>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <MeridianProvider>
      <MeridianApp />
    </MeridianProvider>
  );
}
