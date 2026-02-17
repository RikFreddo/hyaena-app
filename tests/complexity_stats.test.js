import { describe, it, expect } from 'vitest';
import { getStatsFromItems } from '../js/statistics.js';

describe('Complexity Statistics (v0.26.7-v0.26.8)', () => {
    // Mock Calibration 1px = 1µm for simplicity (Standard Hyaena Unit)
    const mockCalib = {
        getScale: () => 1.0, // 1px = 1µm
        getFOV: () => ({ x: 0, y: 0, width: 200, height: 200 }), // 200x200µm
        getArea: () => 0.04 // 200*200 = 40,000 µm² = 0.04 mm²
    };

    it('should correctly count line-line intersections', () => {
        const items = [
            // Cross: + shape
            { type: 'line', x1: 2, y1: 5, x2: 8, y2: 5 }, // Horizontal
            { type: 'line', x1: 5, y1: 2, x2: 5, y2: 8 }  // Vertical
        ];

        const stats = getStatsFromItems(items, mockCalib);

        // 1 intersection
        expect(stats.intersectionCount).toBe(1);
        // Area = 0.04 mm². 
        // Density = 1 / 0.04 = 25.0
        expect(stats.intersectionDensity).toBeCloseTo(25.0);
    });

    it('should correctly count line-circle intersections', () => {
        const items = [
            // Line crossing circle
            { type: 'circle', x: 5, y: 5, widthVal: 2 }, // Pit, Radius=1 (widthVal=2)
            { type: 'line', x1: 2, y1: 5, x2: 8, y2: 5 } // Line through center
        ];

        const stats = getStatsFromItems(items, mockCalib);

        // 1 intersection
        expect(stats.intersectionCount).toBe(1);
    });

    it('should calculate TCI correctly', () => {
        // TCI = (IntDensity * VectorConsistency) + (PitDensity * 0.5)

        // Scenario: 2 crossing lines (High VC? No, 2 perp lines -> Low VC)
        // Horizontal (0 deg) and Vertical (90 deg). 
        // 2 lines: VC should be low?
        // Let's manually expect values.

        const items = [
            { type: 'line', x1: 2, y1: 5, x2: 8, y2: 5 }, // Horz
            { type: 'line', x1: 5, y1: 2, x2: 5, y2: 8 }  // Vert
        ];

        const stats = getStatsFromItems(items, mockCalib);

        expect(stats.intersectionCount).toBe(1);
        const dens = 1 / 100; // 0.01

        // VC for + shape:
        // Angle 1: 0, Angle 2: 90. 2*0=0, 2*90=180.
        // Cos(0)+Cos(180) = 1 + (-1) = 0.
        // Sin(0)+Sin(180) = 0 + 0 = 0.
        // R = 0. Consistency = 1 - 0 = 1.

        expect(stats.vectorConsistency).toBeCloseTo(1.0);

        // Pit Density = 0
        // TCI = (25.0 * 1) + 0 = 25.0
        expect(stats.textureComplexityIndex).toBeCloseTo(25.0);
    });

    it('should calculate Complexity Heterogeneity (TCI Het)', () => {
        // To test heterogeneity, we need TCI to vary across 9x9 grid.
        // Let's put a "complex" feature (cross) in one cell (Top-Left)
        // and nothing in others.
        // Grid 10x10. Cells are ~1.11x1.11.

        const items = [
            // Cross in top-left cell (0-1, 0-1)
            { type: 'line', x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5 },
            { type: 'line', x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.8 }
        ];

        const stats = getStatsFromItems(items, mockCalib);

        // One cell has TCI > 0. Others 0.
        // CV should be high.
        expect(stats.complexityHet).toBeGreaterThan(0);
    });
    it('should calculate MFD (Mean Feature Dimensions)', () => {
        const items = [
            { type: 'line', x1: 0, y1: 0, x2: 10, y2: 10, widthVal: 2 }, // Width 2
            { type: 'circle', x: 20, y: 20, widthVal: 4 } // Diameter 4
        ];
        // Total count = 2
        // Sum sizes = 2 + 4 = 6
        // MFD = 6 / 2 = 3.0
        const stats = getStatsFromItems(items, mockCalib);
        expect(stats.mfd).toBeCloseTo(3.0);
    });
});
