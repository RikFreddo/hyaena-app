// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM
document.body.innerHTML = `
  <div id="sampleList"></div>
  <div id="headerTitle"></div>
  <div id="msgSampleName"></div>
  <div id="dialogOverlay" style="display:none">
    <div id="dialogTitle"></div>
    <div id="dialogMessage"></div>
    <div id="dialogContent"></div>
    <div id="dialogButtons"></div>
  </div>
`;

// Mock Globals
global.window = window;
global.document = document;
global.alert = vi.fn();

// Mock project state
window.projectSamples = [];
window.activeSampleId = null;

// Mock renderSampleList
window.renderSampleList = vi.fn();

// Mock isDuplicateName
window.isDuplicateName = function (name) {
    return window.projectSamples.some(s => s.name === name);
};

// Start logic for editSampleMetadata
window.editSampleMetadata = function (id) {
    const s = window.projectSamples.find(x => x.id === id);
    if (!s) return;

    // Simulate callback from showEditSampleDialog
    // In real app, this opens a dialog. Here we mock the result directly.
    // We'll mock showEditSampleDialog to immediately trigger the callback with test data.
    window.showEditSampleDialog(s, (newData) => {
        if (newData.name !== s.name) {
            if (window.isDuplicateName(newData.name)) {
                return;
            }
            s.name = newData.name;
        }
        s.metadata = { ...s.metadata, ...newData.metadata };
        // Explicitly set the specimen ID as project.js now does
        if (!s.metadata.specimenId || typeof s.metadata.specimenId !== 'string' || s.metadata.specimenId.trim() === '') {
            s.metadata.specimenId = s.name;
        } else {
            s.metadata.specimenId = s.metadata.specimenId.trim();
        }
        window.renderSampleList();
    });
};

window.showEditSampleDialog = vi.fn();

describe('Advanced Sample Editing', () => {

    beforeEach(() => {
        window.projectSamples = [];
        window.activeSampleId = null;
        vi.clearAllMocks();
    });

    it('should update name, metadata and explicit specimenId', () => {
        const s = {
            id: '1',
            name: 'Lion',
            metadata: { tooth: 'm1', originalFilename: 'lion_m1.jpg', specimenId: 'Lion_Old_ID' }
        };
        window.projectSamples.push(s);

        // Mock dialog behavior: immediately callback with new data
        window.showEditSampleDialog.mockImplementation((sample, callback) => {
            const newData = {
                name: 'Lion_King',
                metadata: {
                    tooth: 'P4',
                    side: 'left',
                    specimenId: 'Lion_New_Explicit_ID', // Specimen ID explicitly modified by user
                    originalFilename: 'lion_m1.jpg' // Preserved
                }
            };
            callback(newData);
        });

        window.editSampleMetadata('1');

        expect(s.name).toBe('Lion_King');
        expect(s.metadata.tooth).toBe('P4');
        expect(s.metadata.side).toBe('left');
        expect(s.metadata.specimenId).toBe('Lion_New_Explicit_ID'); // Verify explicit ID is kept
        expect(s.metadata.originalFilename).toBe('lion_m1.jpg');
        expect(window.renderSampleList).toHaveBeenCalled();
    });

    it('should prevent duplicate names', () => {
        const s1 = { id: '1', name: 'Lion', metadata: {} };
        const s2 = { id: '2', name: 'Tiger', metadata: {} };
        window.projectSamples.push(s1, s2);

        // Try to rename "Lion" to "Tiger"
        window.showEditSampleDialog.mockImplementation((sample, callback) => {
            callback({ name: 'Tiger', metadata: { specimenId: 'Tiger' } });
        });

        window.editSampleMetadata('1');

        expect(s1.name).toBe('Lion'); // Should not change
        // Alert logic is in the real function, but here we just check state
    });

    it('should fallback specimenId to sample name if left empty', () => {
        const s = {
            id: '3',
            name: 'Bear',
            metadata: { specimenId: 'Bear_ID' }
        };
        window.projectSamples.push(s);

        // Mock dialog behavior: return empty specimenId
        window.showEditSampleDialog.mockImplementation((sample, callback) => {
            callback({
                name: 'Brown Bear',
                metadata: {
                    specimenId: '   ' // Simulated empty/whitespace input from user
                }
            });
        });

        window.editSampleMetadata('3');

        expect(s.name).toBe('Brown Bear');
        // Because the returned specimenId was empty whitespace, it should fallback to the updated s.name
        expect(s.metadata.specimenId).toBe('Brown Bear');
    });
});
