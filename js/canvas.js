
// ==========================================================================
// CANVAS REDRAW
// ==========================================================================

window.redraw = function () {
    try {
        const cvs = document.getElementById('cvs');
        const ctx = cvs.getContext('2d');
        const statsBar = document.getElementById('stats-bar');

        ctx.clearRect(0, 0, cvs.width, cvs.height);
        if (img.src && img.width > 0) ctx.drawImage(img, 0, 0);

        let counts = {};
        STATS_ORDER.forEach(k => counts[k] = 0);
        const baseW = Math.max(3, (img.width || 1000) / 500);

        if (items && items.length > 0) {
            items.forEach(it => {
                // Filter for doubt mode
                if (isDoubtMode && !it.isDoubt) return;

                const catId = it.catId && CATS[it.catId] ? it.catId : 'sp';
                const conf = CATS[catId];
                const isSel = (it === selectedItem);
                let drawColor = conf.color;

                if (it.isDoubt) {
                    if (it.doubtResolved) drawColor = conf.color;
                    else drawColor = "#ffd60a"; // Highlight unresolved doubts
                }
                if (isSel) drawColor = "#00ffff"; // Selection Highlight

                ctx.strokeStyle = drawColor;
                ctx.fillStyle = drawColor;
                ctx.lineWidth = isSel ? baseW * 2 : baseW;

                // Shadow for visibility
                ctx.shadowBlur = (isSel || (it.isDoubt && !it.doubtResolved)) ? 10 : 0;
                ctx.shadowColor = "black";

                // Dashed line for unresolved doubts
                if (it.isDoubt && !it.doubtResolved) ctx.setLineDash([baseW * 2, baseW * 2]);
                else ctx.setLineDash([]);

                if (it.type === 'point') {
                    ctx.beginPath();
                    ctx.arc(it.x, it.y, baseW * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (it.type === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(it.x1, it.y1);
                    ctx.lineTo(it.x2, it.y2);
                    ctx.stroke();
                    // End Point Marker
                    ctx.beginPath();
                    ctx.arc(it.x2, it.y2, baseW * 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Show measurement if relevant
                    if (it.widthVal && (isDoubtMode || isSel)) {
                        ctx.font = (baseW * 3) + "px Arial";
                        ctx.fillStyle = "white";
                        ctx.fillText(it.widthVal.toFixed(1) + "µm", (it.x1 + it.x2) / 2, (it.y1 + it.y2) / 2);
                    }
                } else if (it.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (counts[catId] !== undefined) counts[catId]++;
            });
        }

        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Render Measurement Points
        if (mode === 'measure') {
            ctx.fillStyle = "#ff00ff";
            measurePoints.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, baseW * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = (baseW * 4) + "px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(i + 1, p.x, p.y);
            });
        }

        // Update Stats Bar
        let html = isCalibrated ? `<span style="color:var(--text-sec); font-size:10px;">(1 ${unitName} = ${pixelsPerUnit.toFixed(1)}px)</span> | ` : `<span style="color:red">NO CALIB</span> | `;
        STATS_ORDER.forEach(k => {
            const c = CATS[k];
            html += `<span style="color:${c.color}">${c.label}: ${counts[k]}</span> | `;
        });
        statsBar.innerHTML = html.slice(0, -3);

    } catch (e) { console.error("Redraw error:", e); }
};

// ==========================================================================
// ZOOM & VIEWPORT
// ==========================================================================

window.updateZoom = function (val) {
    currentScale = val / 100;
    document.getElementById('zoomLabel').innerText = Math.round(val) + '%';
    document.getElementById('zoomSlider').value = val;
    if (img.src) {
        const cvs = document.getElementById('cvs');
        cvs.style.width = (img.width * currentScale) + "px";
        cvs.style.height = (img.height * currentScale) + "px";
    }
};

window.changeZoom = function (delta) {
    const slider = document.getElementById('zoomSlider');
    let newVal = parseInt(slider.value) + delta;
    newVal = Math.max(10, Math.min(400, newVal));
    updateZoom(newVal);
};

window.fitToScreen = function () {
    if (!img.src) return;
    const viewport = document.getElementById('viewport');
    const cvs = document.getElementById('cvs');

    const vw = viewport.clientWidth - 20;
    const vh = viewport.clientHeight - 20;
    const ratioW = vw / img.width;
    const ratioH = vh / img.height;
    const bestRatio = Math.min(ratioW, ratioH);
    updateZoom(Math.floor(bestRatio * 100));

    // Center
    viewport.scrollLeft = (cvs.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (cvs.scrollHeight - viewport.clientHeight) / 2;
};

// ==========================================================================
// TOOLBAR & INTERACTION MODES
// ==========================================================================

window.setMode = function (m) {
    mode = m;
    const viewport = document.getElementById('viewport');
    viewport.className = 'mode-' + m;

    ['btnPan', 'btnSelect'].forEach(id => document.getElementById(id).classList.remove('active'));

    if (m === 'pan') document.getElementById('btnPan').classList.add('active');
    if (m === 'select') document.getElementById('btnSelect').classList.add('active');

    if (m === 'draw') {
        updateToolVisuals();
    } else {
        document.querySelectorAll('#toolsRow .btn').forEach(b => {
            if (!b.id.startsWith('btn')) b.classList.remove('active');
        });
    }

    const toolsRow = document.getElementById('toolsRow');
    toolsRow.style.opacity = '1';
    toolsRow.style.pointerEvents = 'auto';
    document.getElementById('btnMarkDoubt').style.display = 'none';
    document.getElementById('btnDelete').style.display = 'none';

    selectedItem = null;
    redraw();
};

window.setDrawTool = function (toolName) {
    if (isDoubtMode) {
        alert("Exit doubt mode to draw.");
        return;
    }
    activeDrawTool = toolName;
    setMode('draw');
};

window.toggleDoubtMode = function () {
    isDoubtMode = !isDoubtMode;
    const btn = document.getElementById('btnDoubtMode');
    const overlay = document.getElementById('doubtOverlayMsg');
    const toolsRow = document.getElementById('toolsRow');

    if (isDoubtMode) {
        btn.classList.add('active');
        overlay.style.display = 'block';
        setMode('select');
        // Dim tools while in doubt mode to focus on measuring
        toolsRow.style.opacity = '0.3';
        toolsRow.style.pointerEvents = 'none';
    } else {
        // Return normal items
        items.forEach(it => { if (it.doubtResolved) { it.isDoubt = false; } });

        btn.classList.remove('active');
        overlay.style.display = 'none';
        setMode('pan');
        toolsRow.style.opacity = '1';
        toolsRow.style.pointerEvents = 'auto';
    }
    redraw();
};

window.markSelectedAsDoubt = function () {
    if (selectedItem && selectedItem.type === 'line') {
        selectedItem.isDoubt = true;
        selectedItem.doubtResolved = false;
        selectedItem.catId = 'fs'; // Default reset
        selectedItem = null;
        document.getElementById('btnDelete').style.display = 'none';
        document.getElementById('btnMarkDoubt').style.display = 'none';
        redraw();
        syncState();
    }
};

window.updateToolVisuals = function () {
    document.querySelectorAll('#toolsRow .btn').forEach(b => b.classList.remove('active'));
    const map = {
        'line_fs': 'toolLineFs',
        'point_sp': 'toolSp',
        'point_pp': 'toolPp',
        'circle_auto': 'toolCircle'
    };
    if (map[activeDrawTool]) document.getElementById(map[activeDrawTool]).classList.add('active');
};


// ==========================================================================
// CANVAS EVENTS & GEOMETRY
// ==========================================================================

window.getImgPos = function (e) {
    const cvs = document.getElementById('cvs');
    const r = cvs.getBoundingClientRect();
    let cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    let cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    return {
        x: (cx - r.left) / currentScale,
        y: (cy - r.top) / currentScale
    };
};

window.findItemAt = function (x, y) {
    const th = 25 / currentScale; // Touch/Click threshold
    const visibleItems = isDoubtMode ? items.filter(i => i.isDoubt) : items;

    let candidates = [];

    // 1. Gather all valid candidates within threshold
    visibleItems.forEach((it, idx) => {
        let dist = Infinity;

        if (it.type === 'point') {
            dist = Math.hypot(x - it.x, y - it.y);
        } else if (it.type === 'line') {
            // Distance from point to line segment
            const A = x - it.x1;
            const B = y - it.y1;
            const C = it.x2 - it.x1;
            const D = it.y2 - it.y1;
            const lenSq = C * C + D * D;
            let param = -1;
            if (lenSq !== 0) param = (A * C + B * D) / lenSq;
            let xx, yy;
            if (param < 0) {
                xx = it.x1;
                yy = it.y1;
            } else if (param > 1) {
                xx = it.x2;
                yy = it.y2;
            } else {
                xx = it.x1 + param * C;
                yy = it.y1 + param * D;
            }
            dist = Math.hypot(x - xx, y - yy);
        } else if (it.type === 'circle') {
            // Distance to ring
            dist = Math.abs(Math.hypot(x - it.x, y - it.y) - it.r);
        }

        if (dist < th) {
            candidates.push({ item: it, dist: dist, index: idx }); // idx is local to visibleItems
        }
    });

    if (candidates.length === 0) return null;

    // 2. Priority Logic

    // A) Check if the "absolute last" item (most recently created) is a candidate.
    // Note: visibleItems preserves order. The last element in visibleItems is the most recent.
    const lastItem = visibleItems[visibleItems.length - 1];
    const isLastCandidate = candidates.find(c => c.item === lastItem);

    if (isLastCandidate) {
        return isLastCandidate.item; // Absolute priority to the most recent item immediately
    }

    // B) Otherwise, return the specific item that is CLOSEST to the click (Precision)
    // Sort by distance ascending
    candidates.sort((a, b) => a.dist - b.dist);

    return candidates[0].item;
};

// --- CORE EVENT HANDLERS ---
// Export these for binding in app.js or HTML

window.onDown = function (e) {
    if (!activeSampleId && document.getElementById('mainMenu').style.display !== 'none') return;
    if (!activeSampleId) return;
    const cvs = document.getElementById('cvs');
    const viewport = document.getElementById('viewport');

    if (e.target !== cvs && e.target !== viewport && e.target.id !== 'doubtOverlayMsg') return;

    // 1. Doubt Mode Interaction
    if (isDoubtMode) {
        if (e.cancelable) e.preventDefault();
        const pos = getImgPos(e);
        if (selectedItem) {
            // Already have a doubt item selected, now measuring it
            isDragging = true;
            startPos = pos;
            mode = 'doubt_measure';
        } else {
            // Try to pick a doubt item
            const clicked = findItemAt(pos.x, pos.y);
            if (clicked && clicked.isDoubt) {
                selectedItem = clicked;
                redraw();
            } else {
                selectedItem = null;
                redraw();
            }
        }
        return;
    }

    // 2. Calibration Measure Mode
    if (mode === 'measure') {
        if (e.cancelable) e.preventDefault();
        const pos = getImgPos(e);
        measurePoints.push(pos);
        redraw();
        if (measurePoints.length === 2) setTimeout(finishMeasureRef, 100);
        return;
    }

    // 3. Pan Mode
    if (mode === 'pan') {
        isDragging = true;
        panStart = {
            x: e.changedTouches ? e.changedTouches[0].clientX : e.clientX,
            y: e.changedTouches ? e.changedTouches[0].clientY : e.clientY,
            sx: viewport.scrollLeft,
            sy: viewport.scrollTop
        };
    }
    // 4. Draw Mode
    else if (mode === 'draw') {
        if (!img.src) return;
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        startPos = getImgPos(e);
    }
    // 5. Select (Edit) Mode
    else if (mode === 'select') {
        if (e.cancelable) e.preventDefault();
        const pos = getImgPos(e);
        const clicked = findItemAt(pos.x, pos.y);

        if (clicked) {
            selectedItem = clicked;
            isDragging = true;
            startPos = pos;
            dragItemStart = JSON.parse(JSON.stringify(selectedItem)); // Snapshot for relative movement

            document.getElementById('btnDelete').style.display = 'inline-block';
            if (clicked.type === 'line' && !isDoubtMode && !clicked.isDoubt) {
                document.getElementById('btnMarkDoubt').style.display = 'inline-block';
            }
        } else {
            selectedItem = null;
            document.getElementById('btnDelete').style.display = 'none';
            document.getElementById('btnMarkDoubt').style.display = 'none';
        }
        redraw();
    }
};

window.onMove = function (e) {
    if (!isDragging) return;
    const ctx = document.getElementById('cvs').getContext('2d');
    const viewport = document.getElementById('viewport');

    // Doubt Measure Drag
    if (isDoubtMode && mode === 'doubt_measure') {
        e.preventDefault();
        const curr = getImgPos(e);
        // Calculate perpendicular projection to line
        const p1 = { x: selectedItem.x1, y: selectedItem.y1 };
        const p2 = { x: selectedItem.x2, y: selectedItem.y2 };
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;

        if (dx === 0 && dy === 0) {
            perpEndPos = curr;
        } else {
            const len = Math.hypot(dx, dy);
            const perpX = -dy / len;
            const perpY = dx / len;

            const dragX = curr.x - startPos.x;
            const dragY = curr.y - startPos.y;

            // Dot product to project drag vector onto normal vector
            const dist = dragX * perpX + dragY * perpY;
            perpEndPos = {
                x: startPos.x + perpX * dist,
                y: startPos.y + perpY * dist
            };
        }
        redraw();

        // Draw live measurement line
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(perpEndPos.x, perpEndPos.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2 / currentScale;
        ctx.stroke();

        const wPx = Math.hypot(perpEndPos.x - startPos.x, perpEndPos.y - startPos.y);
        const wUm = isCalibrated ? (wPx / pixelsPerUnit) : 0;

        ctx.fillStyle = "white";
        ctx.font = "bold " + (14 / currentScale) + "px Arial";
        ctx.fillText((isCalibrated ? wUm.toFixed(1) + " µm" : "No Calib"), perpEndPos.x + 10, perpEndPos.y);
        return;
    }

    // Pan Drag
    if (mode === 'pan') {
        e.preventDefault();
        let cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        let cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        viewport.scrollLeft = panStart.sx - (cx - panStart.x);
        viewport.scrollTop = panStart.sy - (cy - panStart.y);
    }
    // Draw Drag
    else if (mode === 'draw') {
        e.preventDefault();
        const curr = getImgPos(e);
        redraw();

        // Render Live Preview
        if (activeDrawTool.startsWith('line_')) {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = CATS.fs.color;
            ctx.lineWidth = 4 / currentScale;
            ctx.stroke();
        } else if (activeDrawTool === 'circle_auto') {
            const r = Math.hypot(curr.x - startPos.x, curr.y - startPos.y);
            ctx.beginPath();
            ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 2 / currentScale;
            ctx.stroke();

            const diaUm = getMicrometers(r * 2);
            ctx.fillStyle = "white";
            ctx.font = (12 / currentScale) + "px Arial";
            ctx.fillText(isCalibrated ? diaUm.toFixed(1) + "µm" : "No Calib", curr.x, curr.y);
        }
    }
    // Move Item (Select)
    else if (mode === 'select' && selectedItem) {
        e.preventDefault();
        const curr = getImgPos(e);
        const dx = curr.x - startPos.x;
        const dy = curr.y - startPos.y;

        if (selectedItem.type === 'point' || selectedItem.type === 'circle') {
            selectedItem.x = dragItemStart.x + dx;
            selectedItem.y = dragItemStart.y + dy;
        } else {
            selectedItem.x1 = dragItemStart.x1 + dx;
            selectedItem.y1 = dragItemStart.y1 + dy;
            selectedItem.x2 = dragItemStart.x2 + dx;
            selectedItem.y2 = dragItemStart.y2 + dy;
        }
        redraw();
    }
};

window.onUp = function (e) {
    if (!isDragging) return;
    isDragging = false;

    // Finish Doubt Measure
    if (isDoubtMode && mode === 'doubt_measure') {
        if (!isCalibrated) {
            alert("You must calibrate first!");
            redraw();
            return;
        }
        const distPx = Math.hypot(perpEndPos.x - startPos.x, perpEndPos.y - startPos.y);
        const widthUm = distPx / pixelsPerUnit;

        // Auto-classify based on width
        if (widthUm < 5) selectedItem.catId = 'fs';         // Fine Scratch
        else if (widthUm < 15) selectedItem.catId = 'cs';   // Coarse Scratch
        else selectedItem.catId = 'hcs';                    // Hyper-Coarse Scratch

        selectedItem.doubtResolved = true;
        selectedItem.widthVal = widthUm;
        selectedItem = null;
        syncState();
        redraw();
        saveHistory(); // ACTION: Doubt Resolve
        return;
    }

    // Finish Drawing
    if (mode === 'draw') {
        const curr = getImgPos(e);
        const dist = Math.hypot(curr.x - startPos.x, curr.y - startPos.y);
        let newItem = null;

        if (activeDrawTool.startsWith('point_')) {
            newItem = {
                type: 'point',
                catId: activeDrawTool === 'point_sp' ? 'sp' : 'pp',
                x: curr.x, y: curr.y
            };
        } else if (activeDrawTool === 'circle_auto') {
            if (dist > 2 / currentScale) {
                let cat = 'sp';
                if (isCalibrated) {
                    const dia = (dist * 2) / pixelsPerUnit;
                    if (dia >= 10 && dia <= 55) cat = 'lp';
                    else if (dia > 55) cat = 'g';
                }
                newItem = { type: 'circle', catId: cat, x: startPos.x, y: startPos.y, r: dist };
            }
        } else if (activeDrawTool === 'line_fs') {
            if (dist > 5 / currentScale) {
                newItem = { type: 'line', catId: 'fs', x1: startPos.x, y1: startPos.y, x2: curr.x, y2: curr.y };
            }
        }

        if (newItem) {
            items.push(newItem);
            syncState();
            saveHistory(); // ACTION: Draw
        }
        redraw();
    }

    // Finish Move (Select)
    if (mode === 'select') {
        if (selectedItem) {
            syncState();
            saveHistory(); // ACTION: Move/Edit
        }
    }
};

// ==========================================================================
// CALIBRATION HELPERS
// ==========================================================================

window.startMeasureRef = function () {
    if (!img.src) {
        alert("Load image first!");
        return;
    }
    closeModal();
    setMode('measure');
    measurePoints = [];
    alert("Click the two ends of the scale bar.");
};

window.finishMeasureRef = function () {
    const d = Math.hypot(measurePoints[1].x - measurePoints[0].x, measurePoints[1].y - measurePoints[0].y);
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('manualInputArea').style.opacity = '1';
    document.getElementById('manualInputArea').style.pointerEvents = 'auto';
    document.getElementById('pixelReadout').innerText = "px: " + d.toFixed(1);
    document.getElementById('manualInputArea').dataset.d = d;
    setMode('pan');
};

window.applyManual = function () {
    const d = parseFloat(document.getElementById('manualInputArea').dataset.d);
    const val = parseFloat(document.getElementById('manInput').value);
    const unit = document.getElementById('manUnit').value;
    if (!img.src) { alert("Load image first!"); return; }
    if (!val) { alert("Enter valid number!"); return; }
    pixelsPerUnit = d / val;
    unitName = unit;
    isCalibrated = true;
    syncState();
    closeModal();
    redraw();
    alert("Calibrated!");
};

window.applyFOV = function () {
    const val = parseFloat(document.getElementById('fovInput').value);
    const unit = document.getElementById('fovUnit').value;
    if (!img.src) { alert("Load image first!"); return; }
    if (!val) { alert("Enter valid number!"); return; }
    pixelsPerUnit = img.width / val;
    unitName = unit;
    isCalibrated = true;
    syncState();
    closeModal();
    redraw();
    alert("Calibrated!");
};

window.getMicrometers = function (px) {
    if (!isCalibrated) return 0;
    const val = px / pixelsPerUnit;
    if (unitName === 'mm') return val * 1000;
    if (unitName === 'm') return val * 1000000;
    if (unitName === 'nm') return val / 1000;
    return val;
};


// ==========================================================================
// EDITING UTILS (UNDO/REDO/DELETE) w/ SNAPSHOT HISTORY
// ==========================================================================

window.resetHistory = function () {
    historyStack = [];
    historyIndex = -1;
    saveHistory(); // Auto-save initial state
};

window.saveHistory = function () {
    // 1. Truncate any "future" history (if we undid then did something new)
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }

    // 2. Snapshot current state
    const snapshot = JSON.parse(JSON.stringify(items));
    historyStack.push(snapshot);
    historyIndex++;

    // 3. Limit size
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
        historyIndex--;
    }
};

window.undo = function () {
    if (historyIndex > 0) {
        historyIndex--;
        restoreStateFromHistory();
    }
};

window.redo = function () {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        restoreStateFromHistory();
    }
};

window.restoreStateFromHistory = function () {
    const snapshot = historyStack[historyIndex];
    // Deep copy back to items to avoid reference issues
    items = JSON.parse(JSON.stringify(snapshot));
    selectedItem = null; // Deselect on undo/redo to avoid ghost selections
    document.getElementById('btnDelete').style.display = 'none';
    document.getElementById('btnMarkDoubt').style.display = 'none';
    redraw();
    syncState();
};

window.deleteSelected = function () {
    if (selectedItem) {
        items = items.filter(i => i !== selectedItem);
        selectedItem = null;
        document.getElementById('btnDelete').style.display = 'none';
        document.getElementById('btnMarkDoubt').style.display = 'none';
        redraw();
        syncState();
    }
};
