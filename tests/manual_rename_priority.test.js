
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mocks
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Define Mock Data and Functions
global.projectSamples = [];
global.activeSampleId = null;
global.renderSampleList = vi.fn();
global.isDuplicateName = vi.fn(() => false);

// Mock parseFilename (simplified version of utils.js)
global.parseFilename = (name) => {
    let clean = name.replace(/_\d+$/, ''); // Strip _2, _3
    return { id: clean.toUpperCase() }; // Simulate uppercasing
};
global.window.parseFilename = global.parseFilename;

// Helper to load project.js logic
const fs = require('fs');
const path = require('path');
const projectJsPath = path.resolve(__dirname, '../js/project.js');
const projectJsContent = fs.readFileSync(projectJsPath, 'utf-8');
eval(projectJsContent);

// Mock showEditSampleDialog (simulates UI callback)
global.showEditSampleDialog = (sample, onConfirm) => {
    // Simulate user editing: 
    // Case 1: Rename "OldName" -> "NewName"
    // Case 2: Keep "OldName" but expect ID fix

    // We'll control this via a specific test setup or by patching this function in the test
};

describe('Manual Rename SpecimenID Priority', () => {

    beforeEach(() => {
        global.projectSamples = [];
        vi.clearAllMocks();
    });

    it('should update specimenId when name changes (Standard case)', () => {
        const s = {
            id: '1', name: 'OldName',
            metadata: { specimenId: 'OLDNAME' }
        };
        global.projectSamples = [s];

        // Override dialog mock for this test
        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'NewName',
                metadata: { specimenId: 'OLDNAME' } // UI passes back old ID
            });
        };

        window.editSampleMetadata('1');

        expect(global.projectSamples[0].name).toBe('NewName');
        expect(global.projectSamples[0].metadata.specimenId).toBe('NEWNAME');
    });

    it('should update specimenId even if name does NOT change (Fixing stale ID)', () => {
        // User opens dialog, changes nothing (or other metadata), clicks Save.
        // If ID was wrong (e.g. from bad load), it should self-correct.
        const s = {
            id: '2', name: 'FixedName',
            metadata: { specimenId: 'WRONG_ID' }
        };
        global.projectSamples = [s];

        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'FixedName', // No name change
                metadata: { specimenId: 'WRONG_ID' }
            });
        };

        window.editSampleMetadata('2');

        expect(global.projectSamples[0].name).toBe('FixedName');
        expect(global.projectSamples[0].metadata.specimenId).toBe('FIXEDNAME');
    });

    it('should strip suffixes from specimenId during rename', () => {
        const s = {
            id: '3', name: 'Sample',
            metadata: { specimenId: 'SAMPLE' }
        };
        global.projectSamples = [s];

        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'Sample_2', // Rename to replicate
                metadata: { specimenId: 'SAMPLE' }
            });
        };

        window.editSampleMetadata('3');

        expect(global.projectSamples[0].name).toBe('Sample_2');
        // ID should remain SAMPLE (or match parseFilename('Sample_2') -> SAMPLE)
        expect(global.projectSamples[0].metadata.specimenId).toBe('SAMPLE');
    });

});
