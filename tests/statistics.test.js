/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../js/statistics.js';

describe('Statistics Calculation', () => {
    it('should return zeros for empty list', () => {
        const stats = window.getStatsFromItems([], { calibrated: false, pixelsPerUnit: 1 });
        expect(stats.crushingIndex).toBe(0);
        expect(stats.anisotropy).toBe(0);
        expect(stats.percLargePits).toBe(0);
    });

    it('should calculate basic pit stats', () => {
        const items = [
            { type: 'point', x: 10, y: 10 },
            { type: 'point', x: 20, y: 20 }
        ];
        // STD_PIT_DIA = 2
        // totalPitDia = 4
        // avg = 2
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        expect(stats.crushingIndex).toBe(2);
        expect(stats.percLargePits).toBe(0);
    });

    it('should handle large pits', () => {
        // Need to simulate a "large pit" by having diameter > 4
        // If point type is point, d=2. Not large.
        // Needs type circle with r > 2?
        const items = [
            { type: 'circle', r: 3, x: 10, y: 10 } // d=6
        ];
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        expect(stats.percLargePits).toBe(100);
        expect(stats.crushingIndex).toBe(6);
    });

    it('should calculate anisotropy for horizontal line', () => {
        const items = [
            { type: 'line', x1: 0, y1: 0, x2: 10, y2: 0 }
        ];
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        // Angle 0.
        // R = 1.
        expect(stats.anisotropy).toBeCloseTo(1);
        expect(stats.meanOrient).toBeCloseTo(0);
    });

    it('should calculate anisotropy for vertical line', () => {
        const items = [
            { type: 'line', x1: 0, y1: 0, x2: 0, y2: 10 }
        ];
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        // Angle 90.
        // R = 1.
        expect(stats.anisotropy).toBeCloseTo(1);
        expect(stats.meanOrient).toBeCloseTo(90);
    });
});
