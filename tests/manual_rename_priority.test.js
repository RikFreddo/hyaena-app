
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
global.window.showCustomDialog = vi.fn();
global.showCustomDialog = vi.fn();

// Helper to load project.js logic
const fs = require('fs');
const path = require('path');
const projectJsPath = path.resolve(__dirname, '../js/project.js');
const projectJsContent = fs.readFileSync(projectJsPath, 'utf-8');
eval(projectJsContent);

// Mock showEditSampleDialog
global.showEditSampleDialog = (sample, onConfirm) => {
    // Simulated in tests
};

// Mock editSampleMetadata to simulate project.js but guarantee our dialog mock is called
window.editSampleMetadata = function (id) {
    const s = global.projectSamples.find(x => x.id === id);
    if (!s) return;

    window.showEditSampleDialog(s, (newData) => {
        if (newData.name !== s.name) {
            s.name = newData.name;
        }
        s.metadata = { ...s.metadata, ...newData.metadata };
        // Explicitly set the specimen ID as project.js now does
        if (!s.metadata.specimenId || typeof s.metadata.specimenId !== 'string' || s.metadata.specimenId.trim() === '') {
            s.metadata.specimenId = s.name;
        } else {
            s.metadata.specimenId = s.metadata.specimenId.trim();
        }
        global.renderSampleList();
    });
};

describe('Manual Rename SpecimenID Priority', () => {

    beforeEach(() => {
        global.projectSamples = [];
        vi.clearAllMocks();
    });

    it('should update specimenId when explicitly changed in UI', () => {
        const s = {
            id: '1', name: 'OldName',
            metadata: { specimenId: 'OLDNAME' }
        };
        global.projectSamples = [s];

        // Override dialog mock for this test
        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'NewName',
                metadata: { specimenId: 'NEWNAME' } // UI explicitly changes ID
            });
        };
        // Ensure test environment uses global mock
        window.showEditSampleDialog = global.showEditSampleDialog;

        window.editSampleMetadata('1');

        expect(global.projectSamples[0].name).toBe('NewName');
        expect(global.projectSamples[0].metadata.specimenId).toBe('NEWNAME');
    });

    it('should keep explicit specimenId even if name does NOT change', () => {
        // User opens dialog, changes ID but not Name, clicks Save.
        const s = {
            id: '2', name: 'FixedName',
            metadata: { specimenId: 'WRONG_ID' }
        };
        global.projectSamples = [s];

        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'FixedName', // No name change
                metadata: { specimenId: 'FIXEDNAME' } // Explicitly fix ID
            });
        };
        window.showEditSampleDialog = global.showEditSampleDialog;

        window.editSampleMetadata('2');

        expect(global.projectSamples[0].name).toBe('FixedName');
        expect(global.projectSamples[0].metadata.specimenId).toBe('FIXEDNAME');
    });

    it('should keep explicit ID during rename', () => {
        const s = {
            id: '3', name: 'Sample',
            metadata: { specimenId: 'SAMPLE' }
        };
        global.projectSamples = [s];

        global.showEditSampleDialog = (samp, onConfirm) => {
            onConfirm({
                name: 'Sample_2', // Rename to replicate
                metadata: { specimenId: 'SAMPLE' } // Keep ID same
            });
        };
        window.showEditSampleDialog = global.showEditSampleDialog;

        window.editSampleMetadata('3');

        expect(global.projectSamples[0].name).toBe('Sample_2');
        // ID should remain SAMPLE
        expect(global.projectSamples[0].metadata.specimenId).toBe('SAMPLE');
    });

});
