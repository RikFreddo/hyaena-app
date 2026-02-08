/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../js/utils.js';

describe('Utility Functions', () => {
    describe('calculateProjection', () => {
        it('should return point itself if line length is zero', () => {
            const p = { x: 5, y: 5 };
            const lineStart = { x: 0, y: 0 };
            const lineEnd = { x: 0, y: 0 };
            expect(window.calculateProjection(p, lineStart, lineEnd)).toEqual({ x: 5, y: 5 });
        });

        it('should project point onto line', () => {
            const p = { x: 5, y: 5 };
            const lineStart = { x: 0, y: 0 };
            const lineEnd = { x: 10, y: 0 };
            // Projected onto y=0 line from (5,5) should be (5,0)
            // BUT implementation projects onto NORMAL relative to start.
            // Normal is (0,1). P-Start = (5,5). Dot = 5. Result = Start + 5*(0,1) = (0,5).
            const res = window.calculateProjection(p, lineStart, lineEnd);
            expect(res.x).toBeCloseTo(0);
            expect(res.y).toBeCloseTo(5);
        });
    });

    describe('getDistance', () => {
        it('should calculate distance', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 3, y: 4 };
            expect(window.getDistance(p1, p2)).toBe(5);
        });
    });

    describe('pxToUnit', () => {
        it('should convert pixels', () => {
            expect(window.pxToUnit(100, 2)).toBe(50);
        });
        it('should handle zero ppu', () => {
            expect(window.pxToUnit(100, 0)).toBe(0);
        });
    });

    describe('parseFilename', () => {
        it('should parse complex filename', () => {
            // Example: "Sample_1_dI1_buc" -> ID: SAMPLE (1 stripped as sequence)
            const res = window.parseFilename('Sample_1-dI1-buc.jpg');
            expect(res.id).toBe('SAMPLE');
            expect(res.tooth).toBe('dI1');
            expect(res.side).toBe('buc');
            expect(res.originalName).toBe('Sample_1-dI1-buc');
        });

        it('should use filename as ID if no tokens', () => {
            const res = window.parseFilename('JustName.jpg');
            expect(res.id).toBe('JUSTNAME');
            expect(res.originalName).toBe('JustName');
        });
    });
});
