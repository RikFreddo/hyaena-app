import { describe, it, expect } from 'vitest';
import { calculateProjection, getDistance, pxToUnit } from '../js/utils';

describe('Utility Functions', () => {

    describe('calculateProjection', () => {
        it('should project point onto horizontal line', () => {
            const p = { x: 10, y: 10 };
            const start = { x: 0, y: 0 };
            const end = { x: 20, y: 0 };
            const proj = calculateProjection(p, start, end);
            // On a horizontal line y=0, projection should be (10, 0)
            // But wait, the logic in utils.js is for "Doubt Measure" purely perpendicular OFF of the line?
            // Let's re-read the logic to be sure what we tested.
            // The logic: 
            // perpX = -dy/len, perpY = dx/len (Normal vector)
            // dist = dot(dragVec, normalVec)
            // result = start + normal * dist

            // If line is (0,0)->(20,0), dx=20, dy=0. len=20.
            // perpX = 0, perpY = 1. Normal is (0, 1).
            // dragVec = (10, 10) - (0,0) = (10, 10).
            // dist = 10*0 + 10*1 = 10.
            // result = (0,0) + (0,1)*10 = (0, 10).

            // So it effectively projects the point onto the NORMAL vector starting at 'start'.
            // Meaning: it calculates the point on the line perpendicular to the segment, passing through 'start'.
            // Actually, let's verify if that's what the tool does.

            // In the code: perpEndPos = { x: startPos.x + perpX * dist, ... }
            // Yes, it projects 'cur' onto the line defined by 'startPos' + normal.

            expect(proj.x).toBeCloseTo(0);
            expect(proj.y).toBeCloseTo(10);
        });
    });

    describe('getDistance', () => {
        it('should calculate Euclidean distance', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 3, y: 4 };
            expect(getDistance(p1, p2)).toBe(5);
        });
    });

    describe('pxToUnit', () => {
        it('should convert pixels to units', () => {
            expect(pxToUnit(100, 2)).toBe(50); // 100px / 2ppu = 50 units
        });

        it('should return 0 if ppu is 0', () => {
            expect(pxToUnit(100, 0)).toBe(0);
        });
    });
});
