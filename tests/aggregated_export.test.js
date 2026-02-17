
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mocks
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="statsModalOverlay"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Blob = class Blob { constructor(content) { this.content = content; } };
global.URL = { createObjectURL: vi.fn(blob => "blob:" + blob.content) };

// Mock Application State
global.projectSamples = [];
global.currentProjectName = "TestProject";
global.CATS = {
    'sp': { label: "Sp" },
    'pp': { label: "Pp" },
    'lp': { label: "Lp" }
};
global.STATS_ORDER = ['sp', 'pp', 'lp'];

// Helper to mock stats calculation
global.getStatsFromItems = vi.fn(() => ({
    crushingIndex: 0, percMeasuredPits: 0, maxPitDiameter: 0, severityPits: 0,
    meanScratchWidth: 0, aspectRatio: 0, severityScratches: 0, measuredAspectRatio: 0,
    psRatio: 0, anisotropy: 0, vectorConsistency: 0, meanOrient: 0,
    bgAbrasion: 0, severityTotal: 0, severityRatio: 0, meanFeatureSeverity: 0,
    durophagyIndex: 0, pitHet: 0, scratchHet: 0, globalHet: 0
}));

// Load the function to test (mocking io.js context)
// We need to eval source logic or mock it.
// Since we don't have io.js loaded as a module, we will define a simplified version of exportExcel 
// OR better, we read io.js/project.js logic. Ideally we test the logic.
// But let's copy the logic chunk here or simulate the environment and load io.js
// We'll read io.js content first.

const fs = require('fs');
const path = require('path');

const ioJsPath = path.resolve(__dirname, '../js/io.js');
const ioJsContent = fs.readFileSync(ioJsPath, 'utf-8');

// Evaluate io.js in this context
eval(ioJsContent);

describe('Export Aggregated (Average) Mode', () => {

    beforeEach(() => {
        global.projectSamples = [];
        vi.clearAllMocks();
    });

    it('should aggregate samples by specimenId and average numeric values', () => {
        // Setup Samples
        // Sample 1: ID=A, Sp=10
        const s1 = {
            id: '1', name: 'Sample_1', group: 'G1',
            metadata: { specimenId: 'A', tooth: 'd1', mag: '10x' }, // Juv
            items: Array(10).fill({ catId: 'sp' }),
            calibration: { ppu: 1, calibrated: false }
        };

        // Sample 2: ID=A, Sp=20
        const s2 = {
            id: '2', name: 'Sample_2', group: 'G1',
            metadata: { specimenId: 'A', tooth: 'd1', mag: '10x' },
            items: Array(20).fill({ catId: 'sp' }), // Total Sp for A = 30, Avg = 15
            calibration: { ppu: 1, calibrated: false }
        };

        // Sample 3: ID=B, Sp=5
        const s3 = {
            id: '3', name: 'Sample_3', group: 'G2',
            metadata: { specimenId: 'B', tooth: 'M1', mag: '20x' }, // Adult
            items: Array(5).fill({ catId: 'sp' }),
            calibration: { ppu: 1, calibrated: false }
        };

        global.projectSamples = [s1, s2, s3];

        // Capture download click
        let downloadLink = "";
        let downloadFileName = "";

        // Mock createElement 'a'
        const originalCreateElement = document.createElement;
        document.createElement = (tag) => {
            if (tag === 'a') {
                return {
                    click: () => { },
                    set href(val) { downloadLink = val; },
                    set download(val) { downloadFileName = val; }
                };
            }
            return originalCreateElement.call(document, tag);
        };

        // Execute Export
        window.exportExcel('AVERAGE');

        // Decode CSV from Data URL
        expect(downloadLink).toContain('data:text/csv');
        const csvEncoded = downloadLink.split(',')[1];
        const csv = decodeURI(csvEncoded);
        const lines = csv.trim().split('\n');

        // Verify Headers
        const header = lines[0].split(';');

        // Check Column Existence and Order
        expect(header[0]).toBe('Id');
        expect(header[1]).toBe('Species');
        expect(header[2]).toBe('Age');

        // Sp should be next (index 3 if mock order holds)
        expect(header[3]).toBe('Sp');

        // Mag should be last
        expect(header[header.length - 1]).toBe('Mag');

        // Check REMOVED Columns
        expect(header).not.toContain('Tooth');
        expect(header).not.toContain('Side');
        expect(header).not.toContain('Part');

        // Verify Data Rows (Order depends on iteration but likely A then B or insertion order)
        // Find row for A
        const rowA = lines.find(l => l.startsWith('"A"'));
        expect(rowA).toBeDefined();
        const colsA = rowA.split(';');

        // Verify Averages for A
        // Sp is at index 3
        const spAvgA = parseFloat(colsA[3]);
        expect(spAvgA).toBe(15.00); // (10+20)/2

        // Verify Age for A (d1 -> J)
        expect(colsA[2]).toBe('"J"');

        // Start row for B
        const rowB = lines.find(l => l.startsWith('"B"'));
        expect(rowB).toBeDefined();
        const colsB = rowB.split(';');

        // Sp Avg for B
        expect(parseFloat(colsB[3])).toBe(5.00);

        // Age for B (M1 -> A)
        expect(colsB[2]).toBe('"A"');

        // Restore
        document.createElement = originalCreateElement;
    });

});
