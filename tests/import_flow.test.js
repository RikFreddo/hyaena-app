/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/utils.js';
import '../js/project.js';
import '../js/io.js';

describe('Import Flow', () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="mainMenu" style="display:none;"></div>
            <div id="headerTitle"></div>
            <div id="cvs" style="display:none;"></div>
            <input id="preview_id" value="">
            <input id="preview_tooth" value="">
            <input id="preview_side" value="">
            <input id="preview_part" value="">
            <input id="preview_mag" value="">
        `;

        // Mock Globals
        window.projectSamples = [];
        window.activeSampleId = null;
        window.currentProjectName = 'Test_Project';
        window.items = [];
        window.currentFileName = '';
        window.loadImageFromFile = vi.fn();
        window.renderSampleList = vi.fn();
        window.loadSampleIntoView = vi.fn();
        window.showCustomDialog = vi.fn();
        window.showInputDialog = vi.fn();
        window.parseFilename = (name) => ({
            id: 'FSL_21',
            tooth: 'm1',
            side: 'buc',
            part: 'trig',
            mag: '350x',
            originalName: name
        }); // Mock parseFilename for stability or use real if available

        // Mock showImportPreviewDialog (crucial for this test)
        window.showImportPreviewDialog = vi.fn((meta, onConfirm, onCancel) => {
            // Simulate user confirming immediately with unmodified data
            // Or modified data
            onConfirm({
                id: meta.id,
                tooth: 'm2', // Edited
                side: meta.side,
                part: meta.part,
                mag: meta.mag,
                originalFilename: meta.originalName
            });
        });

        // Mock askGroupForImageImport to avoid sticking there
        window.askGroupForImageImport = vi.fn();
    });

    it('should trigger preview dialog on image load', () => {
        const file = { name: 'FSL_21.jpg', type: 'image/jpeg' };
        const event = { target: { files: [file], value: '' } };

        window.handleFileSelection(event);

        expect(window.showImportPreviewDialog).toHaveBeenCalled();
        const callArgs = window.showImportPreviewDialog.mock.calls[0][0];
        expect(callArgs.id).toBe('FSL_21');
    });

    it('should pass edited metadata to initNewSample', () => {
        const file = { name: 'FSL_21.jpg', type: 'image/jpeg' };
        const event = { target: { files: [file], value: '' } };

        // Spy on initNewSample to check arguments
        const spyInit = vi.spyOn(window, 'initNewSample');

        window.handleFileSelection(event);

        expect(spyInit).toHaveBeenCalled();
        const args = spyInit.mock.calls[0];
        expect(args[0]).toBe('FSL_21'); // ID
        expect(args[1].tooth).toBe('m2'); // Verified edit from mock above
    });

    it('should update existing sample if waitingForImage', () => {
        // Setup waiting state
        const sample = window.initNewSample('Sample_1');
        window.projectSamples = [sample];
        window.activeSampleId = sample.id;
        document.getElementById('cvs').style.display = 'none'; // waiting

        const file = { name: 'FSL_21.jpg', type: 'image/jpeg' };
        const event = { target: { files: [file], value: '' } };

        window.handleFileSelection(event);

        expect(sample.name).toBe('FSL_21');
        expect(sample.metadata.tooth).toBe('m2');
        expect(window.loadImageFromFile).toHaveBeenCalled();
    });

    it('should call renderSampleList when a new project is loaded', async () => {
        const projectData = {
            type: "hyaena_project",
            name: "Test_Imported_Project",
            samples: [{ id: '1', name: 'S1', group: 'G1', items: [] }]
        };
        const file = new File([JSON.stringify(projectData)], 'project.json', { type: 'application/json' });
        const event = { target: { files: [file], value: '' } };

        // Ensure project is empty
        window.projectSamples = [];
        window.renderSampleList.mockClear();

        window.handleFileSelection(event);

        // handleFileSelection uses FileReader, which is async. We need to wait a tick.
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(window.projectSamples.length).toBe(1);
        expect(window.currentProjectName).toBe("Test_Imported_Project");
        expect(window.renderSampleList).toHaveBeenCalled(); // The bug fix!
    });

    it('should handle older project files where items is missing or called features', async () => {
        const projectData = {
            type: "hyaena_project",
            name: "Legacy_Project",
            samples: [
                { id: '1', name: 'S1', group: 'G1', features: [{ catId: 'sp', x: 10, y: 10 }] }, // Uses 'features'
                { id: '2', name: 'S2', group: 'G1' } // Missing 'items' entirely
            ]
        };
        const file = new File([JSON.stringify(projectData)], 'legacy.json', { type: 'application/json' });
        const event = { target: { files: [file], value: '' } };

        window.projectSamples = [];
        window.renderSampleList.mockClear();

        window.handleFileSelection(event);

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(window.projectSamples.length).toBe(2);
        // Assert 'features' was mapped to 'items'
        expect(window.projectSamples[0].items.length).toBe(1);
        expect(window.projectSamples[0].items[0].catId).toBe('sp');
        // Assert missing 'items' is initialized to empty array
        expect(window.projectSamples[1].items).toEqual([]);
        expect(window.renderSampleList).toHaveBeenCalled(); // Ensure no crash blocked rendering
    });

    it('should ignore null samples in corrupted project files', async () => {
        const projectData = {
            type: "hyaena_project",
            name: "Corrupt_Project",
            samples: [
                { id: '1', name: 'Valid S1', group: 'G1', items: [] },
                null, // Simulate corruption / bad save
                { id: '3', name: 'Valid S3', group: 'G1', items: [] }
            ]
        };
        const file = new File([JSON.stringify(projectData)], 'corrupt.json', { type: 'application/json' });
        const event = { target: { files: [file], value: '' } };

        window.projectSamples = [];
        window.renderSampleList.mockClear();

        window.handleFileSelection(event);

        await new Promise(resolve => setTimeout(resolve, 50));

        // The null sample should have been filtered out
        expect(window.projectSamples.length).toBe(2);
        expect(window.projectSamples[0].name).toBe('Valid S1');
        expect(window.projectSamples[1].name).toBe('Valid S3');
        expect(window.renderSampleList).toHaveBeenCalled(); // Rendering should proceed normally
    });
});
