/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Setup global environment placeholders
// We need to load state.js and consts.js before project.js
import '../js/state.js';
import '../js/consts.js';
import '../js/project.js'; // This attaches initNewSample, createNewSample, etc. to window

describe('Project Management', () => {
    beforeEach(() => {
        // Reset global state
        window.projectSamples = [];
        window.activeSampleId = null;
        window.currentProjectName = "Test Project";
        window.items = [];
        window.historyStack = [];
        window.redoStack = [];

        // Mocks
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => "Test Sample");
        window.renderSampleList = vi.fn();
        window.loadSampleIntoView = vi.fn();
        window.redraw = vi.fn();
        window.saveHistory = vi.fn();
        window.resetHistory = vi.fn();
        window.syncState = vi.fn();
        window.showCustomDialog = vi.fn();

        // Mock DOM elements if needed
        document.body.innerHTML = `
            <div id="sampleList"></div>
            <div id="headerTitle"></div>
            <div id="msgSampleName"></div>
            <div id="stats-bar"></div>
            <div id="noImageMsg"></div>
            <div id="cvs"></div>
            <div id="mainMenu"></div>
        `;
    });

    it('should initialize a new sample correctly', () => {
        const sample = window.initNewSample('My Sample');
        expect(sample.name).toBe('My Sample');
        expect(sample.id).toBeDefined();
        expect(sample.items).toEqual([]);
        expect(sample.group).toBe('Default');
    });

    it('should add a sample to the project', () => {
        const sample = window.initNewSample('Sample A');
        window.addSampleToProject(sample);
        expect(window.projectSamples).toHaveLength(1);
        expect(window.projectSamples[0]).toBe(sample);
    });

    it('should detect duplicate names', () => {
        const sample = window.initNewSample('Sample A');
        window.addSampleToProject(sample);
        expect(window.isDuplicateName('Sample A')).toBe(true);
        expect(window.isDuplicateName('Sample B')).toBe(false);
    });

    it('should delete a sample', () => {
        const sample = window.initNewSample('Sample A');
        window.addSampleToProject(sample);
        window.activeSampleId = sample.id;

        window.deleteSample(sample.id);

        expect(window.projectSamples).toHaveLength(0);
        expect(window.activeSampleId).toBeNull();
    });

    it('should rename a sample', () => {
        const sample = window.initNewSample('Old Name');
        window.addSampleToProject(sample);

        window.prompt.mockReturnValueOnce('New Name');
        window.renameSample(sample.id);

        expect(sample.name).toBe('New Name');
        expect(window.renderSampleList).toHaveBeenCalled();
    });
});
