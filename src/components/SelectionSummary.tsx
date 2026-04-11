import { useMeridian } from '@/context/MeridianContext';
import { calculateComplexity } from '@/data/complexity';

const EQUIPMENT_ICONS: Record<string, string> = {
  DRUM: '🛢️',
  COLUMN: '🏗️',
  REACTOR: '⚛️',
  TANK: '🏭',
  SPHERE: '🔵',
};

export default function SelectionSummary() {
  const { state } = useMeridian();
  const { score, level, levelInfo, activatedFlags } = calculateComplexity(state.specialFlags);

  const levelColors: Record<number, string> = {
    1: 'text-complexity-critical',
    2: 'text-complexity-high',
    3: 'text-complexity-medium',
    4: 'text-complexity-low',
    5: 'text-complexity-routine',
  };

  const levelBgColors: Record<number, string> = {
    1: 'bg-complexity-critical/20 border-complexity-critical/50',
    2: 'bg-complexity-high/20 border-complexity-high/50',
    3: 'bg-complexity-medium/20 border-complexity-medium/50',
    4: 'bg-complexity-low/20 border-complexity-low/50',
    5: 'bg-complexity-routine/20 border-complexity-routine/50',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Selection Summary
      </h3>

      {!state.equipmentType ? (
        <p className="text-sm text-muted-foreground italic">No selections made yet</p>
      ) : (
        <div className="space-y-2">
          <SummaryRow label="Equipment" value={`${EQUIPMENT_ICONS[state.equipmentType] || ''} ${state.equipmentType}`} />
          {state.subType && <SummaryRow label="Sub-Type" value={state.subType} />}
          
          {Object.entries(state.selections).map(([key, value]) => {
            if (typeof value === 'boolean') {
              return value ? <SummaryRow key={key} label={formatLabel(key)} value="✓ Yes" /> : null;
            }
            return <SummaryRow key={key} label={formatLabel(key)} value={String(value)} />;
          })}

          {Object.entries(state.multiSelections).map(([key, values]) => (
            values.length > 0 && (
              <SummaryRow
                key={key}
                label={formatLabel(key)}
                value={values.map(v => formatLabel(v)).join(', ')}
              />
            )
          ))}

          {state.specialFlags.length > 0 && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Special Flags</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {state.specialFlags.map(flag => (
                  <span key={flag} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">
                    {formatLabel(flag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complexity Gauge */}
      {state.equipmentType && (
        <div className={`mt-4 p-4 rounded-lg border ${levelBgColors[level]}`}>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Complexity</div>
            <div className={`text-3xl font-bold ${levelColors[level]}`}>{score}</div>
            <div className={`text-sm font-semibold ${levelColors[level]}`}>
              LEVEL {level} — {levelInfo.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{levelInfo.description}</div>
          </div>

          {activatedFlags.length > 0 && (
            <div className="mt-3 space-y-1">
              {activatedFlags.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{f.label}</span>
                  <span className={`font-mono font-bold ${f.points > 0 ? 'text-complexity-high' : 'text-complexity-routine'}`}>
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SVG Arc Gauge */}
          <div className="flex justify-center mt-3">
            <svg width="120" height="70" viewBox="0 0 120 70">
              <path
                d="M 10 65 A 50 50 0 0 1 110 65"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 65 A 50 50 0 0 1 110 65"
                fill="none"
                stroke={`hsl(var(--${levelInfo.color.replace('complexity-', 'complexity-')}))`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(score / 12, 1) * 157} 157`}
                className="transition-all duration-500"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
