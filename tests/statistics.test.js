import { describe, it, expect } from 'vitest';
import { getStatsFromItems } from '../js/statistics';

describe('Microwear Stats (Hybrid Logic - 19 Params)', () => {

    const calibrate = { calibrated: true, pixelsPerUnit: 2.0 }; // 2px = 1um

    // Items
    // Pit1 (Point): Standard Dia = 2.0um.
    // Pit2 (Circle): R=4px -> D=8px -> 4um.
    const pits = [
        { type: 'point', x: 10, y: 10, catId: 'sp' },
        { type: 'circle', x: 50, y: 50, r: 4, catId: 'lp' }
    ];

    // Scratch1 (Line): Length=10px -> 5um. Standard Width = 1.0um.
    // Scratch2 (Measured?): Assume we mock 'width' prop.
    // Let's stick to simple lines first as per current app structure.
    const scratches = [
        { type: 'line', x1: 0, y1: 0, x2: 10, y2: 0, catId: 'fs' }, // L=5um
        { type: 'line', x1: 0, y1: 0, x2: 0, y2: 20, catId: 'cs' }  // L=10um
    ];

    it('should calculate Crushing Index (Mean Diameter)', () => {
        const stats = getStatsFromItems(pits, calibrate);
        // P1: 2.0um (Standard)
        // P2: 4.0um (Measured)
        // Mean = 3.0um
        expect(stats.crushingIndex).toBeCloseTo(3.0);
    });

    it('should calculate Max Pit Diameter', () => {
        const stats = getStatsFromItems(pits, calibrate);
        expect(stats.maxPitDiameter).toBeCloseTo(4.0);
    });

    it('should calculate Severity Pits (Area)', () => {
        const stats = getStatsFromItems(pits, calibrate);
        // P1: r=1.0. Area = pi*1^2 = 3.1416
        // P2: r=2.0. Area = pi*2^2 = 12.566
        // Total = 15.708
        expect(stats.severityPits).toBeCloseTo(Math.PI * 1 + Math.PI * 4);
    });

    it('should calculate Scratches Metrics (using Hybrid Logic)', () => {
        const stats = getStatsFromItems(scratches, calibrate);
        // S1: L=5um. W=1.0um (Standard). Area=5.
        // S2: L=10um. W=1.0um (Standard). Area=10.
        // Total Severity = 15.
        expect(stats.severityScratches).toBeCloseTo(15.0);
        expect(stats.meanScratchWidth).toBeCloseTo(1.0);

        // Aspect Ratio:
        // S1: 5/1 = 5.
        // S2: 10/1 = 10.
        // Mean AR = 7.5.
        expect(stats.aspectRatio).toBeCloseTo(7.5);
    });

    it('should calculate Durophagy Index', () => {
        const items = [...pits, ...scratches];
        const stats = getStatsFromItems(items, calibrate);
        // PSRatio = 2 / 2 = 1.0.
        // CrushingIndex = 3.0.
        // Durophagy = 1.0 * 3.0 = 3.0.
        expect(stats.durophagyIndex).toBeCloseTo(3.0);
    });

    it('should calculate Heterogeneity (CV)', () => {
        // CV = SD / Mean.
        // Grid 10x10 = 100 cells.
        // 2 pits.
        // Cell 1: 1. Cell 2: 1. (Assuming far apart). Others 0.
        const stats = getStatsFromItems(pits, calibrate);

        // CV Calculation (Population SD):
        // Points at (10,10) and (50,50). Default Canvas 2000x2000. Cell Size 200x200.
        // Both points fall in Cell [0][0].
        // Cell[0][0] = 2. All others 0.
        // Mean = 2/100 = 0.02.
        // Variance calculation:
        // SumSq = 1*(2-0.02)^2 + 99*(0-0.02)^2 = 3.9204 + 0.0396 = 3.96.
        // Var = 3.96 / 100 = 0.0396.
        // SD = sqrt(0.0396) ~= 0.198997.
        // CV = 0.198997 / 0.02 ~= 9.94987.
        expect(stats.pitHet).toBeCloseTo(9.94987);
    });

    it('should handle NaN safety checks (Invalid Calib)', () => {
        const items = [...pits];
        const stats = getStatsFromItems(items, { calibrated: true, pixelsPerUnit: 0 });
        // Fallback to ppu=1.
        expect(stats.crushingIndex).not.toBeNaN();
        // Pu=1 -> P1=2.0 (Standard kept 2.0). 
        // P2=8px -> 8.0um.
        // Mean = 5.0.
        expect(stats.crushingIndex).toBeCloseTo(5.0); // If standardized logic holds
    });

});
