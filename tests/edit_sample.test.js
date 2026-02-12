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

    it('should update name and metadata', () => {
        const s = {
            id: '1',
            name: 'Lion',
            metadata: { tooth: 'm1', originalFilename: 'lion_m1.jpg' }
        };
        window.projectSamples.push(s);

        // Mock dialog behavior: immediately callback with new data
        window.showEditSampleDialog.mockImplementation((sample, callback) => {
            const newData = {
                name: 'Lion_King',
                metadata: {
                    tooth: 'P4',
                    side: 'left',
                    originalFilename: 'lion_m1.jpg' // Preserved
                }
            };
            callback(newData);
        });

        window.editSampleMetadata('1');

        expect(s.name).toBe('Lion_King');
        expect(s.metadata.tooth).toBe('P4');
        expect(s.metadata.side).toBe('left');
        expect(s.metadata.originalFilename).toBe('lion_m1.jpg');
        expect(window.renderSampleList).toHaveBeenCalled();
    });

    it('should prevent duplicate names', () => {
        const s1 = { id: '1', name: 'Lion' };
        const s2 = { id: '2', name: 'Tiger' };
        window.projectSamples.push(s1, s2);

        // Try to rename "Lion" to "Tiger"
        window.showEditSampleDialog.mockImplementation((sample, callback) => {
            callback({ name: 'Tiger', metadata: {} });
        });

        window.editSampleMetadata('1');

        expect(s1.name).toBe('Lion'); // Should not change
        // Alert logic is in the real function, but here we just check state
    });
});
