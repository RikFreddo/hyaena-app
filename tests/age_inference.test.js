/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Setup global environment
import '../js/consts.js';
import '../js/state.js';
import '../js/project.js'; // Helper for renderSampleList

describe('Age Inference Logic (UI Display)', () => {
    beforeEach(() => {
        // Reset global state
        window.projectSamples = [];
        window.activeSampleId = null;
        window.currentProjectName = "Test Project";
        window.STATS_ORDER = ['sp', 'pp', 'lp', 'line'];
        window.CATS = {
            sp: { label: 'Small Pits' },
            pp: { label: 'Large Pits' },
            lp: { label: 'Large Pits' },
            line: { label: 'Scratches' }
        };

        // Mock DOM elements
        document.body.innerHTML = `
            <ul id="sampleList"></ul>
            <div id="sidebar"></div>
            <div id="mainMenu"></div>
        `;

        // Mock other functions called by renderSampleList
        window.loadSampleIntoView = vi.fn();
    });

    it('should default to "A" when Age is empty', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = ""; // Empty
        sample.metadata.tooth = "";
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ A'); // Should default to A
    });

    it('should default to "A" when Age is whitespace', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = "   "; // Whitespace
        sample.metadata.tooth = "";
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ A'); // Should treat as empty -> A
    });

    it('should infer "J" when Tooth starts with "d"', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = "";
        sample.metadata.tooth = "dp4"; // Deciduous
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ J');
    });

    it('should infer "J" when Tooth starts with "D" (Case Insensitive)', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = "";
        sample.metadata.tooth = "D3"; // Deciduous
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ J');
    });

    it('should infer "A" when Tooth is permanent (e.g., m1)', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = "";
        sample.metadata.tooth = "m1"; // Permanent
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ A');
    });

    it('should respect explicit Age if set (not whitespace)', () => {
        const sample = window.initNewSample('Sample 1');
        sample.metadata.age = "Old";
        sample.metadata.tooth = "dp4"; // Even if tooth implies J
        window.projectSamples = [sample];

        window.renderSampleList();

        const li = document.querySelector('.sample-item');
        expect(li.innerHTML).toContain('⏳ Old'); // Explicit wins
    });
});
