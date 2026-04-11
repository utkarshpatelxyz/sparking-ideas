export interface StepConfig {
  id: string;
  label: string;
  type: 'single' | 'multi' | 'yesno' | 'section-group';
  options?: OptionConfig[];
  required?: boolean;
  comingSoon?: boolean;
  description?: string;
}

export interface OptionConfig {
  id: string;
  label: string;
  icon?: string;
  comingSoon?: boolean;
  complexityFlag?: string;
  complexityPoints?: number;
  children?: StepConfig[];
}

// The equipment hierarchy steps vary by equipment type + subType
export function getStepsForEquipment(equipmentType: string, subType?: string): StepConfig[] {
  switch (equipmentType) {
    case 'DRUM':
      return subType === 'VERTICAL' ? getDrumVerticalSteps() : getDrumHorizontalSteps();
    case 'COLUMN':
      return getColumnSteps();
    case 'REACTOR':
      return getReactorSteps();
    case 'TANK':
      if (subType === 'API_650') return getTankAPI650Steps();
      if (subType === 'API_620') return getTankAPI620Steps();
      if (subType === 'API_625') return getTankAPI625Steps();
      return [];
    default:
      return [];
  }
}

function getDrumVerticalSteps(): StepConfig[] {
  return [
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'MATERIAL', label: 'Material' },
        { id: 'DIMENSIONAL_CONTROL', label: 'Dimensional Control' },
        { id: 'DESIGN_CODE', label: 'Design Code' },
      ]
    },
    {
      id: 'internals', label: 'W/ Internals?', type: 'yesno',
      options: [
        { id: 'COALESCER', label: 'Coalescer' },
        { id: 'BAFFLES', label: 'Baffles' },
        { id: 'PIPES', label: 'Pipes' },
        { id: 'VORTEX_BREAKER', label: 'Vortex Breaker' },
        { id: 'IMPINGEMENT_PLATE', label: 'Impingement Plate' },
        { id: 'COIL_INTERNAL', label: 'W/ Coil (Internal)' },
        { id: 'DEMISTER', label: 'Demister' },
      ]
    },
    { id: 'coils_external', label: 'W/ Coils (External)?', type: 'yesno' },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    { id: 'mixers', label: 'W/ Mixers?', type: 'yesno' },
    {
      id: 'mounted_equipment', label: 'W/ Mounted Equipment?', type: 'yesno',
      options: [
        { id: 'HEAT_EXCHANGER', label: 'Heat Exchanger' },
        { id: 'VESSEL_INTERMEDIATE_SKIRT', label: 'Vessel with Intermediate Skirt' },
      ]
    },
    {
      id: 'platforms', label: 'W/ Platforms?', type: 'yesno',
      options: [
        { id: 'TOP_PLATFORM', label: 'W/ Top Platform' },
        { id: 'CIRCULAR_PLATFORM', label: 'W/ Circular Platform' },
      ]
    },
    { id: 'internal_heads', label: 'W/ Internal Heads?', type: 'yesno' },
    {
      id: 'support_type', label: 'Support Type', type: 'single', required: true,
      options: [
        { id: 'SKIRT', label: 'W/ Skirt' },
        { id: 'LEGS', label: 'W/ Legs' },
        { id: 'LUGS', label: 'W/ Lugs' },
      ]
    },
    {
      id: 'material_category', label: 'Material Category', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LOW_ALLOY', label: 'Low Alloy Steel (CrMo)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS', label: 'Stainless Steel (SS)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'CLAD_OVERLAY', label: 'Clad / Overlay', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'LETHAL_SERVICE', label: 'Lethal Service (H2S, HF, Cl2)', complexityFlag: 'LETHAL_SERVICE', complexityPoints: 3 },
        { id: 'WET_H2S', label: 'Wet H2S Service (Sour)', complexityFlag: 'WET_H2S', complexityPoints: 2 },
        { id: 'H2_SERVICE', label: 'H2 Service (Hydrogen)', complexityFlag: 'H2_SERVICE', complexityPoints: 2 },
        { id: 'AMINE_SERVICE', label: 'Amine Service', complexityFlag: 'AMINE_SERVICE', complexityPoints: 2 },
        { id: 'FULL_VACUUM', label: 'Full Vacuum (FV)', complexityFlag: 'FULL_VACUUM', complexityPoints: 2 },
        { id: 'CYCLIC_SERVICE', label: 'Cyclic Service', complexityFlag: 'CYCLIC_SERVICE', complexityPoints: 2 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
        { id: 'MULTIPLE_CONDITIONS', label: 'Multiple Design Conditions (>2)', complexityFlag: 'MULTIPLE_CONDITIONS', complexityPoints: 1 },
        { id: 'STANDARD_CS', label: 'Standard CS Vessel, Normal Pressure' },
      ]
    },
  ];
}

