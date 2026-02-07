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
        percLargePits: 0,
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

    // PITS
    let totalPitDia = 0;
    let maxPitDia = 0;
    let largePitsCount = 0;
    let totalPitArea = 0;

    pits.forEach(p => {
        let diam = 0;
        if (p.type === 'point') {
            diam = STD_PIT_DIA;
            // If p.catId === 'pp' (small pit)? 
            // Standard logic usually treats all points as standard diameter unless measured.
        } else {
            let rPx = p.r || 0;
            diam = (rPx * 2) / ppu;
        }

        if (diam > maxPitDia) maxPitDia = diam;
        totalPitDia += diam;
        if (diam > 4.0) largePitsCount++;

        let radius = diam / 2;
        totalPitArea += Math.PI * radius * radius;
    });

    res.crushingIndex = pits.length > 0 ? (totalPitDia / pits.length) : 0;
    res.percLargePits = pits.length > 0 ? (largePitsCount / pits.length) * 100 : 0;
    res.maxPitDiameter = maxPitDia;
    res.severityPits = totalPitArea;

    // SCRATCHES
    let totalLen = 0;
    let totalWidth = 0;
    let totalScrArea = 0;
    let vectorSumX = 0;
    let vectorSumY = 0;
    let sumAspectRatio = 0;
    let sumMeasuredAR = 0;
    let countMeasured = 0;

    scratches.forEach(s => {
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
    });

    if (scratches.length > 0) {
        res.meanScratchWidth = totalWidth / scratches.length;
        res.aspectRatio = sumAspectRatio / scratches.length;
        res.severityScratches = totalScrArea;

        if (countMeasured > 0) res.measuredAspectRatio = sumMeasuredAR / countMeasured;

        const R = Math.hypot(vectorSumX, vectorSumY) / scratches.length;
        res.anisotropy = R;
        res.vectorConsistency = 1 - R;

        const meanAng2 = Math.atan2(vectorSumY, vectorSumX);
        let meanAng = (meanAng2 / 2) * (180 / Math.PI);
        if (meanAng < 0) meanAng += 180;
        res.meanOrient = meanAng;
    }

    // RATIOS
    if (scratches.length > 0) res.psRatio = pits.length / scratches.length;
    else if (pits.length > 0) res.psRatio = pits.length;

    if (areaMm2 > 0) res.bgAbrasion = (totalLen / 1000) / areaMm2;

    res.severityTotal = res.severityPits + res.severityScratches;
    if (res.severityScratches > 0) res.severityRatio = res.severityPits / res.severityScratches;

    const totalCount = pits.length + scratches.length;
    if (totalCount > 0) res.meanFeatureSeverity = res.severityTotal / totalCount;

    res.durophagyIndex = res.psRatio * res.crushingIndex;

    // HET
    const cw = wPx / 10;
    const ch = hPx / 10;
    const gridP = Array(10).fill(0).map(() => Array(10).fill(0));
    const gridS = Array(10).fill(0).map(() => Array(10).fill(0));

    pits.forEach(p => {
        const x = Math.floor(p.x / cw);
        const y = Math.floor(p.y / ch);
        if (x >= 0 && x < 10 && y >= 0 && y < 10) gridP[y][x]++;
    });
    scratches.forEach(s => {
        const cx = (s.x1 + s.x2) / 2;
        const cy = (s.y1 + s.y2) / 2;
        const x = Math.floor(cx / cw);
        const y = Math.floor(cy / ch);
        if (x >= 0 && x < 10 && y >= 0 && y < 10) gridS[y][x]++;
    });

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
