
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mocks
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Setup mock data for exportExcel
global.projectSamples = [];
global.currentProjectName = "OrderTestProject";
global.STATS_ORDER = ['sp', 'line'];
global.CATS = { sp: { label: 'Pits' }, line: { label: 'Scratches' } };
global.getStatsFromItems = vi.fn().mockReturnValue({
    crushingIndex: 0, percMeasuredPits: 0, maxPitDiameter: 0, severityPits: 0,
    meanScratchWidth: 0, aspectRatio: 0, severityScratches: 0, measuredAspectRatio: 0,
    psRatio: 0, anisotropy: 0, vectorConsistency: 0, meanOrient: 0,
    bgAbrasion: 0, severityTotal: 0, severityRatio: 0, meanFeatureSeverity: 0,
    durophagyIndex: 0, pitHet: 0, scratchHet: 0, globalHet: 0
});

// Since exportExcel creates a hidden link and clicks it, we need to mock that behavior
let lastDownloadUrl = '';
let lastDownloadName = '';
global.URL = { createObjectURL: vi.fn() };

// Mock createElement
const originalCreateElement = document.createElement.bind(document);
document.createElement = (tagName) => {
    if (tagName === 'a') {
        return {
            click: vi.fn(),
            set href(url) {
                lastDownloadUrl = url;
                // Decode data URI to check content
                if (url.startsWith('data:text/csv')) {
                    this._content = decodeURI(url.split(',')[1]);
                }
            },
            get href() { return lastDownloadUrl; },
            set download(name) { lastDownloadName = name; },
            // Helper for test
            getContent: function () { return this._content; }
        };
    }
    return originalCreateElement(tagName);
};

// Mock getElementById to avoid null pointers
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = (id) => {
    if (id === 'statsModalOverlay') return { style: {} };
    return originalGetElementById(id) || document.createElement('div');
};

global.window.closeStatsModal = vi.fn();

// Load js/io.js (Need to eval it to get exportExcel)
const fs = require('fs');
const path = require('path');
const ioJsPath = path.resolve(__dirname, '../js/io.js');
const ioJsContent = fs.readFileSync(ioJsPath, 'utf-8');
eval(ioJsContent);

describe('Aggregated Export Order', () => {

    beforeEach(() => {
        global.projectSamples = [];
        lastDownloadUrl = '';
        lastDownloadName = '';
        vi.clearAllMocks();
    });

    it('should maintain the order of First Appearance in projectSamples', () => {
        // Setup scenarios where key sorting (alphabetic/numeric) might conflict with array order
        // Specimen IDs: "Zebra", "Antelope", "Bear"
        // Sidebar Order (projectSamples): "Zebra", "Antelope", "Bear"
        // Expected Export Order: "Zebra", "Antelope", "Bear"
        // If sorting alphabetically by keys happened, it would be Antelope, Bear, Zebra.

        global.projectSamples = [
            { id: '1', name: 'Zebra_1', metadata: { specimenId: 'Zebra' }, items: [] },
            { id: '2', name: 'Zebra_2', metadata: { specimenId: 'Zebra' }, items: [] },
            { id: '3', name: 'Antelope', metadata: { specimenId: 'Antelope' }, items: [] },
            { id: '4', name: 'Bear_1', metadata: { specimenId: 'Bear' }, items: [] }
        ];

        window.exportExcel('AVERAGE');

        // Check content of the exported file
        // We need to capture the 'a' element created inside exportExcel
        // The mock above captures URL.

        const content = decodeURI(lastDownloadUrl.split(',')[1]);
        const lines = content.trim().split('\n');

        // Header is line 0
        // Data starts line 1
        const rows = lines.slice(1);

        // Check IDs in order
        const getRowId = (row) => row.split(';')[0].replace(/"/g, '');

        expect(getRowId(rows[0])).toBe('Zebra');
        expect(getRowId(rows[1])).toBe('Antelope');
        expect(getRowId(rows[2])).toBe('Bear');
    });

    it('should handle numeric-like IDs keeping insertion order', () => {
        // IDs: "10", "2"
        // Sidebar Order: "10", "2"
        // Alphabetic/Numeric Key Sort might put "2" before "10" (val) or "10" before "2" (str)
        // But we want "10" then "2"

        global.projectSamples = [
            { id: '1', name: '10', metadata: { specimenId: '10' }, items: [] },
            { id: '2', name: '2', metadata: { specimenId: '2' }, items: [] }
        ];

        window.exportExcel('AVERAGE');

        const content = decodeURI(lastDownloadUrl.split(',')[1]);
        const lines = content.trim().split('\n');
        const rows = lines.slice(1);
        const getRowId = (row) => row.split(';')[0].replace(/"/g, '');

        expect(getRowId(rows[0])).toBe('10');
        expect(getRowId(rows[1])).toBe('2');
    });

});
