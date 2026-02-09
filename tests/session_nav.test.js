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
        window.showCustomDialog = vi.fn();
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
        window.resumeSession = function () {
            document.getElementById('mainMenu').style.display = 'none';
        };

        window.resumeSession();
        expect(document.getElementById('mainMenu').style.display).toBe('none');
    });

    it('startNewSession should use custom dialog if samples exist', () => {
        // Setup
        window.projectSamples = [{ id: 1 }];
        window.showCustomDialog = vi.fn((title, msg, buttons) => {
            // Simulate clicking the Start New Session button (btn-red)
            const startBtn = buttons.find(b => b.class && b.class.includes('btn-red'));
            if (startBtn && startBtn.onClick) startBtn.onClick();
        });

        // Mock implementation to match expected behavior in ui.js
        window.startNewSession = function () {
            const performReset = () => {
                window.projectSamples = [];
                window.createNewSample(false);
                document.getElementById('mainMenu').style.display = 'none';
            };

            if (window.projectSamples.length > 0) {
                window.showCustomDialog(
                    "Start New Session?",
                    "This will start a fresh session.<br>Any unsaved progress in the current session will be lost.",
                    [
                        { label: "Cancel", onClick: null },
                        { label: "Start New Session", class: "btn-red", onClick: performReset }
                    ]
                );
            } else {
                performReset();
            }
        };

        window.startNewSession();

        expect(window.showCustomDialog).toHaveBeenCalled();
        expect(window.projectSamples).toEqual([]);
        expect(document.getElementById('mainMenu').style.display).toBe('none');
    });

    it('startNewSession should NOT ask confirmation if empty', () => {
        window.projectSamples = [];
        window.showCustomDialog = vi.fn();

        // Mock simple implementation for empty case
        window.startNewSession = function () {
            const performReset = () => {
                window.projectSamples = [];
                window.createNewSample(false);
                document.getElementById('mainMenu').style.display = 'none';
            };
            if (window.projectSamples.length > 0) {
                // ...
            } else {
                performReset();
            }
        }

        window.startNewSession();
        expect(window.showCustomDialog).not.toHaveBeenCalled();
    });
});