function getDrumHorizontalSteps(): StepConfig[] {
  return [
    {
      id: 'bullets', label: 'Bullets?', type: 'yesno',
      options: [
        { id: 'MOUNDED', label: 'Mounded' },
        { id: 'BARE', label: 'Bare' },
      ]
    },
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'MATERIALS', label: 'Materials' },
        { id: 'DIMENSIONAL_CONTROL', label: 'Dimensional Control' },
        { id: 'DESIGN_CODE', label: 'Design Code' },
      ]
    },
    {
      id: 'boot', label: 'W/ Boot?', type: 'yesno',
      options: [
        { id: 'DESIGN_CONDITION', label: 'Design Condition' },
        { id: 'FINAL_LOCATION', label: 'Final Location' },
        { id: 'INSTRUMENT_NOZZLE', label: 'Instrument Nozzle Location' },
      ]
    },
    { id: 'pumps', label: 'W/ Pumps?', type: 'yesno' },
    {
      id: 'internals', label: 'W/ Internals?', type: 'yesno',
      options: [
        { id: 'COALESCER', label: 'Coalescer' },
        { id: 'BAFFLES', label: 'Baffles' },
        { id: 'PIPES', label: 'Pipes' },
        { id: 'VORTEX_BREAKER', label: 'Vortex Breaker' },
        { id: 'IMPINGEMENT_PLATE', label: 'Impingement Plate' },
        { id: 'COIL_INTERNAL', label: 'W/ Coil (Internal)' },
        { id: 'DEMISTER', label: 'Demister' },
      ]
    },
    {
      id: 'coil_external', label: 'W/ Coil (External)?', type: 'yesno',
      options: [
        { id: 'STEAM_COIL', label: 'Steam Coil' },
        { id: 'ELECTRICAL_COIL', label: 'Electrical Coil' },
      ]
    },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    { id: 'mounted_equipment', label: 'W/ Mounted Equipment?', type: 'yesno' },
    { id: 'platforms_h', label: 'W/ Platforms?', type: 'yesno' },
    { id: 'slope', label: 'W/ Slope?', type: 'yesno' },
    { id: 'quick_opening', label: 'Quick Opening Closures?', type: 'yesno' },
    {
      id: 'support_type', label: 'Support Type', type: 'single', required: true,
      options: [
        { id: 'SADDLES', label: 'W/ Saddles' },
        { id: 'LEGS', label: 'W/ Legs' },
        { id: 'LUGS', label: 'W/ Lugs' },
      ]
    },
    {
      id: 'material_category', label: 'Material Category', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LOW_ALLOY', label: 'Low Alloy Steel (CrMo)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS', label: 'Stainless Steel (SS)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'CLAD_OVERLAY', label: 'Clad / Overlay', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'LETHAL_SERVICE', label: 'Lethal Service', complexityFlag: 'LETHAL_SERVICE', complexityPoints: 3 },
        { id: 'WET_H2S', label: 'Wet H2S Service (Sour)', complexityFlag: 'WET_H2S', complexityPoints: 2 },
        { id: 'H2_SERVICE', label: 'H2 Service (Hydrogen)', complexityFlag: 'H2_SERVICE', complexityPoints: 2 },
        { id: 'AMINE_SERVICE', label: 'Amine Service', complexityFlag: 'AMINE_SERVICE', complexityPoints: 2 },
        { id: 'FULL_VACUUM', label: 'Full Vacuum (FV)', complexityFlag: 'FULL_VACUUM', complexityPoints: 2 },
        { id: 'CYCLIC_SERVICE', label: 'Cyclic Service', complexityFlag: 'CYCLIC_SERVICE', complexityPoints: 2 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
        { id: 'MULTIPLE_CONDITIONS', label: 'Multiple Design Conditions (>2)', complexityFlag: 'MULTIPLE_CONDITIONS', complexityPoints: 1 },
        { id: 'STANDARD_CS', label: 'Standard CS Vessel, Normal Pressure' },
      ]
    },
  ];
}

