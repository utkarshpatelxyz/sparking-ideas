import { useMeridian } from '@/context/MeridianContext';

const EQUIPMENT_TYPES = [
  { id: 'DRUM', label: 'Drum', icon: '🛢️', description: 'Pressure vessels for separation' },
  { id: 'COLUMN', label: 'Column', icon: '🏗️', description: 'Distillation & absorption columns' },
  { id: 'REACTOR', label: 'Reactor', icon: '⚛️', description: 'Chemical reactors with internals' },
  { id: 'TANK', label: 'Tank', icon: '🏭', description: 'Storage tanks (API 650/620/625)' },
  { id: 'SPHERE', label: 'Sphere', icon: '🔵', description: 'Coming Soon', comingSoon: true },
];

const DRUM_SUBTYPES = [
  { id: 'VERTICAL', label: 'Vertical', icon: '↕️' },
  { id: 'HORIZONTAL', label: 'Horizontal', icon: '↔️' },
];

const TANK_SUBTYPES = [
  { id: 'API_650', label: 'API 650', description: 'Atmospheric storage tanks' },
  { id: 'API_620', label: 'API 620', description: 'Low-pressure storage tanks' },
  { id: 'API_625', label: 'API 625 / Cryogenic', description: 'LNG / Cryogenic tanks' },
];

export default function EquipmentSelector() {
  const { state, dispatch } = useMeridian();

  if (!state.equipmentType) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground mb-2">Select Your Equipment</h2>
        <p className="text-muted-foreground mb-6">Choose the equipment type to begin your review</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {EQUIPMENT_TYPES.map(eq => (
            <button
              key={eq.id}
              disabled={eq.comingSoon}
              onClick={() => dispatch({ type: 'SET_EQUIPMENT', payload: eq.id })}
              className={`group relative p-6 rounded-lg border-2 text-left transition-all duration-200
                ${eq.comingSoon
                  ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                  : 'border-border bg-card hover:border-primary hover:glow-cyan-sm cursor-pointer'
                }`}
            >
              <div className="text-4xl mb-3">{eq.icon}</div>
              <div className="font-semibold text-foreground text-lg">{eq.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{eq.description}</div>
              {eq.comingSoon && (
                <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show subtype selection for DRUM
  if (state.equipmentType === 'DRUM' && !state.subType) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground mb-2">Drum Orientation</h2>
        <p className="text-muted-foreground mb-6">Select the drum orientation</p>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {DRUM_SUBTYPES.map(sub => (
            <button
              key={sub.id}
              onClick={() => dispatch({ type: 'SET_SUBTYPE', payload: sub.id })}
              className="p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:glow-cyan-sm transition-all text-left cursor-pointer"
            >
              <div className="text-4xl mb-3">{sub.icon}</div>
              <div className="font-semibold text-foreground text-lg">{sub.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show subtype selection for TANK
  if (state.equipmentType === 'TANK' && !state.subType) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground mb-2">Tank Standard</h2>
        <p className="text-muted-foreground mb-6">Select the applicable API standard</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TANK_SUBTYPES.map(sub => (
            <button
              key={sub.id}
              onClick={() => dispatch({ type: 'SET_SUBTYPE', payload: sub.id })}
              className="p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:glow-cyan-sm transition-all text-left cursor-pointer"
            >
              <div className="font-semibold text-foreground text-lg">{sub.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{sub.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
