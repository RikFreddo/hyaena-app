import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('9x9 Grid Consistency', () => {
    it('should correctly calculate Pit Het using 9x9 logic', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../js/statistics.js'), 'utf-8');
        const m = { exports: {} };
        const w = {};
        const fn = new Function('module', 'window', src + '\nreturn window.getStatsFromItems || module.exports.getStatsFromItems;');
        const getStatsFromItems = fn(m, w);

        const cal = {
            calibrated: true,
            pixelsPerUnit: 1,
            getFOV: () => ({ width: 90, height: 90 }) // 9x9 grid means cells are 10x10 px
        };

        const items = [
            { type: 'point', catId: 'sp', x: 45, y: 45 } // Point exactly in the middle cell
        ];

        const res = getStatsFromItems(items, cal);

        // In a 9x9 grid (81 cells) with 1 point:
        // 1 cell has value 1, 80 cells have value 0.
        // Mean = 1 / 81
        // Variance = 80 / 6561
        // CV (Heterogeneity) = sqrt(Variance) / Mean = sqrt(80 / 6561) / (1 / 81) = sqrt(80) ≈ 8.944
        expect(res.pitHet).toBeDefined();
        expect(res.pitHet).toBeCloseTo(Math.sqrt(80), 3);
    });
});