function getColumnSteps(): StepConfig[] {
  return [
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'DIMENSIONAL_CONTROL', label: 'Dimensional Control' },
        { id: 'MATERIALS', label: 'Materials' },
        { id: 'DESIGN_CODES', label: 'Design Codes' },
      ]
    },
    {
      id: 'internals', label: 'W/ Internals?', type: 'yesno',
      options: [
        { id: 'TRAYS', label: 'W/ Trays', complexityFlag: 'COMPLEX_INTERNALS' },
        { id: 'PACKING', label: 'W/ Packing', complexityFlag: 'COMPLEX_INTERNALS' },
        { id: 'LIQUID_DISTRIBUTOR', label: 'W/ Liquid Distributor' },
        { id: 'LIQUID_COLLECTOR', label: 'W/ Liquid Collector' },
        { id: 'VAPOUR_DISTRIBUTOR', label: 'W/ Vapour Distributor' },
        { id: 'FEED_INLET', label: 'W/ Feed Inlet Devices' },
        { id: 'MIST_ELIMINATOR', label: 'W/ Mist Eliminator' },
        { id: 'BAFFLES', label: 'W/ Baffles' },
        { id: 'VORTEX_BREAKER', label: 'W/ Vortex Breaker' },
        { id: 'INTERNAL_COIL', label: 'W/ Internal Coil' },
      ]
    },
    {
      id: 'coils_external', label: 'W/ Coils (External)?', type: 'yesno',
      options: [
        { id: 'STEAM_COIL', label: 'Steam Coil' },
        { id: 'ELECTRICAL_COIL', label: 'Electrical Coil' },
      ]
    },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    {
      id: 'mounted_equipment', label: 'W/ Mounted Equipment?', type: 'yesno',
      options: [
        { id: 'HEAT_EXCHANGER', label: 'Heat Exchanger' },
        { id: 'VESSEL_INTERMEDIATE_SKIRT', label: 'Vessel with Intermediate Skirt' },
      ]
    },
    { id: 'platform_clips', label: 'W/ Platform Clips?', type: 'yesno' },
    { id: 'piping_clips', label: 'W/ Piping Support Clips?', type: 'yesno' },
    { id: 'internal_heads', label: 'W/ Internal Heads?', type: 'yesno' },
    {
      id: 'support_type', label: 'Support Type', type: 'single', required: true,
      options: [
        { id: 'SKIRT', label: 'W/ Skirt' },
        { id: 'LUGS', label: 'W/ Lugs' },
      ]
    },
    { id: 'conical_transition', label: 'W/ Conical Transition?', type: 'yesno' },
    {
      id: 'material_category', label: 'Material Category', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LOW_ALLOY', label: 'Low Alloy Steel (CrMo)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS', label: 'Stainless Steel (SS)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'CLAD_OVERLAY', label: 'Clad / Overlay', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'LETHAL_SERVICE', label: 'Lethal Service', complexityFlag: 'LETHAL_SERVICE', complexityPoints: 3 },
        { id: 'WET_H2S', label: 'Wet H2S Service (Sour)', complexityFlag: 'WET_H2S', complexityPoints: 2 },
        { id: 'H2_SERVICE', label: 'H2 Service (Hydrogen)', complexityFlag: 'H2_SERVICE', complexityPoints: 2 },
        { id: 'AMINE_SERVICE', label: 'Amine Service', complexityFlag: 'AMINE_SERVICE', complexityPoints: 2 },
        { id: 'FULL_VACUUM', label: 'Full Vacuum (FV)', complexityFlag: 'FULL_VACUUM', complexityPoints: 2 },
        { id: 'CYCLIC_SERVICE', label: 'Cyclic Service', complexityFlag: 'CYCLIC_SERVICE', complexityPoints: 2 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
        { id: 'MULTIPLE_CONDITIONS', label: 'Multiple Design Conditions (>2)', complexityFlag: 'MULTIPLE_CONDITIONS', complexityPoints: 1 },
      ]
    },
  ];
}

