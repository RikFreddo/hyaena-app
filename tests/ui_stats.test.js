import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('UI Stats Modal', () => {
    let dom;
    let window;
    let document;

    beforeEach(async () => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="statsModalOverlay" style="display:none"></div>
                <div id="statsContent"></div>
            </body>
            </html>
        `);
        window = dom.window;
        document = window.document;
        global.document = document;
        global.window = window;
        global.HTMLElement = window.HTMLElement;

        // Mock dependencies
        global.projectSamples = [{
            id: 'test_sample',
            name: 'Test Sample',
            calibration: { calibrated: true, ppu: 100 },
            items: [
                { type: 'point', x: 10, y: 10, catId: 'sp' },
                { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, catId: 'fs' } // Horizontal line, 100px = 1 unit
            ]
        }];
        global.activeSampleId = 'test_sample';
        global.items = global.projectSamples[0].items; // Used for "is empty" check in ui.js

        // Mock functions
        global.syncState = vi.fn();

        // Mock getStatsFromItems (simplified return)
        global.getStatsFromItems = vi.fn().mockReturnValue({
            crushingIndex: 1.0,
            percMeasuredPits: 10.0,
            maxPitDiameter: 2.0,
            aspectRatio: 1.5,
            meanScratchWidth: 0.5,
            measuredAspectRatio: 0,
            psRatio: 0.2,
            anisotropy: 0.8,
            vectorConsistency: 0.2,
            meanOrient: 45.0,
            bgAbrasion: 0.001,
            severityPits: 100,
            severityScratches: 200,
            severityTotal: 300,
            severityRatio: 0.5,
            meanFeatureSeverity: 5.0,
            durophagyIndex: 0.3,
            pitHet: 0.1,
            scratchHet: 0.2,
            globalHet: 0.15,
            densityPits: 10,
            densityScratches: 20,
            densityTotal: 30,
            severityPitsn: 1,
            severityScratchesn: 2,
            severityTotaln: 3,
            intersectionCount: 5,
            intersectionDensity: 0.5,
            textureComplexityIndex: 1.5,
            complexityHet: 0.2
        });

        // Load ui.js logic (we can't import easily if it's not a module, so we paste/eval or rely on implementation being global)
        // Since we modified ui.js in the file system, we should ideally load it. 
        // For this test, we can redefine the function based on what we wrote, OR try to load the file content.
        // Let's rely on reading the file content and evaling it, or just testing the logic we *expect* to be there.
        // Better: we can import the file if it was a module, but it's not.

        // Simple approach: Read the file and eval it in the context of our JSDOM window
        const fs = await import('fs');
        const path = await import('path');
        const uiJsCheck = fs.readFileSync(path.resolve('./js/ui.js'), 'utf8');
        eval(uiJsCheck);
    });

    it('should populate stats content with all 20 parameters', () => {
        window.openStatsModal();

        const content = document.getElementById('statsContent').innerHTML;

        // Check for specific labels that were added
        expect(content).toContain('Sample Name');
        expect(content).toContain('Test Sample');
        expect(content).toContain('Morphometry');
        expect(content).toContain('Crushing Index');
        expect(content).toContain('% Measured Pits');
        expect(content).toContain('Max Pit Dia.');
        expect(content).toContain('Mean Scr. Width');
        expect(content).toContain('Aspect Ratio');
        console.log(content);
        expect(content).toContain('Measured AR');
        expect(content).toContain('Vector (Orientation)');
        expect(content).toContain('Anisotropy (R)');
        expect(content).toContain('Vector Consistency'); // New
        expect(content).toContain('Mean Orient');
        expect(content).toContain('Severity');
        expect(content).toContain('Sev. Pits'); // New label format
        expect(content).toContain('Sev. Scratches');
        expect(content).toContain('Sev. Total');
        expect(content).toContain('Composite &amp; Het.');
        expect(content).toContain('Durophagy Index');
        expect(content).toContain('Global Het.');

        // Verify Tooltips are present and accessible (tabindex)
        expect(content).toContain('data-tooltip="Average diameter of valid Pits. Indicates compressive force intensity. (Sp, Lp)" tabindex="0"');
        expect(content).toContain('data-tooltip="Variation (CV) of Pit density on 9x9 grid. (Sp, Lp)" tabindex="0"');

        // Verify function call
        expect(global.getStatsFromItems).toHaveBeenCalled();
    });
});
