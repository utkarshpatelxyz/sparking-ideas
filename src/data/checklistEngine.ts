import { MeridianState, VerificationItem } from './types';
import { VERIFICATION_ITEMS } from './verificationItems';

export function generateChecklist(state: MeridianState): VerificationItem[] {
  const activeFlags = collectActiveFlags(state);
  
  return VERIFICATION_ITEMS.filter(item => {
    if (item.condition === 'ALWAYS') return true;
    if (item.condition === 'IF' && item.conditionFlags.length > 0) {
      return item.conditionFlags.some(flag => activeFlags.has(flag));
    }
    return false;
  });
}

function collectActiveFlags(state: MeridianState): Set<string> {
  const flags = new Set<string>(state.specialFlags);
  
  // Equipment type flags
  if (state.equipmentType === 'REACTOR') {
    if (state.selections.catalyst_bed === true || state.multiSelections.catalyst_bed?.length > 0) {
      flags.add('REACTOR_CATALYST');
    }
    if (state.selections.refractory_lining === true || state.multiSelections.refractory_lining?.length > 0) {
      flags.add('REFRACTORY_LINING');
    }
    if (state.selections.hot_cold_wall === true) {
      flags.add('REACTOR_H2_HOT_COLD');
      flags.add('H2_HOT_COLD_WALL');
    }
    if (state.selections.mist_eliminator === true) flags.add('REACTOR_MIST_ELIMINATOR');
    if (state.selections.vortex_breaker === true) flags.add('REACTOR_VORTEX_BREAKER');
    if (state.selections.internal_coil === true) flags.add('REACTOR_INTERNAL_COIL');
    if (state.selections.internal_heads === true) flags.add('REACTOR_INTERNAL_HEADS');
    if (state.selections.radial_flow === true) flags.add('REACTOR_RADIAL_FLOW');
    if (state.multiSelections.catalyst_bed?.includes('DISTRIBUTOR_TRAY')) flags.add('REACTOR_DISTRIBUTOR');
    if (state.multiSelections.catalyst_bed?.includes('QUENCH_MIXER')) flags.add('REACTOR_QUENCH');
    if (state.multiSelections.catalyst_bed?.includes('OUTLET_COLLECTOR')) flags.add('REACTOR_OUTLET_COLLECTOR');
    if (state.multiSelections.catalyst_bed?.includes('INLET_DIFFUSER')) flags.add('REACTOR_INLET_DIFFUSER');
    if (state.multiSelections.catalyst_bed?.includes('REDISTRIBUTION_TRAY')) flags.add('REACTOR_REDISTRIBUTION');
    
    const designCode = state.selections.design_code;
    if (designCode === 'ASME_DIV2' || designCode === 'ASME_DIV3') {
      flags.add('REACTOR_DIV2_DIV3');
    }
  }

  // Subtype & support flags
  if (state.subType === 'VERTICAL' && state.selections.support_type === 'SKIRT') {
    flags.add('VERTICAL_SKIRT');
  }
  if (state.subType === 'HORIZONTAL' && state.selections.support_type === 'SADDLES') {
    flags.add('HORIZONTAL_SADDLES');
  }
  
  // Column internals
  if (state.equipmentType === 'COLUMN' && (state.selections.internals === true || state.multiSelections.internals?.length > 0)) {
    flags.add('COLUMN_INTERNALS');
    if (state.multiSelections.internals?.includes('TRAYS')) flags.add('COLUMN_TRAYS');
    if (state.multiSelections.internals?.includes('PACKING')) flags.add('COLUMN_PACKING');
    if (state.multiSelections.internals?.includes('MIST_ELIMINATOR')) flags.add('MIST_ELIMINATOR');
    if (state.multiSelections.internals?.includes('VORTEX_BREAKER')) flags.add('VORTEX_BREAKER');
    if (state.multiSelections.internals?.includes('LIQUID_DISTRIBUTOR')) flags.add('LIQUID_DISTRIBUTOR');
    if (state.multiSelections.internals?.includes('VAPOUR_DISTRIBUTOR')) flags.add('VAPOR_DISTRIBUTOR');
    if (state.multiSelections.internals?.includes('FEED_INLET')) flags.add('FEED_INLET');
    if (state.multiSelections.internals?.includes('LIQUID_COLLECTOR')) flags.add('LIQUID_COLLECTOR');
  }
  
  // Has internals
  if (state.selections.internals === true || state.multiSelections.internals?.length > 0) {
    flags.add('HAS_INTERNALS');
  }

  // Piping & platform clips
  if (state.selections.piping_clips === true) flags.add('PIPING_CLIPS');
  if (state.selections.platform_clips === true) flags.add('PLATFORM_CLIPS');

  return flags;
}