function getReactorSteps(): StepConfig[] {
  return [
    {
      id: 'design_code', label: 'Design Code', type: 'single', required: true,
      options: [
        { id: 'ASME_DIV1', label: 'ASME Section VIII Div. 1' },
        { id: 'ASME_DIV2', label: 'ASME Section VIII Div. 2', complexityFlag: 'REACTOR_DIV2_DIV3' },
        { id: 'ASME_DIV3', label: 'ASME Section VIII Div. 3', complexityFlag: 'REACTOR_DIV2_DIV3' },
        { id: 'PED', label: 'PED' },
      ]
    },
    {
      id: 'process_flags', label: 'Process Flags', type: 'multi',
      options: [
        { id: 'FULL_VACUUM', label: 'Full Vacuum', complexityFlag: 'FULL_VACUUM', complexityPoints: 2 },
        { id: 'H2_SERVICE', label: 'W/ Hydrogen Service', complexityFlag: 'H2_SERVICE', complexityPoints: 2 },
        { id: 'HIGH_PRESSURE', label: 'W/ High-Pressure Design', complexityFlag: 'REACTOR_DIV2_DIV3', complexityPoints: 2 },
        { id: 'CYCLIC_SERVICE', label: 'Cyclic Service', complexityFlag: 'CYCLIC_SERVICE', complexityPoints: 2 },
      ]
    },
    {
      id: 'catalyst_bed', label: 'W/ Catalyst Bed System?', type: 'yesno',
      options: [
        { id: 'DISTRIBUTOR_TRAY', label: 'W/ Distributor Tray' },
        { id: 'QUENCH_MIXER', label: 'W/ Quench Mixer' },
        { id: 'CATALYST_SUPPORT', label: 'W/ Catalyst Support' },
        { id: 'OUTLET_COLLECTOR', label: 'W/ Outlet Collector' },
        { id: 'INLET_DIFFUSER', label: 'W/ Inlet Diffuser' },
        { id: 'REDISTRIBUTION_TRAY', label: 'W/ Redistribution Tray' },
      ]
    },
    {
      id: 'refractory_lining', label: 'W/ Refractory Lining?', type: 'yesno',
      options: [
        { id: 'CASTABLE', label: 'Castable' },
        { id: 'CERAMIC_FIBER', label: 'Ceramic Fiber Blanket' },
        { id: 'GUNNED', label: 'Gunned' },
      ]
    },
    { id: 'mist_eliminator', label: 'W/ Mist Eliminator?', type: 'yesno' },
    { id: 'vortex_breaker', label: 'W/ Vortex Breaker?', type: 'yesno' },
    { id: 'internal_coil', label: 'W/ Internal Coil?', type: 'yesno' },
    { id: 'internal_heads', label: 'W/ Internal Heads?', type: 'yesno' },
    { id: 'radial_flow', label: 'W/ Radial Flow Configuration?', type: 'yesno' },
    {
      id: 'hot_cold_wall', label: 'W/ Hot-Wall/Cold-Wall Design?', type: 'yesno',
      options: [
        { id: 'HOT_WALL', label: 'Hot-Wall (High Alloy Shell)' },
        { id: 'COLD_WALL', label: 'Cold-Wall (Lined CS/Low Alloy)' },
      ]
    },
    { id: 'coils_external', label: 'W/ Coils (External)?', type: 'yesno' },
    { id: 'mounted_equipment', label: 'W/ Mounted Equipment?', type: 'yesno' },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    {
      id: 'support_type', label: 'Support Type', type: 'single', required: true,
      options: [
        { id: 'SKIRT', label: 'W/ Skirt' },
      ]
    },
    { id: 'lug_lifting', label: 'W/ Lug/Lifting Provision?', type: 'yesno' },
    { id: 'platforms_ladders', label: 'W/ Platforms & Ladders?', type: 'yesno' },
    {
      id: 'material_category', label: 'Material Category', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LOW_ALLOY', label: 'Low Alloy Steel (CrMo)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS', label: 'Stainless Steel (SS)', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'CLAD_OVERLAY', label: 'Clad / Overlay', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'LETHAL_SERVICE', label: 'Lethal Service', complexityFlag: 'LETHAL_SERVICE', complexityPoints: 3 },
        { id: 'WET_H2S', label: 'Wet H2S Service (Sour)', complexityFlag: 'WET_H2S', complexityPoints: 2 },
        { id: 'AMINE_SERVICE', label: 'Amine Service', complexityFlag: 'AMINE_SERVICE', complexityPoints: 2 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
        { id: 'MULTIPLE_CONDITIONS', label: 'Multiple Design Conditions (>2)', complexityFlag: 'MULTIPLE_CONDITIONS', complexityPoints: 1 },
      ]
    },
  ];
}

