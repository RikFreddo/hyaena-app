/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/ui.js';

describe('UI Interactions', () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="mainMenu" style="display:none"></div>
            <div id="dialogOverlay" style="display:none">
                <div id="dialogTitle"></div>
                <div id="dialogMessage"></div>
                <div id="dialogContent"></div>
                <div id="dialogButtons"></div>
            </div>
            <div id="statsModalOverlay" style="display:none"></div>
        `;

        // Mock global functions called by UI
        window.syncState = vi.fn();
        window.getStatsFromItems = vi.fn(() => ({
            crushingIndex: 0, percLargePits: 0, anisotropy: 0, meanOrient: 0,
            bgAbrasion: 0, severityTotal: 0, meanFeatureSeverity: 0, durophagyIndex: 0,
            pitHet: 0, scratchHet: 0, globalHet: 0
        }));
    });

    it('showMainMenu should display the menu', () => {
        window.showMainMenu();
        const menu = document.getElementById('mainMenu');
        expect(menu.style.display).toBe('flex');
    });

    it('closeStatsModal should hide the modal', () => {
        const modal = document.getElementById('statsModalOverlay');
        modal.style.display = 'flex';
        window.closeStatsModal();
        expect(modal.style.display).toBe('none');
    });

    it('showInputDialog should create input and handle OK callback', () => {
        const callback = vi.fn();
        window.showInputDialog("Title", "Message", "Default", callback);

        // Verify Input Created
        const input = document.getElementById('customDialogInput');
        expect(input).not.toBeNull();
        expect(input.value).toBe("Default");

        // Simulate OK Click
        // showCustomDialog logic is inside showInputDialog, 
        // we need to simulate the button click created by showCustomDialog logic 
        // OR mock showCustomDialog if we want to test isolation.
        // But ui.js implements showCustomDialog directly.

        const buttons = document.getElementById('dialogButtons').querySelectorAll('button');
        const okBtn = Array.from(buttons).find(b => b.innerHTML === 'OK');

        expect(okBtn).toBeDefined();

        // Change input value
        input.value = "New Value";
        okBtn.click();

        expect(callback).toHaveBeenCalledWith("New Value");

        // Verify overlay hidden (handled by showCustomDialog but let's check logic flow)
        // actually showCustomDialog sets display='flex'
        // the button click sets display='none'
        const overlay = document.getElementById('dialogOverlay');
        expect(overlay.style.display).toBe('none');
    });

    it('showInputDialog should handle Cancel callback', () => {
        const callback = vi.fn();
        window.showInputDialog("Title", "Message", "Default", callback);

        const buttons = document.getElementById('dialogButtons').querySelectorAll('button');
        const cancelBtn = Array.from(buttons).find(b => b.innerHTML === 'Cancel');

        cancelBtn.click();

        expect(callback).toHaveBeenCalledWith(null);
    });
});
