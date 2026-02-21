
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock DOM
document.body.innerHTML = `
    <div id="sampleList"></div>
    <div id="msgSampleName"></div>
    <div id="headerTitle"></div>
    <ul id="sampleList"></ul>
`;

// Load Scripts manually since we don't have a build step
const projectPath = path.resolve(__dirname, '../js/project.js');
const utilsPath = path.resolve(__dirname, '../js/utils.js');
const uiPath = path.resolve(__dirname, '../js/ui.js');
const constsPath = path.resolve(__dirname, '../js/consts.js');

const projectScript = fs.readFileSync(projectPath, 'utf8');
const utilsScript = fs.readFileSync(utilsPath, 'utf8');
const constsScript = fs.readFileSync(constsPath, 'utf8');

// Minimal UI mock needed for showCustomDialog
window.showCustomDialog = vi.fn();
window.renderSampleList = vi.fn();

// Execute Scripts
eval(constsScript);
eval(utilsScript);
// Initialize projectSamples before eval project.js as it relies on it?
// Actually project.js declares projectSamples usually?
// Let's check if project.js declares it or if app.js does.
// Usually app.js -> window.projectSamples = [];
window.projectSamples = [];
window.activeSampleId = null;
window.currentProjectName = "TestProject";
eval(projectScript);

describe('Regenerate Metadata & Renaming', () => {

    beforeEach(() => {
        window.projectSamples = [];
        window.activeSampleId = null;
        vi.clearAllMocks();
    });

    it('should rename a sample based on its filename (Clean ID)', () => {
        const s = window.initNewSample("ZMP_Mam_12801_P4_met_350x");
        // Simulate original filename stored (importer usually does this)
        s.metadata.originalFilename = "ZMP_Mam_12801_P4_met_350x";
        window.projectSamples.push(s);

        // Execute logic directly (internal function performRegeneration)
        window.performRegeneration();

        const updatedSample = window.projectSamples[0];
        // Expect Uppercase Clean ID
        expect(updatedSample.name).toBe("ZMP_MAM_12801");
        // Metadata parsed
        expect(updatedSample.metadata.tooth).toBe("P4");
        expect(updatedSample.metadata.part).toBe("met");
    });

    it('should handle replicates by adding numeric suffix', () => {
        // Two samples with filenames that resolve to same ID
        const s1 = window.initNewSample("ZMP_Mam_12801_P4_met_350x");
        s1.metadata.originalFilename = "ZMP_Mam_12801_P4_met_350x";

        // This one might have diff mag but same specimen
        const s2 = window.initNewSample("ZMP_Mam_12801_P4_met_100x");
        s2.metadata.originalFilename = "ZMP_Mam_12801_P4_met_100x";

        window.projectSamples.push(s1);
        window.projectSamples.push(s2);

        window.performRegeneration();

        const u1 = window.projectSamples[0];
        const u2 = window.projectSamples[1];

        // First one stays clean
        expect(u1.name).toBe("ZMP_MAM_12801");

        // Second one gets suffix because "ZMP_MAM_12801" already exists
        expect(u2.name).toBe("ZMP_MAM_12801_2");
    });

    it('should use getUniqueName correctly', () => {
        // Manually test the helper
        window.projectSamples = [{ id: '1', name: 'TEST' }];

        const unique1 = window.getUniqueName("TEST");
        expect(unique1).toBe("TEST_2");

        window.projectSamples.push({ id: '2', name: 'TEST_2' });
        const unique2 = window.getUniqueName("TEST");
        expect(unique2).toBe("TEST_3");
    });

    it('should not rename if ID is already correct (Stability)', () => {
        const s = window.initNewSample("ZMP_MAM_12801");
        s.metadata.originalFilename = "ZMP_Mam_12801_P4_met_350x";
        window.projectSamples.push(s);

        window.performRegeneration();

        expect(window.projectSamples[0].name).toBe("ZMP_MAM_12801");
    });
});