function getTankAPI650Steps(): StepConfig[] {
  return [
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'DIMENSIONAL_CONTROL', label: 'Dimensional Control' },
        { id: 'DESIGN_CODE', label: 'Design Code (API 650)' },
        { id: 'VENTING_CODE', label: 'Venting Code (API 2000)' },
        { id: 'DESIGN_PRESSURE_TEMP', label: 'Design Pressure & Temperature' },
        { id: 'LIQUID_LEVEL', label: 'Liquid Level' },
        { id: 'CAPACITY', label: 'Capacity' },
        { id: 'SPECIFIC_GRAVITY', label: 'Design Specific Gravity' },
        { id: 'CORROSION_ALLOWANCE', label: 'Corrosion Allowance' },
        { id: 'WIND_LOAD', label: 'Wind Load' },
        { id: 'SEISMIC_LOAD', label: 'Seismic Load' },
      ]
    },
    {
      id: 'roof_type', label: 'Roof Type', type: 'single', required: true,
      options: [
        { id: 'FIXED_CONE', label: 'Fixed Cone Roof' },
        { id: 'FIXED_DOME', label: 'Fixed Dome Roof' },
        { id: 'COLUMN_SUPPORTED', label: 'Column Supported Cone Roof' },
        { id: 'EFR', label: 'External Floating Roof (EFR)' },
        { id: 'IFR', label: 'Internal Floating Roof (IFR)' },
        { id: 'CFR', label: 'Fixed + Internal Floating Roof' },
      ]
    },
    {
      id: 'bottom_type', label: 'Bottom Type', type: 'single', required: true,
      options: [
        { id: 'FLAT_BOTTOM', label: 'Flat Bottom' },
        { id: 'CONE_UP', label: 'Cone-Up Bottom' },
        { id: 'CONE_DOWN', label: 'Cone-Down Bottom' },
        { id: 'SLOPED', label: 'Sloped Bottom' },
      ]
    },
    { id: 'shell_courses', label: 'Shell Courses', type: 'single', required: true, options: [{ id: 'SHELL_COURSES_YES', label: 'Shell Courses Reviewed' }] },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    {
      id: 'appurtenances', label: 'Appurtenances', type: 'multi',
      options: [
        { id: 'STAIRWAY', label: 'Stairway' },
        { id: 'ROOF_PLATFORM', label: 'Roof Platform & Handrail' },
        { id: 'WIND_GIRDER', label: 'Wind Girder' },
        { id: 'PVRV', label: 'Pressure/Vacuum Relief Vent' },
        { id: 'FLAME_ARRESTER', label: 'Flame Arrester' },
        { id: 'FOAM_CHAMBER', label: 'Foam Chamber' },
        { id: 'FLOATING_ROOF_SEAL', label: 'Floating Roof Seal' },
        { id: 'FLOATING_ROOF_DRAIN', label: 'Floating Roof Drain' },
        { id: 'EARTHING_LUG', label: 'Earthing / Grounding Lug' },
        { id: 'CATHODIC_PROTECTION', label: 'Cathodic Protection' },
      ]
    },
    { id: 'coating', label: 'Coating', type: 'yesno' },
    { id: 'foundation', label: 'Foundation & Anchor', type: 'single', required: true, options: [{ id: 'FOUNDATION_YES', label: 'Foundation Reviewed' }] },
    {
      id: 'tank_internals', label: 'Internals', type: 'multi',
      options: [
        { id: 'INLET_DIFFUSER', label: 'Inlet Diffuser / Dip Pipe' },
        { id: 'VORTEX_BREAKER', label: 'Vortex Breaker' },
        { id: 'SUCTION_SUMP', label: 'Suction Sump' },
        { id: 'HEATING_COIL', label: 'Heating Coil' },
        { id: 'MIXER', label: 'Mixer / Agitator' },
        { id: 'FLOATING_SUCTION', label: 'Floating Suction' },
      ]
    },
    { id: 'insulation', label: 'Insulation & Fireproofing', type: 'yesno' },
    {
      id: 'material_category', label: 'Material', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LOW_ALLOY', label: 'Low Alloy Steel', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS', label: 'Stainless Steel', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'SIMPLE_CS_TANK', label: 'Simple CS Tank, Low Pressure', complexityFlag: 'SIMPLE_CS_TANK', complexityPoints: -1 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
        { id: 'FULL_VACUUM', label: 'Full Vacuum (FV)', complexityFlag: 'FULL_VACUUM', complexityPoints: 2 },
      ]
    },
  ];
}

