/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/state.js';
import '../js/project.js';

describe('Project Logic Flow', () => {
    beforeEach(() => {
        window.projectSamples = [];
        window.activeSampleId = null;
        window.items = [];
        window.syncState = vi.fn();
        window.renderSampleList = vi.fn();
        window.loadSampleIntoView = vi.fn();
        window.showInputDialog = vi.fn(); // Mock UI
        window.alert = vi.fn();
    });

    it('finalizeCreateSample should add sample and switch view', () => {
        window.finalizeCreateSample("New Sample", "New Group");

        expect(window.projectSamples).toHaveLength(1);
        expect(window.projectSamples[0].name).toBe("New Sample");
        expect(window.projectSamples[0].group).toBe("New Group");
        expect(window.loadSampleIntoView).toHaveBeenCalledWith(window.projectSamples[0].id);
        expect(window.renderSampleList).toHaveBeenCalled();
    });

    it('finalizeCreateSample should generate unique name on duplicate', () => {
        window.projectSamples = [{ name: "Existing", id: "1", group: "G" }];

        // Mock getUniqueName Logic (since it's a window function usually in utils or project)
        // If getting "Existing", should return "Existing_2"
        window.getUniqueName = vi.fn((name) => name === "Existing" ? "Existing_2" : name);

        window.finalizeCreateSample("Existing", "G2");

        expect(window.alert).not.toHaveBeenCalled();
        expect(window.projectSamples).toHaveLength(2);
        expect(window.projectSamples[1].name).toBe("Existing_2");
    });

    it('askForSampleName should call showInputDialog with correct callback', () => {
        window.askForSampleName("MyGroup");

        expect(window.showInputDialog).toHaveBeenCalled();
        const args = window.showInputDialog.mock.calls[0];
        expect(args[1]).toContain("MyGroup"); // Message contains group name

        // Test Validation Callback logic
        // We can manually invoke the callback passed to showInputDialog to see if it triggers finalize
        const callback = args[3];

        const finalizeSpy = vi.spyOn(window, 'finalizeCreateSample');
        callback("My New Sample");

        expect(finalizeSpy).toHaveBeenCalledWith("My New Sample", "MyGroup");
    });
});
