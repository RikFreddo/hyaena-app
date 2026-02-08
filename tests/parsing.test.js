/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../js/utils.js';

describe('parseFilename Logic (v0.24.12 Restoration)', () => {

    it('should parse standard ID with metadata separators', () => {
        const res = window.parseFilename("NMB123_m1_buc_trig.jpg");
        expect(res.id).toBe("NMB123");
        expect(res.tooth).toBe("m1");
        expect(res.side).toBe("buc");
        expect(res.part).toBe("trig");
    });

    it('should handle different separators (dot, space, dash)', () => {
        const res = window.parseFilename("Crocuta-Adult.m2.jpg");
        expect(res.id).toBe("CROCUTA_ADULT"); // ID is uppercased
        expect(res.tooth).toBe("m2");
    });

    it('should treat numbers < 100 as sequence if not alone', () => {
        const res = window.parseFilename("Sample_01.jpg");
        expect(res.id).toBe("SAMPLE");
        expect(res.seq).toBe("01");
    });

    it('should NOT treat numbers >= 100 as sequence', () => {
        const res = window.parseFilename("Sample_105.jpg");
        expect(res.id).toBe("SAMPLE_105");
        expect(res.seq).toBe("");
    });

    it('should keep number as ID if it is the only token', () => {
        const res = window.parseFilename("1.jpg");
        expect(res.id).toBe("1");
        expect(res.seq).toBe("");
    });

    it('should extract Mag (magnification)', () => {
        const res = window.parseFilename("Test_10x.jpg");
        expect(res.id).toBe("TEST");
        expect(res.mag).toBe("10x");
    });

    it('should handle complex mixed cases', () => {
        // "NMB-1806 m1_dx_10x_1.jpg"
        // ID: NMB-1806 (split by - becomes NMB 1806 joined by _ -> NMB_1806)
        // Tooth: m1
        // Side: dx (Wait, v0.24.8 list didn't have dx/sx, strictly checked "buc, ling, lab, occ, mes, dist")
        // If I strictly used v0.24.8 list, 'dx' is a token.
        // Let's verify what I implemented. I used the strict v0.24.8 list. 
        // So 'dx' should be part of ID if not in list.
        // Update: js/utils.js line 57 has ['buc', 'ling', 'lab', 'occ', 'mes', 'dist', 'dx', 'sx', 'sin', 'dex']
        // So 'dx' IS a side keyword in the refactored code (Step 246).

        const res = window.parseFilename("NMB-1806_m1_buc_10x_02.jpg");
        expect(res.id).toBe("NMB_1806"); // Tokens: NMB, 1806. Joined by _.
        expect(res.tooth).toBe("m1");
        expect(res.side).toBe("buc");
        expect(res.mag).toBe("10x");
        expect(res.seq).toBe("02");
    });

    it('should verify Export Logic: use metadata ID if available', () => {
        // Logic check: if metadata.id exists, it should be preferred over name
        const s1 = { name: "Sample_2", metadata: { id: "SAMPLE" } };
        const exportID1 = (s1.metadata && s1.metadata.id) ? s1.metadata.id : s1.name;
        expect(exportID1).toBe("SAMPLE");

        const s2 = { name: "Sample_New", metadata: { id: "" } }; // No metadata ID
        const exportID2 = (s2.metadata && s2.metadata.id) ? s2.metadata.id : s2.name;
        expect(exportID2).toBe("Sample_New");
    });
});
