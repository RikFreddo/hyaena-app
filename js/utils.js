/**
 * Hyaena Utility Functions (Global Scope)
 */

/**
 * Calculates the perpendicular projection of a point onto a line segment.
 * @param {Object} p - The point to project {x, y}
 * @param {Object} lineStart - Start point of the line {x, y}
 * @param {Object} lineEnd - End point of the line {x, y}
 * @returns {Object} The projected point {x, y}
 */
function calculateProjection(p, lineStart, lineEnd) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
        return { x: p.x, y: p.y };
    }

    const len = Math.hypot(dx, dy);
    const perpX = -dy / len;
    const perpY = dx / len;

    const dragX = p.x - lineStart.x;
    const dragY = p.y - lineStart.y;

    const dist = dragX * perpX + dragY * perpY;

    return {
        x: lineStart.x + perpX * dist,
        y: lineStart.y + perpY * dist
    };
}

/**
 * Calculates distance between two points.
 */
function getDistance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Converts pixels to units based on calibration.
 */
function pxToUnit(px, ppu) {
    if (!ppu || ppu === 0) return 0;
    return px / ppu;
}

/**
 * Parses filename to extract metadata (v0.24 logic).
 */
function parseFilename(filename) {
    let clean = filename.replace(/\.[^/.]+$/, "");
    let originalName = clean;

    const sideKeywords = ['buc', 'ling', 'lab', 'occ', 'mes', 'dist', 'dx', 'sx', 'sin', 'dex'];
    const partKeywords = ['trig', 'tall', 'para', 'meta', 'met', 'proto', 'hypo', 'ent'];
    const reMag = /^\d+x$/i;
    const reTooth = /^(d?)[icpm][1-4]$/i;
    const reSeq = /^\d+$/;

    let mag = "";
    let tooth = "";
    let side = "";
    let part = "";
    let seq = "";

    let tokens = clean.split(/[_\-\s\.]+/);
    let remainingTokens = [];

    tokens.forEach(t => {
        const tLower = t.toLowerCase();
        if (reMag.test(t)) mag = t;
        else if (reTooth.test(t)) tooth = t;
        else if (sideKeywords.some(k => tLower.includes(k))) side = t;
        else if (partKeywords.some(k => tLower.includes(k))) part = t;
        else remainingTokens.push(t);
    });

    if (remainingTokens.length > 0) {
        const last = remainingTokens[remainingTokens.length - 1];
        if (reSeq.test(last)) {
            const val = parseInt(last, 10);
            if (val < 100 && remainingTokens.length > 1) {
                seq = last;
                remainingTokens.pop();
            }
        }
    }

    let id = remainingTokens.join("_");
    if (!id) id = originalName;

    return {
        id: id.toUpperCase(),
        tooth: tooth,
        side: side,
        part: part,
        mag: mag,
        seq: seq,
        originalName: originalName
    };
}

// Expose to window for testing/module compatibility
if (typeof window !== 'undefined') {
    window.calculateProjection = calculateProjection;
    window.getDistance = getDistance;
    window.pxToUnit = pxToUnit;
    window.parseFilename = parseFilename;
}
