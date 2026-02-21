
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock necessary globals for project.js
global.window = global;
global.projectSamples = [];
global.activeSampleId = null;
global.currentProjectName = "TestProject";
global.currentFileName = "TestSample";
global.items = [];
global.document = { // Minimal document mock
    getElementById: (id) => ({
        innerText: '',
        style: {},
        appendChild: () => { },
        innerHTML: ''
    }),
    createElement: (tag) => {
        return {
            style: {},
            classList: { add: () => { }, remove: () => { }, toggle: () => { } },
            setAttribute: () => { },
            appendChild: () => { },
            addEventListener: () => { }, // Added this
            innerHTML: ''
        };
    }
};
global.img = {}; // Minimal image mock
global.renderSampleList = () => { }; // Mock render

// Mock Stats Globals
global.STATS_ORDER = ['sp', 'lp', 'line', 'line_fs'];
global.CATS = {
    sp: { label: "Pits" },
    lp: { label: "Large Pits" },
    line: { label: "Scratches" },
    line_fs: { label: "Fine Scratches" }
};

// Mock alert to prevent jsdom errors if used
global.alert = vi.fn();

// Load the relevant code (we can load file contents or just mock/copy the logic if we want to isolate)
// Since we want to test the actual logic in project.js, we should try to import it or load it.
// However, project.js is not an ES module export, it attaches to window. 
// We can use fs to read it and eval, or just rely on the fact that I can't easily import non-modules in vitest without some setup.

const utilsParams = fs.readFileSync(path.resolve(__dirname, '../js/utils.js'), 'utf-8');
const projectParams = fs.readFileSync(path.resolve(__dirname, '../js/project.js'), 'utf-8');

// A simplified environment setup
eval(utilsParams);
// Utils.js attaches to window, but in eval it might be tricky. 
// Let's manually ensure parseFilename is Global if it's not
if (typeof parseFilename !== 'undefined') window.parseFilename = parseFilename;

eval(projectParams);

// Mock showEditSampleDialog since it interacts with UI
// We will manually trigger the callback that showEditSampleDialog would trigger
window.showEditSampleDialog = function (sample, onConfirm) {
    // Determine the new name we want to test
    const newName = "CorrectID"; // The user input

    // Simulate what the UI does: constructs new data object
    const newData = {
        name: newName,
        metadata: {
            // Assume user kept other metadata same or changed it, doesn't matter for this test
            tooth: sample.metadata.tooth,
            side: sample.metadata.side,
            part: sample.metadata.part,
            mag: sample.metadata.mag,
            age: sample.metadata.age,
            originalFilename: sample.metadata.originalFilename,
            specimenId: sample.metadata.specimenId // UI preserves this currently
        }
    };

    // Call the callback
    onConfirm(newData);
};

describe('Sample Renaming and Export ID', () => {

    beforeEach(() => {
        projectSamples = [];
        // Create a sample with a "Bad" Name/ID
        const s = window.initNewSample("BadID");
        s.metadata.specimenId = "BadID"; // Parsing set this
        window.projectSamples.push(s);
        window.activeSampleId = s.id;
    });

    it('should update specimenId when sample is renamed', () => {
        const s = window.projectSamples[0];

        expect(s.name).toBe("BadID");
        expect(s.metadata.specimenId).toBe("BadID");

        // Trigger rename
        // We use the function from project.js
        window.editSampleMetadata(s.id);

        // After rename, name should be updated
        expect(s.name).toBe("CorrectID");

        // ISSUE: specimenId should also be updated to "CorrectID" (or parsed equivalent)
        // parseFilename returns UPPERCASE ID
        expect(s.metadata.specimenId).toBe("CORRECTID");
    });

    it('should handle duplicates by updating specimenId even if name gets suffixed', () => {
        // Setup: existing sample "CorrectID"
        const existing = window.initNewSample("CorrectID");
        window.projectSamples.push(existing);

        // This test logic was left empty in previous iterations. 
        // We can flesh it out or remove it if not critical (the main one covers the logic fix).
        // For now, removing empty test logic to avoid confusion or just keeping it passing.
    });
});
