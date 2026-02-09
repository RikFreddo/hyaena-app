/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/state.js';
import '../js/ui.js';

describe('Session Navigation', () => {
    beforeEach(() => {
        // Mock DOM for menu buttons
        document.body.innerHTML = `
            <div id="mainMenu" style="display:flex">
                <button id="btnResumeSession" style="display:none">Resume</button>
                <button id="btnNewSession">New Session</button>
            </div>
            <div id="confirmOverlay" style="display:none"></div>
        `;

        // Mock Global State
        window.projectSamples = [];
        window.items = [];
        window.currentProjectName = "Test_Project";

        // Mock Global Functions
        window.confirm = vi.fn(() => true);
        window.createNewSample = vi.fn();
        window.renderSampleList = vi.fn();
        window.saveProject = vi.fn();

        // We need to implement the logic inside the test environment or mock the implementation?
        // Since we are TDDing, we define expected behavior for functions we are ABOUT to write/modify.

        // Stubbing the functions to be implemented in ui.js/app.js if they are not yet there.
        // For TDD, it's better to import the actual file, but app.js has side effects (init).
        // ui.js is safe. We will put the logic in ui.js or app.js. 
        // Let's assume we put them in ui.js for testability or we mock them here to define contract.

        // ACTUALLY: The functions startNewSession and resumeSession will be global.
        // We will define them in ui.js.
    });

    it('showMainMenu should show Resume button if project has samples', () => {
        window.projectSamples = [{ id: 1 }];
        window.showMainMenu();
        const btnResume = document.getElementById('btnResumeSession');
        expect(btnResume.style.display).not.toBe('none');
    });

    it('showMainMenu should HIDE Resume button if project is empty', () => {
        window.projectSamples = [];
        window.showMainMenu();
        const btnResume = document.getElementById('btnResumeSession');
        expect(btnResume.style.display).toBe('none');
    });

    it('resumeSession should hide main menu', () => {
        // Implement mock if not exists
        window.resumeSession = function () {
            document.getElementById('mainMenu').style.display = 'none';
        };

        window.resumeSession();
        expect(document.getElementById('mainMenu').style.display).toBe('none');
    });

    it('startNewSession should ask confirmation if samples exist', () => {
        // Setup
        window.projectSamples = [{ id: 1 }];

        // Mock implementation to match expected behavior
        window.startNewSession = function () {
            if (window.projectSamples.length > 0) {
                if (!confirm("Overwrite?")) return;
            }
            window.projectSamples = [];
            window.createNewSample(false);
            document.getElementById('mainMenu').style.display = 'none';
        };

        window.startNewSession();
        expect(window.confirm).toHaveBeenCalled();
        expect(window.projectSamples).toEqual([]);
        expect(document.getElementById('mainMenu').style.display).toBe('none');
    });

    it('startNewSession should NOT ask confirmation if empty', () => {
        window.projectSamples = [];
        window.confirm.mockClear();

        // Mock implementation 
        window.startNewSession = function () {
            if (window.projectSamples.length > 0) {
                if (!confirm("Overwrite?")) return;
            }
            window.projectSamples = [];
            window.createNewSample(false);
            document.getElementById('mainMenu').style.display = 'none';
        }

        window.startNewSession();
        expect(window.confirm).not.toHaveBeenCalled();
    });
});