function getTankAPI620Steps(): StepConfig[] {
  return [
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'DIMENSIONAL_CONTROL', label: 'Dimensional Control' },
        { id: 'DESIGN_CODE', label: 'Design Code (API 620)' },
        { id: 'MAWP', label: 'MAWP (up to 15 psig)' },
        { id: 'MAWV', label: 'MAWV (Vacuum)' },
      ]
    },
    {
      id: 'roof_type', label: 'Roof Type', type: 'single', required: true,
      options: [
        { id: 'FIXED_CONE', label: 'Fixed Cone Roof' },
        { id: 'FIXED_DOME', label: 'Fixed Dome Roof' },
      ]
    },
    {
      id: 'bottom_type', label: 'Bottom Type', type: 'single', required: true,
      options: [
        { id: 'FLAT_BOTTOM', label: 'Flat Bottom' },
        { id: 'KNUCKLE', label: 'Knuckle / Toriconical Bottom' },
      ]
    },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    {
      id: 'material_category', label: 'Material', type: 'single', required: true,
      options: [
        { id: 'CS', label: 'Carbon Steel (CS)' },
        { id: 'LTCS', label: 'Low Temp. CS (LTCS)', complexityFlag: 'LTCS' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'SIMPLE_CS_TANK', label: 'Simple CS Tank', complexityFlag: 'SIMPLE_CS_TANK', complexityPoints: -1 },
        { id: 'LTCS', label: 'LTCS / MDMT < -10°C', complexityFlag: 'LTCS', complexityPoints: 2 },
      ]
    },
  ];
}

function getTankAPI625Steps(): StepConfig[] {
  return [
    {
      id: 'design_conditions', label: 'Design Conditions', type: 'multi', required: true,
      options: [
        { id: 'DESIGN_CODE', label: 'Design Code (API 625 + API 620 Annex Q)' },
        { id: 'CRYO_TEMP', label: 'Cryogenic Design Temperature (MDMT)' },
        { id: 'BOIL_OFF', label: 'Boil-Off Rate (BOR)' },
        { id: 'THERMAL_CONTRACTION', label: 'Thermal Contraction Allowance' },
      ]
    },
    {
      id: 'tank_type', label: 'Tank Type', type: 'single', required: true,
      options: [
        { id: 'SINGLE_CONTAINMENT', label: 'Single Containment' },
        { id: 'DOUBLE_CONTAINMENT', label: 'Double Containment' },
        { id: 'FULL_CONTAINMENT', label: 'Full Containment' },
        { id: 'MEMBRANE', label: 'Membrane Tank' },
      ]
    },
    { id: 'inner_tank', label: 'Inner Tank', type: 'single', required: true, options: [{ id: 'INNER_TANK_YES', label: 'Inner Tank Reviewed' }] },
    { id: 'outer_tank', label: 'Outer Tank', type: 'single', required: true, options: [{ id: 'OUTER_TANK_YES', label: 'Outer Tank Reviewed' }] },
    { id: 'insulation_system', label: 'Insulation System', type: 'single', required: true, options: [{ id: 'INSULATION_YES', label: 'Insulation Reviewed' }] },
    { id: 'nozzles', label: 'Nozzles', type: 'single', required: true, options: [{ id: 'NOZZLES_YES', label: 'Nozzles Included' }] },
    { id: 'foundation', label: 'Foundation & Anchor', type: 'single', required: true, options: [{ id: 'FOUNDATION_YES', label: 'Foundation Reviewed' }] },
    {
      id: 'material_category', label: 'Material', type: 'single', required: true,
      options: [
        { id: '9NI_STEEL', label: '9% Ni Steel', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'SS304L', label: 'SS304L', complexityFlag: 'SPECIAL_MATERIAL' },
        { id: 'AL_ALLOY', label: 'Aluminium Alloy', complexityFlag: 'SPECIAL_MATERIAL' },
      ]
    },
    {
      id: 'special_flags', label: 'Special Service Flags', type: 'multi',
      options: [
        { id: 'LTCS', label: 'LTCS / Cryogenic', complexityFlag: 'LTCS', complexityPoints: 2 },
      ]
    },
  ];
}
