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
        globalHet: 0,

        // Density (N/mm²)
        densityPits: 0,
        densityScratches: 0,
        densityTotal: 0,

        // Normalized Severity (%)
        severityPitsn: 0,
        severityScratchesn: 0,
        severityTotaln: 0,

        // Experimental (v0.26.7)
        intersectionCount: 0,
        intersectionDensity: 0,
        textureComplexityIndex: 0,
        textureComplexityIndex: 0,
        complexityHet: 0,
        mfd: 0
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
    // Dimensions
    let wPx = 0;
    let hPx = 0;

    if (calibration && typeof calibration.getFOV === 'function') {
        const fov = calibration.getFOV();
        wPx = fov.width;
        hPx = fov.height;
    }

    if (wPx === 0 || hPx === 0) {
        let maxX = 0, maxY = 0;
        itemsList.forEach(i => {
            const x = i.type.startsWith('line') ? Math.max(i.x1, i.x2) : i.x;
            const y = i.type.startsWith('line') ? Math.max(i.y1, i.y2) : i.y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });
        wPx = Math.max(1000, maxX * 1.1);
        hPx = Math.max(1000, maxY * 1.1);
    }

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

        if (s.widthVal && s.widthVal > 0) {
            isMeasured = true;
            width = s.widthVal / ppu;
        } else if (s.width && s.width > 0) {
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

    // --- NEW PARAMS (v0.26.6) ---
    // Density (N/mm²)
    if (areaMm2 > 0) {
        res.densityPits = pitsForStats.length / areaMm2;
        res.densityScratches = scratchesForStats.length / areaMm2;
        res.densityTotal = (pitsForStats.length + scratchesForStats.length) / areaMm2;
    }

    // Normalized Severity (% of Area)
    // res.severityPits is in µm²
    // areaMm2 is in mm². Convert areaMm2 to µm² -> areaMm2 * 1_000_000
    const totalAreaUm2 = areaMm2 * 1000000;
    if (totalAreaUm2 > 0) {
        res.severityPitsn = (res.severityPits / totalAreaUm2) * 100;
        res.severityScratchesn = (res.severityScratches / totalAreaUm2) * 100;
        res.severityTotaln = (res.severityTotal / totalAreaUm2) * 100;
    }

    // --- EXPERIMENTAL COMPLEXITY PARAMETERS (v0.26.7) ---
    // 1. Intersection Count & Density
    let intersectionCount = 0;

    // Helper: Line-Line Intersection
    const intersectLineLine = (p1, p2, p3, p4) => {
        const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
        if (det === 0) return false; // Parallel
        const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    };

    // Helper: Line-Circle Intersection
    const intersectLineCircle = (p1, p2, circle) => {
        // Circle: {x, y, r}
        // Standard geometric approach: dist from center to line segment
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        const t = ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / lenSq;

        // Find closest point on segment
        // Find closest point on segment
        let closestX, closestY;
        if (lenSq === 0) {
            // Segment is a point
            closestX = p1.x;
            closestY = p1.y;
        } else {
            let t = ((circle.x - p1.x) * dx + (circle.y - p1.y) * dy) / lenSq;
            if (t < 0) t = 0;
            else if (t > 1) t = 1;

            closestX = p1.x + t * dx;
            closestY = p1.y + t * dy;
        }

        const distSq = (circle.x - closestX) ** 2 + (circle.y - closestY) ** 2;
        return distSq <= (circle.r * circle.r); // Use <= for edge cases
    };

    // Count Intersections: Scratches vs Scratches
    for (let i = 0; i < scratchesForStats.length; i++) {
        for (let j = i + 1; j < scratchesForStats.length; j++) {
            const s1 = scratchesForStats[i];
            const s2 = scratchesForStats[j];
            if (intersectLineLine(
                { x: s1.x1, y: s1.y1 }, { x: s1.x2, y: s1.y2 },
                { x: s2.x1, y: s2.y1 }, { x: s2.x2, y: s2.y2 }
            )) {
                intersectionCount++;
            }
        }
    }

    // Count Intersections: Scratches vs Pits
    // Pits are modeled as circles with radius derived from diameter
    // s.width is diameter in Microns usually? no, items store coords in pixels
    // We need pixel dimensions for intersection check
    pitsForStats.forEach(p => {
        // radius in pixels = (diameter_microns / ppu) / 2 IF width is diameter
        // Actually items have x,y (center). width is diameter?
        // Let's assume p.width is diameter in pixels if not calibrated?
        // Wait, items in 'items' array have x, y. Pits are points or circles.
        // Large pits (lp) have a drawn radius?
        // Let's approximate: Pits are points? Or minimal circles?
        // If s.type === 'point', it has x,y.
        // Let's assume a small radius for intersection check if not defined (e.g. 2px or actual visual size)
        // If we want scientific intersection, we should use the actual diameter.
        // p.widthVal is diameter in units.
        let radius = (p.widthVal ? p.widthVal / ppu : 2.0 / ppu) / 2;
        if (p.type === 'lp') {
            // For LP, radius logic might differ in canvas.js but let's use widthVal if available
        }

        scratchesForStats.forEach(s => {
            if (intersectLineCircle(
                { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 },
                { x: p.x, y: p.y, r: Math.max(1, radius) }
            )) {
                intersectionCount++;
            }
        });
    });

    res.intersectionCount = intersectionCount;
    if (areaMm2 > 0) {
        res.intersectionDensity = intersectionCount / areaMm2;
    }

    // 2. Texture Complexity Index (TCI)
    // TCI = (Intersection Density * (1 - Anisotropy)) + (Pit Density * 0.5)
    // 1 - Anisotropy = Vector Consistency (already calculated as res.vectorConsistency)
    res.textureComplexityIndex = (res.intersectionDensity * res.vectorConsistency) + (res.densityPits * 0.5);

    // 3. Complexity Heterogeneity (Proxy for HAsfc)
    // Calculate TCI for each of the 9x9 (81) grid cells and get CV
    const gridTCI = [];
    let gridW = (typeof width !== 'undefined') ? width : wPx;
    let gridH = (typeof height !== 'undefined') ? height : hPx;

    const cellW = gridW / 9;
    const cellH = gridH / 9;
    const cellAreaMm2 = (cellW / ppu) * (cellH / ppu);

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const minX = c * cellW;
            const maxX = (c + 1) * cellW;
            const minY = r * cellH;
            const maxY = (r + 1) * cellH;

            // 1. Pits in Cell
            const cellPits = pitsForStats.filter(p => p.x >= minX && p.x < maxX && p.y >= minY && p.y < maxY);
            const densP = cellAreaMm2 > 0 ? cellPits.length / cellAreaMm2 : 0;

            // 2. Scratches in Cell
            const cellScratches = scratchesForStats.filter(s => {
                const cx = (s.x1 + s.x2) / 2;
                const cy = (s.y1 + s.y2) / 2;
                return cx >= minX && cx < maxX && cy >= minY && cy < maxY;
            });

            // 3. Local Intersections
            let cellIntersections = 0;
            for (let i = 0; i < cellScratches.length; i++) {
                for (let j = i + 1; j < cellScratches.length; j++) {
                    const s1 = cellScratches[i];
                    const s2 = cellScratches[j];
                    if (intersectLineLine(
                        { x: s1.x1, y: s1.y1 }, { x: s1.x2, y: s1.y2 },
                        { x: s2.x1, y: s2.y1 }, { x: s2.x2, y: s2.y2 }
                    )) cellIntersections++;
                }
            }
            cellPits.forEach(p => {
                let radius = (p.widthVal ? p.widthVal / ppu : 2.0 / ppu) / 2;
                cellScratches.forEach(s => {
                    if (intersectLineCircle(
                        { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 },
                        { x: p.x, y: p.y, r: Math.max(1, radius) }
                    )) cellIntersections++;
                });
            });

            const densInt = cellAreaMm2 > 0 ? cellIntersections / cellAreaMm2 : 0;

            // 4. Local Vector Consistency
            let consistency = 0;
            if (cellScratches.length > 0) {
                let C = 0, S = 0;
                cellScratches.forEach(s => {
                    const dx = s.x2 - s.x1;
                    const dy = s.y2 - s.y1;
                    const angle = Math.atan2(dy, dx);
                    C += Math.cos(2 * angle);
                    S += Math.sin(2 * angle);
                });
                let vectR = Math.sqrt(C * C + S * S) / cellScratches.length;
                consistency = 1 - vectR;
            }

            // 5. Local TCI
            const localTCI = (densInt * consistency) + (densP * 0.5);
            gridTCI.push(localTCI);
        }
    }

    res.complexityHet = getCV(gridTCI);

    // 4. MFD (Mean Feature Dimensions) - Proxy
    // Mean Feature Size: (Sum(Widths) + Sum(Diameters)) / Total Count
    // We use 'totalWidth' (for scratches) and 'totalDiaCI' (for pits - but totalDiaCI used STD_PIT_DIA if point?)
    // Let's re-calculate precise sum of diameters for this purpose.

    let sumSizes = 0;
    // Pits
    pitsForStats.forEach(p => {
        let d = 0;
        if (p.widthVal && p.widthVal > 0) d = p.widthVal / ppu;
        else if (p.type === 'point') d = STD_PIT_DIA; // Default 2.0 um
        else d = (p.r * 2) / ppu;
        sumSizes += d;
    });
    // Scratches
    // totalWidth is already sum of widths in UNITS? 
    // In scratch loop: width = s.widthVal / ppu OR STD_SCR_W. 
    // totalWidth in loop was sum of these widths.
    // NOTE: 'totalWidth' variable in the function is sum of Widths in Units?
    // Let's check scratch loop:
    // width = s.widthVal / ppu; -> width is in Units?
    // ppu = pixels per unit. If val is 10px, ppu=1 => 10 units.

    // Wait, earlier logic: 
    // if (isCal) ppu = calibration.pixelsPerUnit;
    // width = s.widthVal / ppu; -> this converts pixels to units.
    // So 'width' is in units (µm).
    // totalWidth += width; -> Sum is in µm.

    sumSizes += totalWidth;

    const totalCountSmfc = pitsForStats.length + scratchesForStats.length;
    if (totalCountSmfc > 0) {
        res.mfd = sumSizes / totalCountSmfc;
    }

    return res;
}


// Expose to window for testing/module compatibility
// 1. Expose to window for UI
if (typeof window !== 'undefined') {
    window.getStatsFromItems = getStatsFromItems;
}

// 2. Export for Test (Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStatsFromItems };
}
