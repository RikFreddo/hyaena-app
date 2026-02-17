
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mocks
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

global.projectSamples = [];
global.renderSampleList = vi.fn();

// Load logic
const fs = require('fs');
const path = require('path');
const projectJsPath = path.resolve(__dirname, '../js/project.js');
const projectJsContent = fs.readFileSync(projectJsPath, 'utf-8');
eval(projectJsContent);

describe('Group Enabled Sorting', () => {

    beforeEach(() => {
        global.projectSamples = [];
        vi.clearAllMocks();
    });

    it('should sort samples by Group Name then Sample Name', () => {
        global.projectSamples = [
            { id: '1', name: 'Zebra', group: 'Mammals' },
            { id: '2', name: 'Albatross', group: 'Birds' },
            { id: '3', name: 'Bear', group: 'Mammals' },
            { id: '4', name: 'Crow', group: 'Birds' }
        ];

        window.sortSamplesAZ();

        // Expected Order:
        // Birds -> Albatross
        // Birds -> Crow
        // Mammals -> Bear
        // Mammals -> Zebra

        expect(global.projectSamples[0].name).toBe('Albatross');
        expect(global.projectSamples[1].name).toBe('Crow');
        expect(global.projectSamples[2].name).toBe('Bear');
        expect(global.projectSamples[3].name).toBe('Zebra');
    });

    it('should handle mixed casing in groups', () => {
        global.projectSamples = [
            { id: '1', name: 'A', group: 'b' },
            { id: '2', name: 'B', group: 'A' }
        ];

        window.sortSamplesAZ();

        // A < b (case insensitive group sort)
        expect(global.projectSamples[0].group).toBe('A');
        expect(global.projectSamples[1].group).toBe('b');
    });

});
