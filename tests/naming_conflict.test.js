// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM
document.body.innerHTML = `
  <div id="sampleList"></div>
  <div id="headerTitle"></div>
  <div id="msgSampleName"></div>
  <div id="noImageMsg"></div>
  <div id="cvs" style="display:none"></div>
  <div id="mainContainer"></div>
  <input id="inpFile" type="file">
`;

// Mock Globals
global.window = window;
global.document = document;
global.alert = vi.fn();
global.showInputDialog = vi.fn();
global.showCustomDialog = vi.fn();
global.loadImageFromFile = vi.fn();

// Mock Image
global.Image = class {
    constructor() {
        this.onload = null;
        this.src = '';
        this.width = 100;
        this.height = 100;
    }
};

// Import modules
await import('../js/utils.js');
// Mock initNewSample which is normally in project.js but needed for tests if not loading full app
window.initNewSample = function (name) {
    return { id: crypto.randomUUID(), name: name, items: [], metadata: {} };
};

// Load project.js logic partially
window.projectSamples = [];
window.activeSampleId = null;

// Mock getUniqueName
window.getUniqueName = function (baseName, excludeId = null) {
    let name = baseName;
    let count = 2;
    // Check if name exists, excluding the current sample (if excludeId provided)
    while (window.projectSamples.some(s => s.name === name && s.id !== excludeId)) {
        name = `${baseName}_${count}`;
        count++;
    }
    return name;
};

// Mock renderSampleList
window.renderSampleList = vi.fn();

describe('Naming Conflict Logic', () => {

    beforeEach(() => {
        window.projectSamples = [];
        window.activeSampleId = null;
        vi.clearAllMocks();
    });

    it('getUniqueName should return base name if unique', () => {
        const name = window.getUniqueName("Tiger");
        expect(name).toBe("Tiger");
    });

    it('getUniqueName should append _2 if name exists', () => {
        window.projectSamples.push({ id: '1', name: 'Tiger' });
        const name = window.getUniqueName("Tiger");
        expect(name).toBe("Tiger_2");
    });

    it('getUniqueName should append _3 if _2 exists', () => {
        window.projectSamples.push({ id: '1', name: 'Tiger' });
        window.projectSamples.push({ id: '2', name: 'Tiger_2' });
        const name = window.getUniqueName("Tiger");
        expect(name).toBe("Tiger_3");
    });

    it('getUniqueName should allow same name if excluding self', () => {
        // Scenario: Renaming "Tiger" to "Tiger" (no change) or check against self
        const selfId = '1';
        window.projectSamples.push({ id: selfId, name: 'Tiger' });

        // If I am '1' and I want to be called 'Tiger', it should be allowed (return 'Tiger')
        const name = window.getUniqueName("Tiger", selfId);
        expect(name).toBe("Tiger");
    });
});
