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
        expect(stats.percMeasuredPits).toBe(0);
    });

    it('should calculate basic pit stats', () => {
        const items = [
            { type: 'point', x: 10, y: 10, catId: 'sp' },
            { type: 'point', x: 20, y: 20, catId: 'sp' }
        ];
        // STD_PIT_DIA = 2
        // totalPitDia = 4
        // avg = 2
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        expect(stats.crushingIndex).toBe(2);
        expect(stats.percMeasuredPits).toBe(0);
    });

    it('should handle large pits', () => {
        // Need to simulate a "large pit" by having diameter > 4
        const items = [
            { type: 'circle', r: 3, x: 10, y: 10, catId: 'lp' } // d=6
        ];
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        expect(stats.percMeasuredPits).toBe(100);
        expect(stats.crushingIndex).toBe(6);
    });

    it('should exclude Pp and G from stats', () => {
        const items = [
            { type: 'point', x: 10, y: 10, catId: 'sp' },
            { type: 'point', x: 20, y: 20, catId: 'pp' }, // Excluded
            { type: 'circle', r: 10, x: 30, y: 30, catId: 'g' } // Excluded
        ];
        const stats = window.getStatsFromItems(items, { calibrated: false, pixelsPerUnit: 1 });
        // Only 1 'sp' should be counted.
        // Crushing Index should be 2 (std dia of sp)
        expect(stats.crushingIndex).toBe(2);
        // percMeasuredPits should be 0 (2.0 <= 4.0)
        expect(stats.percMeasuredPits).toBe(0);
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
