/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/state.js';
import '../js/io.js';

describe('IO Operations', () => {
    beforeEach(() => {
        // Setup Mocks
        window.img = { src: "data:image/png;base64,mock" }; // Mock loaded image
        window.items = [];
        window.projectSamples = []; // Fix: Initialize projectSamples
        window.isCalibrated = false;
        window.syncState = vi.fn();
        window.showInputDialog = vi.fn();
        window.alert = vi.fn();

        // Mock URL.createObjectURL
        window.URL.createObjectURL = vi.fn(() => "blob:mock-url");

        // Mock Anchor Click
        window.HTMLAnchorElement.prototype.click = vi.fn();

        // Mock Helper Functions
        window.getUniqueName = vi.fn((name) => name);
    });

    it('saveSingleSample should prompt for name and download', () => {
        window.saveSingleSample();

        expect(window.showInputDialog).toHaveBeenCalled();
        const args = window.showInputDialog.mock.calls[0];
        const callback = args[3];

        // Simulate User Input
        callback("MyFile");

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        // We can't easily check the blob content in this mocked env without FileReader,
        // but we verify the flow reached the download trigger.
    });

    it('saveSingleSample should alert if no image', () => {
        window.img = { src: "" };
        window.saveSingleSample();
        expect(window.alert).toHaveBeenCalledWith("No image loaded!");
        expect(window.showInputDialog).not.toHaveBeenCalled();
    });

    it('processSingleImport should show Custom Dialog for group selection', () => {
        window.showCustomDialog = vi.fn();
        window.isDuplicateName = vi.fn(() => false);
        window.initNewSample = vi.fn((name) => ({ name, id: name, items: [], metadata: {} }));

        const mockData = { items: [] };
        window.processSingleImport("ImportedFile", mockData);

        expect(window.showCustomDialog).toHaveBeenCalled();
        const args = window.showCustomDialog.mock.calls[0];
        expect(args[0]).toBe("Import Sample");

        // Check buttons
        const buttons = args[2];
        const newGroupBtn = buttons.find(b => b.label.includes("Create <b>New Group</b>"));
        expect(newGroupBtn).toBeDefined();

        // Trigger "Create New Group" action
        // It should call prompt (which we replaced with showInputDialog)
        newGroupBtn.onClick();

        // Wait, processSingleImport uses showInputDialog inside the onClick?
        // Let's check the implementation.
        // Yes: onClick: () => { showInputDialog(...) }

        // So we expect showInputDialog to be called now
        expect(window.showInputDialog).toHaveBeenCalled();
    });
});
