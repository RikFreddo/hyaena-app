
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mocks
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Load statistics logic
const fs = require('fs');
const path = require('path');
const statsJsPath = path.resolve(__dirname, '../js/statistics.js');
const statsJsContent = fs.readFileSync(statsJsPath, 'utf-8');
eval(statsJsContent);

describe('Statistics Width Calculation', () => {

    it('should fail to detect measured width if property name mismatches', () => {
        // Sample with one measured scratch using 'widthVal' (as in canvas.js)
        // and one unmeasured scratch
        const items = [
            {
                type: 'line', catId: 'fs',
                x1: 0, y1: 0, x2: 100, y2: 0,
                widthVal: 5.0 // Measured Width (Pixels or Units, let's say units for simplicity)
            },
            {
                type: 'line', catId: 'fs',
                x1: 0, y1: 0, x2: 100, y2: 0
                // No widthVal
            }
        ];

        const calib = { calibrated: true, pixelsPerUnit: 1 };
        // With ppu=1, length=100.
        // Item 1: measured width=5.0. AR = 100/5 = 20.
        // Item 2: default width=1.0 (STD_SCR_W). AR = 100/1 = 100.

        // Expected if working:
        // Mean Width = (5 + 1) / 2 = 3.0
        // Measured AR = 20 (only item 1 counts)
        // Count Measured = 1

        // Current broken behavior (ignoring widthVal):
        // Mean Width = (1 + 1) / 2 = 1.0
        // Measured AR = undefined/0 (count=0)

        const stats = window.getStatsFromItems(items, calib);

        // Assert FIXED state
        expect(stats.meanScratchWidth).toBe(3.0);
        expect(stats.measuredAspectRatio).toBe(20);
    });

});
