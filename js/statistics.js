/**
 * Hyaena Statistics Logic (Global Scope)
 */

const STD_PIT_DIA = 2.0;    // um
const STD_SCR_W = 1.0;      // um
const SHAPE_COEFF = 0.785;  // (pi/4)

/**
 * Calculates statistical metrics (19 parameters).
 * @param {Array} itemsList 
 * @param {Object} calibration 
 */
function getStatsFromItems(itemsList, calibration) {
    let isCal = calibration && calibration.calibrated;
    let ppu = isCal ? calibration.pixelsPerUnit : 1;

    if (!ppu || isNaN(ppu) || ppu <= 0) {
        ppu = 1;
        isCal = false;
    }

    let res = {
        // Morphometry
        crushingIndex: 0,
        percMeasuredPits: 0,
        maxPitDiameter: 0,
        aspectRatio: 0,
        meanScratchWidth: 0,
        measuredAspectRatio: 0,
        psRatio: 0,

        // Vector
        anisotropy: 0,
        vectorConsistency: 0,
        meanOrient: 0,

        // Severity
        bgAbrasion: 0,
        severityPits: 0,
        severityScratches: 0,
        severityTotal: 0,
        severityRatio: 0,
        meanFeatureSeverity: 0,

        // Composite
        durophagyIndex: 0,

        // Heterogeneity
        pitHet: 0,
        scratchHet: 0,
        globalHet: 0
    };

    if (!itemsList || itemsList.length === 0) return res;

    // Filter
    // Note: v0.23.4 might use different catIds? 
    // In v0.23.4, 'point_sp' -> catId='sp', 'point_pp' -> catId='pp'. (Wait, earlier code said 'lp' for large pits?)
    // Let's assume standard 'sp'/'pp' or generic points.
    // The filter below looks for 'sp' or 'lp'. 
    // If v0.23.4 uses 'pp' for small pits, we should include it.
    // Let's try to be inclusive: catId 'sp', 'pp', 'lp'.
    const pits = itemsList.filter(i => (i.type === 'point' || i.type === 'circle'));
    const scratches = itemsList.filter(i => i.type === 'line' || i.type === 'line_fs');

    // Dimensions
    let maxX = 0, maxY = 0;
    itemsList.forEach(i => {
        const x = i.type.startsWith('line') ? Math.max(i.x1, i.x2) : i.x;
        const y = i.type.startsWith('line') ? Math.max(i.y1, i.y2) : i.y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    });
    let wPx = Math.max(1000, maxX * 1.1);
    let hPx = Math.max(1000, maxY * 1.1);

    const areaMm2 = (wPx * hPx) / (ppu * ppu) / 1000000;

    // PITS & SCRATCHES FILTERED
    const pitsForStats = pits.filter(p => p.catId !== 'pp' && p.catId !== 'g');
    const scratchesForStats = scratches.filter(s => s.catId !== 'pp' && s.catId !== 'g');

    // PITS STATS
    let totalPitDia = 0; // Not used for CI anymore but maybe for debugging? Removing.
    let totalDiaCI = 0;
    let measuredPitsCount = 0;
    let totalPitArea = 0;
    let maxPitDia = 0;

    // Grid for Heterogeneity
    const cw = wPx / 10;
    const ch = hPx / 10;
    const gridP = Array(10).fill(0).map(() => Array(10).fill(0));

    pitsForStats.forEach(p => {
        let d = 0;
        if (p.type === 'point') d = STD_PIT_DIA;
        else d = (p.r * 2) / ppu;

        // Stats
        totalDiaCI += d;
        if (d > 4.0) measuredPitsCount++;
        if (d > maxPitDia) maxPitDia = d;

        // Severity
        let radius = d / 2;
        totalPitArea += Math.PI * radius * radius;

        // Heterogeneity
        const x = Math.floor(p.x / cw);
        const y = Math.floor(p.y / ch);
        if (x >= 0 && x < 10 && y >= 0 && y < 10) gridP[y][x]++;
    });

    res.crushingIndex = pitsForStats.length > 0 ? (totalDiaCI / pitsForStats.length) : 0;
    res.percMeasuredPits = pitsForStats.length > 0 ? (measuredPitsCount / pitsForStats.length) * 100 : 0;
    res.maxPitDiameter = maxPitDia;
    res.severityPits = totalPitArea;

    // SCRATCHES STATS
    let totalLen = 0;
    let totalWidth = 0;
    let totalScrArea = 0;
    let vectorSumX = 0;
    let vectorSumY = 0;
    let sumAspectRatio = 0;
    let sumMeasuredAR = 0;
    let countMeasured = 0;

    // Grid for Scratch Het
    const gridS = Array(9).fill(0).map(() => Array(9).fill(0));

    // Helper: Line-Rect Intersection
    function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Check if either end is inside
        if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||
            (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) return true;

        // Cohen-Sutherland-like checks or separating axis would be better, but simple check:
        // Check if line intersects any of the 4 borders
        const check = (lx1, ly1, lx2, ly2) => {
            const den = (lx2 - lx1) * (y2 - y1) - (ly2 - ly1) * (x2 - x1);
            if (den === 0) return false;
            const ua = ((lx2 - lx1) * (y1 - ly1) - (ly2 - ly1) * (x1 - lx1)) / den;
            const ub = ((x2 - x1) * (y1 - ly1) - (y2 - y1) * (x1 - lx1)) / den;
            return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
        };
        // Top, Right, Bottom, Left
        if (check(rx, ry, rx + rw, ry)) return true;
        if (check(rx + rw, ry, rx + rw, ry + rh)) return true;
        if (check(rx, ry + rh, rx + rw, ry + rh)) return true;
        if (check(rx, ry, rx, ry + rh)) return true;

        return false;
    }

    scratchesForStats.forEach(s => {
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        let len = Math.hypot(dx, dy) / ppu;
        totalLen += len;

        let width = 0;
        let isMeasured = false;

        if (s.width && s.width > 0) {
            isMeasured = true;
            width = s.width / ppu;
        } else {
            width = STD_SCR_W;
        }
        totalWidth += width;

        let area = isMeasured ? (len * width * SHAPE_COEFF) : (len * width);
        totalScrArea += area;

        let ar = (width > 0) ? (len / width) : 0;
        sumAspectRatio += ar;

        if (isMeasured) {
            sumMeasuredAR += ar;
            countMeasured++;
        }

        const angle = Math.atan2(dy, dx);
        const angle2 = 2 * angle;
        vectorSumX += Math.cos(angle2);
        vectorSumY += Math.sin(angle2);

        // Heterogeneity: Check intersection with all 81 cells
        // Optimization: Check only cells in bounding box
        const minSx = Math.min(s.x1, s.x2);
        const maxSx = Math.max(s.x1, s.x2);
        const minSy = Math.min(s.y1, s.y2);
        const maxSy = Math.max(s.y1, s.y2);

        const startX = Math.max(0, Math.floor(minSx / cw));
        const endX = Math.min(8, Math.floor(maxSx / cw));
        const startY = Math.max(0, Math.floor(minSy / ch));
        const endY = Math.min(8, Math.floor(maxSy / ch));

        for (let gy = startY; gy <= endY; gy++) {
            for (let gx = startX; gx <= endX; gx++) {
                const rx = gx * cw;
                const ry = gy * ch;
                if (lineIntersectsRect(s.x1, s.y1, s.x2, s.y2, rx, ry, cw, ch)) {
                    gridS[gy][gx]++;
                }
            }
        }
    });

    if (scratchesForStats.length > 0) {
        res.meanScratchWidth = totalWidth / scratchesForStats.length;
        res.aspectRatio = sumAspectRatio / scratchesForStats.length;
        res.severityScratches = totalScrArea;

        if (countMeasured > 0) res.measuredAspectRatio = sumMeasuredAR / countMeasured;

        const R = Math.hypot(vectorSumX, vectorSumY) / scratchesForStats.length;
        res.anisotropy = R;
        res.vectorConsistency = 1 - R;

        const meanAng2 = Math.atan2(vectorSumY, vectorSumX);
        let meanAng = (meanAng2 / 2) * (180 / Math.PI);
        if (meanAng < 0) meanAng += 180;
        res.meanOrient = meanAng;
    }

    // RATIOS
    if (scratchesForStats.length > 0) res.psRatio = pitsForStats.length / scratchesForStats.length;
    else if (pitsForStats.length > 0) res.psRatio = pitsForStats.length;

    if (areaMm2 > 0) res.bgAbrasion = (totalLen / 1000) / areaMm2;

    res.severityTotal = res.severityPits + res.severityScratches;
    if (res.severityScratches > 0) res.severityRatio = res.severityPits / res.severityScratches;

    const totalCount = pitsForStats.length + scratchesForStats.length;
    if (totalCount > 0) res.meanFeatureSeverity = res.severityTotal / totalCount;

    res.durophagyIndex = res.psRatio * res.crushingIndex;



    function getCV(grid) {
        const flat = grid.flat();
        const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
        if (mean === 0) return 0;
        const variance = flat.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / flat.length;
        return Math.sqrt(variance) / mean;
    }

    res.pitHet = getCV(gridP);
    res.scratchHet = getCV(gridS);
    res.globalHet = (res.pitHet + res.scratchHet) / 2;

    return res;
}

// Expose to window for testing/module compatibility
if (typeof window !== 'undefined') {
    window.getStatsFromItems = getStatsFromItems;
}
