import { useState, useMemo } from 'react';
import { useMeridian } from '@/context/MeridianContext';
import { calculateComplexity } from '@/data/complexity';

const PRIORITY_MAP: Record<number, { label: string; color: string; icon: string }> = {
  5: { label: 'CRITICAL', color: 'text-complexity-critical', icon: '🔴' },
  4: { label: 'HIGH', color: 'text-complexity-high', icon: '🟠' },
  3: { label: 'MEDIUM', color: 'text-complexity-medium', icon: '🟡' },
  2: { label: 'LOW', color: 'text-complexity-low', icon: '🔵' },
  1: { label: 'INFO', color: 'text-muted-foreground', icon: '⚪' },
};

export default function ChecklistView() {
  const { state, dispatch } = useMeridian();
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { score, level, levelInfo, activatedFlags } = calculateComplexity(state.specialFlags);

  const sections = useMemo(() => {
    const s = new Set(state.checklistItems.map(i => i.section));
    return ['ALL', ...Array.from(s).sort()];
  }, [state.checklistItems]);

  const disciplines = useMemo(() => {
    const d = new Set(state.checklistItems.map(i => i.discipline));
    return ['ALL', ...Array.from(d).sort()];
  }, [state.checklistItems]);

  const filteredItems = useMemo(() => {
    return state.checklistItems.filter(item => {
      if (sectionFilter !== 'ALL' && item.section !== sectionFilter) return false;
      if (priorityFilter !== 'ALL' && String(item.weight) !== priorityFilter) return false;
      if (disciplineFilter !== 'ALL' && item.discipline !== disciplineFilter) return false;
      if (searchQuery && !item.verificationItem.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [state.checklistItems, sectionFilter, priorityFilter, disciplineFilter, searchQuery]);

  const reviewedCount = Object.values(state.itemStatuses).filter(s => s === 'reviewed').length;
  const totalItems = state.checklistItems.length;

  const levelColors: Record<number, string> = {
    1: 'bg-complexity-critical/20 border-complexity-critical text-complexity-critical',
    2: 'bg-complexity-high/20 border-complexity-high text-complexity-high',
    3: 'bg-complexity-medium/20 border-complexity-medium text-complexity-medium',
    4: 'bg-complexity-low/20 border-complexity-low text-complexity-low',
    5: 'bg-complexity-routine/20 border-complexity-routine text-complexity-routine',
  };

  const handleCopyToClipboard = () => {
    const text = filteredItems.map(item => {
      const status = state.itemStatuses[item.id] || 'open';
      return `[${status.toUpperCase()}] ${item.id} | ${item.section} | ${item.verificationItem} | ${item.codeReference} | Wt:${item.weight} | ${item.discipline}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportCSV = () => {
    const headers = ['Status', 'ID', 'Section', 'Sub-Section', 'Condition', 'Verification Item', 'Code Reference', 'Weight', 'Priority', 'Discipline', 'Notes'];
    const rows = filteredItems.map(item => {
      const status = state.itemStatuses[item.id] || 'OPEN';
      const priority = PRIORITY_MAP[item.weight]?.label || '';
      return [status.toUpperCase(), item.id, item.section, item.subSection, item.condition, `"${item.verificationItem}"`, `"${item.codeReference}"`, item.weight, priority, item.discipline, `"${item.notes}"`];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MERIDIAN_Checklist_${state.equipmentType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!state.checklistGenerated) return null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Complexity Summary Block */}
      <div className={`p-6 rounded-xl border-2 ${levelColors[level]}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider opacity-80">Complexity Level</div>
            <div className="text-3xl font-bold mt-1">LEVEL {level} — {levelInfo.name}</div>
            <div className="text-sm opacity-80 mt-1">{levelInfo.description}</div>
          </div>
          <div className="text-right">
            <div className="text-sm uppercase tracking-wider opacity-80">Score</div>
            <div className="text-4xl font-bold font-mono">{score}</div>
            <div className="text-xs opacity-60">points</div>
          </div>
        </div>

        {activatedFlags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-current/20">
            <div className="text-xs uppercase tracking-wider opacity-60 mb-2">Activated Flags</div>
            <div className="flex flex-wrap gap-2">
              {activatedFlags.map((f, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-background/30 font-mono">
                  {f.label} ({f.points > 0 ? '+' : ''}{f.points})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-current/20 flex flex-wrap gap-4 text-sm">
          <span>Equipment: <strong>{state.equipmentType}{state.subType ? ` > ${state.subType}` : ''}</strong></span>
          <span>Total Items: <strong>{totalItems}</strong></span>
          <span>Reviewed: <strong>{reviewedCount} / {totalItems}</strong></span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { dispatch({ type: 'RESET' }); }} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
          🔄 Start New Review
        </button>
        <button onClick={() => dispatch({ type: 'GO_BACK_TO_STEP', payload: 2 })} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
          ← Back to Selections
        </button>
        <div className="flex-1" />
        <button onClick={handleCopyToClipboard} className="px-4 py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors cursor-pointer">
          📋 Copy to Clipboard
        </button>
        <button onClick={handleExportCSV} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-colors cursor-pointer">
          📄 Export to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-lg border border-border">
        <select
          value={sectionFilter}
          onChange={e => setSectionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm border border-border"
        >
          {sections.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sections' : s}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm border border-border"
        >
          <option value="ALL">All Priorities</option>
          <option value="5">🔴 Critical (5)</option>
          <option value="4">🟠 High (4)</option>
          <option value="3">🟡 Medium (3)</option>
          <option value="2">🔵 Low (2)</option>
          <option value="1">⚪ Info (1)</option>
        </select>
        <select
          value={disciplineFilter}
          onChange={e => setDisciplineFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm border border-border"
        >
          {disciplines.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Disciplines' : d}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search verification items..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md bg-muted text-foreground text-sm border border-border placeholder:text-muted-foreground"
        />
        <span className="text-sm text-muted-foreground self-center">{filteredItems.length} items</span>
      </div>

      {/* Checklist Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground font-mono">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Section</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[300px]">Verification Item</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground font-mono">Code Reference</th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Priority</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Discipline</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const status = state.itemStatuses[item.id] || 'open';
              const priority = PRIORITY_MAP[item.weight];
              return (
                <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <select
                      value={status}
                      onChange={e => dispatch({ type: 'SET_ITEM_STATUS', payload: { id: item.id, status: e.target.value as any } })}
                      className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer
                        ${status === 'reviewed' ? 'bg-complexity-routine/20 text-complexity-routine' : 
                          status === 'na' ? 'bg-muted text-muted-foreground' : 
                          'bg-complexity-high/20 text-complexity-high'}`}
                    >
                      <option value="open">⚠️ OPEN</option>
                      <option value="reviewed">✅ REVIEWED</option>
                      <option value="na">➖ N/A</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-primary">{item.id}</td>
                  <td className="px-3 py-2 text-xs">{item.section}</td>
                  <td className="px-3 py-2 text-foreground">{item.verificationItem}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.codeReference}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-semibold ${priority?.color}`}>
                      {priority?.icon} {priority?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{item.discipline}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={item.notes}>{item.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
