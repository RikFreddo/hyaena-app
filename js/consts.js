
// ==========================================================================
// CONSTANTS & CONFIG
// ==========================================================================

const CATS = {
    'sp': { label: 'Sp', color: '#007aff' },   // Small Pits
    'lp': { label: 'Lp', color: '#af52de' },   // Large Pits
    'pp': { label: 'Pp', color: '#ff9500' },   // Puncture Pits
    'fs': { label: 'Fs', color: '#ff3b30' },   // Fine Scratches
    'cs': { label: 'Cs', color: '#34c759' },   // Coarse Scratches
    'hcs': { label: 'Hcs', color: '#5856d6' },  // Hyper-Coarse Scratches
    'g': { label: 'G', color: '#ff2d55' }    // Gouges
};

const STATS_ORDER = ['sp', 'lp', 'pp', 'fs', 'cs', 'hcs', 'g'];

// Expose to window for legacy compatibility if needed, 
// though we aim to use ES modules where possible or keep specific globals.
// For the "Global Scope" refactor plan, we attach these to window to be safe.
window.CATS = CATS;
window.STATS_ORDER = STATS_ORDER;
