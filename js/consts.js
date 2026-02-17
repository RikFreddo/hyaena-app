
// ==========================================================================
// CONSTANTS & CONFIG
// ==========================================================================

const CATS = {
    'sp': { label: 'Sp', color: '#007aff' },   // Small Pits
    'lp': { label: 'Lp', color: '#af52de' },   // Large Pits
    'pp': { label: 'Pp', color: '#ff9500' },   // Puncture Pits
    'fs': { label: 'Fs', color: '#ff3b30' },   // Fine Scratches (Red)
    'cs': { label: 'Cs', color: '#ffcc00' },   // Coarse Scratches (Yellow)
    'hcs': { label: 'Hcs', color: '#34c759' },  // Hyper-Coarse Scratches (Green)
    'g': { label: 'G', color: '#30b0c7' }    // Gouges (Teal)
};

const STATS_ORDER = ['sp', 'lp', 'pp', 'fs', 'cs', 'hcs', 'g'];

// Expose to window for legacy compatibility if needed, 
// though we aim to use ES modules where possible or keep specific globals.
// For the "Global Scope" refactor plan, we attach these to window to be safe.
window.CATS = CATS;
window.STATS_ORDER = STATS_ORDER;
