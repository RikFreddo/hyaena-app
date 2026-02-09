
// ==========================================================================
// PROJECT & SAMPLE MANAGEMENT
// ==========================================================================

window.initNewSample = function (name, metadata = {}) {
    return {
        id: crypto.randomUUID(),
        name: name,
        date: new Date().toISOString(),
        items: [],
        calibration: { ppu: 1, unit: 'px', calibrated: false },
        group: 'Default',
        metadata: {
            tooth: metadata.tooth || "",
            side: metadata.side || "",
            part: metadata.part || "",
            mag: metadata.mag || "",
            originalFilename: metadata.originalFilename || ""
        }
    };
};

window.createNewSample = function (promptUser = true) {
    if (promptUser) {
        // Use custom dialog for better Group Flow
        openGroupModal();
    } else {
        // Initial Start
        const name = "Sample_1";
        const newSample = initNewSample(name);
        projectSamples.push(newSample);
        activeSampleId = newSample.id;
        currentFileName = name;
        items = [];
        resetHistory();
        renderSampleList();

        // Reset UI
        if (typeof img !== 'undefined') {
            img = new Image();
            if (document.getElementById('cvs')) document.getElementById('cvs').style.display = 'none';
        }
        if (document.getElementById('noImageMsg')) document.getElementById('noImageMsg').style.display = 'block';
        if (document.getElementById('msgSampleName')) document.getElementById('msgSampleName').innerText = name;
        if (document.getElementById('stats-bar')) document.getElementById('stats-bar').innerText = "Load photo to start.";

        redraw();
    }
};

window.openGroupModal = function () {
    // 1. Get List of Existing Groups
    const existingGroups = [...new Set(projectSamples.map(s => s.group || currentProjectName))];

    // 2. Build Buttons
    const buttons = existingGroups.map(g => ({
        label: `Add to <b>${g}</b>`,
        class: "btn-blue",
        onClick: () => askForSampleName(g)
    }));

    // New Group Button
    buttons.push({
        label: `Create <b>New Group</b>`,
        class: "btn-green",
        onClick: () => {
            showInputDialog("New Group", "Enter Name for New Group/Species:", "New_Species", (newG) => {
                if (newG) askForSampleName(newG);
            });
        }
    });

    buttons.push({ label: "Cancel", class: "", onClick: () => { } });

    showCustomDialog(
        "New Sample",
        "Add new sample to which group/species?",
        buttons
    );
};

window.askForSampleName = function (groupName) {
    const defaultName = "Sample_" + (projectSamples.length + 1);
    showInputDialog("New Sample", `Creating sample in <b>${groupName}</b>.<br>Enter Sample Name:`, defaultName, (name) => {
        if (name) finalizeCreateSample(name, groupName);
    });
};

window.finalizeCreateSample = function (name, groupName) {
    try {
        if (isDuplicateName(name)) {
            alert(`Warning: A sample named "${name}" already exists.`);
        }

        syncState(); // Save current before switching

        const newSample = initNewSample(name);
        newSample.group = groupName;

        addSampleToProject(newSample);

        // Switch to it
        loadSampleIntoView(newSample.id);
        renderSampleList();
    } catch (e) {
        console.error("Error in finalizeCreateSample:", e);
        alert("Creation Error: " + e.message);
    }
};

// Deprecated but kept for compatibility if called directly
window.confirmCreateSample = function (groupName) {
    askForSampleName(groupName);
};

window.deleteSample = function (id) {
    if (confirm("Are you sure you want to delete this sample?")) {
        projectSamples = projectSamples.filter(s => s.id !== id);
        if (activeSampleId === id) {
            // Deleted active one
            if (projectSamples.length > 0) {
                loadSampleIntoView(projectSamples[0].id);
            } else {
                activeSampleId = null;
                items = [];
                currentFileName = "No Sample";
                img = new Image();
                redraw();
                document.getElementById('headerTitle').innerText = currentProjectName;
            }
        }
        renderSampleList();
    }
};

window.renameSample = function (id) {
    const s = projectSamples.find(x => x.id === id);
    if (!s) return;
    const newName = prompt("Rename sample:", s.name);
    if (newName && newName !== s.name) {
        if (isDuplicateName(newName)) {
            alert(`Name "${newName}" already exists.`);
            return;
        }
        s.name = newName;
        if (activeSampleId === id) {
            currentFileName = newName;
            document.getElementById('msgSampleName').innerText = newName;
        }
        renderSampleList();
    }
};

window.sortSamplesAZ = function () {
    projectSamples.sort((a, b) => a.name.localeCompare(b.name));
    renderSampleList();
};


// ==========================================================================
// STATE SYNC & LOADING
// ==========================================================================

window.syncState = function () {
    if (!activeSampleId) return;
    const s = projectSamples.find(x => x.id === activeSampleId);
    if (s) {
        s.items = JSON.parse(JSON.stringify(items));
        s.calibration = { ppu: pixelsPerUnit, unit: unitName, calibrated: isCalibrated };
        // Note: We don't save the image blob strictly here to avoid memory bloat
    }
};

window.loadSampleIntoView = function (id) {
    syncState(); // Save old one
    const sample = projectSamples.find(x => x.id === id);
    if (!sample) return;

    activeSampleId = sample.id;
    currentFileName = sample.name;
    items = JSON.parse(JSON.stringify(sample.items || []));

    // Restore Calibration
    if (sample.calibration) {
        pixelsPerUnit = sample.calibration.ppu;
        unitName = sample.calibration.unit;
        isCalibrated = sample.calibration.calibrated;
    } else {
        pixelsPerUnit = 1;
        unitName = 'px';
        isCalibrated = false;
    }

    // Reset History
    resetHistory();

    document.getElementById('mainMenu').style.display = 'none';

    // Image Handling
    // If the sample object *has* an image data URI stored (from small implementation), load it.
    // BUT current logic mostly relies on just keeping the one in memory if we just switched samples
    // Logic gap: If I switch sample, the image is gone unless I reload it or it is stored.
    // The previous implementation assumes we might just be annotating one image or re-loading images.

    // FIX: If we switch samples, we usually expect the image to change.
    // Since we don't hold full images in `projectSamples` (too heavy for JSON),
    // we must prompt user or clear canvas if it's a different session.
    // However, for the simple usage:
    // User loads Image -> created Sample A.
    // User creates Sample B -> (Usually same image? or New image?)
    // This refined app assumes 1 Sample = 1 Image context.

    // If sample.imageSrc exists (from import), try to use it.
    if (sample.imageSrc) {
        // To be implemented fully if we want to store base64 images (heavy)
        // For now, checks are done in the UI.
    }

    // Reset UI for new sample
    img = new Image(); // Clear current image reference
    if (document.getElementById('cvs')) document.getElementById('cvs').style.display = 'none';
    document.getElementById('noImageMsg').style.display = 'block';
    document.getElementById('msgSampleName').innerText = sample.name;
    document.getElementById('stats-bar').innerText = "Load photo to start.";

    renderSampleList();
    redraw();
};


// ==========================================================================
// SIDEBAR & LIST RENDERING
// ==========================================================================

window.dragSrcEl = null;

window.renderSampleList = function () {
    const sampleListEl = document.getElementById('sampleList');
    if (!sampleListEl) return;

    sampleListEl.innerHTML = '';
    let lastGroup = null;

    projectSamples.forEach((s, idx) => {
        // Ensure group exists
        if (!s.group) s.group = currentProjectName;

        // Insert Header if group changes (Grouping Logic)
        if (s.group !== lastGroup) {
            const h = document.createElement('li');
            h.className = 'list-header';
            h.innerText = s.group;
            sampleListEl.appendChild(h);
            lastGroup = s.group;
        }

        const li = document.createElement('li');
        li.className = 'sample-item ' + (s.id === activeSampleId ? 'active' : '');

        li.onclick = () => loadSampleIntoView(s.id);

        // Calculate mini-stats for the list item
        let counts = {};
        STATS_ORDER.forEach(k => counts[k] = 0);
        s.items.forEach(it => {
            if (counts[it.catId] !== undefined) counts[it.catId]++
        });

        let statParts = [];
        STATS_ORDER.forEach(k => {
            if (counts[k] > 0) statParts.push(`${CATS[k].label}:${counts[k]}`);
        });

        let statStr = statParts.length > 0 ? statParts.join(" | ") : "No data (0)";

        li.draggable = true;
        li.setAttribute('data-index', idx); // Creating a local data attribute for index

        // Add Drag & Drop Event Listeners
        li.addEventListener('dragstart', handleDragStart, false);
        li.addEventListener('dragenter', handleDragEnter, false);
        li.addEventListener('dragover', handleDragOver, false);
        li.addEventListener('dragleave', handleDragLeave, false);
        li.addEventListener('drop', handleDrop, false);
        li.addEventListener('dragend', handleDragEnd, false);

        // Build HTML for the list item
        const md = s.metadata || {};
        li.innerHTML = `
<div class="sample-info">
<div class="sample-name">${s.name}</div>
<div class="sample-stats">${statStr}</div>
<div class="sample-warning ${activeSampleId === s.id && !img.src ? 'no-img' : ''}">⚠️ No Image</div>
</div>

<!-- Metadata Columns (Visible in Fullscreen) -->
<div class="meta-col" title="Tooth">${md.tooth || '-'}</div>
<div class="meta-col" title="Side">${md.side || '-'}</div>
<div class="meta-col" title="Part">${md.part || '-'}</div>
<div class="meta-col" title="Mag">${md.mag || '-'}</div>

<div class="btn-icon-group">
<button class="btn-icon-small" onclick="event.stopPropagation(); renameSample('${s.id}')" title="Rename">✎</button>
<button class="btn-icon-small danger" onclick="event.stopPropagation(); deleteSample('${s.id}')" title="Delete">🗑️</button>
</div>
`;
        sampleListEl.appendChild(li);
    });
};

window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.remove('fullscreen');
    document.getElementById('sidebar').classList.toggle('collapsed');
};

window.toggleSidebarFullscreen = function () {
    document.getElementById('sidebar').classList.remove('collapsed');
    document.getElementById('sidebar').classList.toggle('fullscreen');
};

// ==========================================================================
// DRAG & DROP HANDLERS
// ==========================================================================

window.handleDragStart = function (e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
};

window.handleDragOver = function (e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
};

window.handleDragEnter = function (e) {
    this.classList.add('drag-over');
};

window.handleDragLeave = function (e) {
    this.classList.remove('drag-over');
};

window.handleDrop = function (e) {
    if (e.stopPropagation) e.stopPropagation();

    const srcIdx = parseInt(dragSrcEl.getAttribute('data-index'));
    const targetIdx = parseInt(this.getAttribute('data-index'));

    if (srcIdx !== targetIdx) {
        // Move in array
        const movedItem = projectSamples[srcIdx];

        // --- LOGIC CHANGE: PREVENT CROSS-GROUP DRAGGING IF NEEDED ---
        // For now, allow it, but update the group of the moved item to match target?
        // Or just reorder global list?
        // Simple reorder:
        projectSamples.splice(srcIdx, 1);
        projectSamples.splice(targetIdx, 0, movedItem);

        // Auto-update group if moved into different group block
        // (Simplistic approach: adopt group of neighbour/target)
        // Check surrounding items to infer group
        // If we really want "Drop into group", we need robust logic.
        // For now: Just reorder list. The group property stays same unless we logic it.
        // Let's adopt the group of the TARGET we dropped ON or BEFORE.
        movedItem.group = projectSamples[targetIdx].group;
        // Note: targetIdx is the index *after* splice removal/insert? 
        // Actually splice logic above is correct for Array move.
        // But let's refine group sync:
        if (projectSamples[targetIdx]) {
            movedItem.group = projectSamples[targetIdx].group;
        }

        renderSampleList();
    }
    return false;
};

window.handleDragEnd = function (e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.sample-item').forEach(item => {
        item.classList.remove('drag-over');
    });
};


// Wrappers since we split logic
window.addSampleToProject = function (sample) {
    // Find insertion point: last item of the same group
    let insertIdx = -1;
    for (let i = projectSamples.length - 1; i >= 0; i--) {
        if (projectSamples[i].group === sample.group) {
            insertIdx = i;
            break;
        }
    }

    if (insertIdx !== -1) {
        // Insert after the last item of the group
        projectSamples.splice(insertIdx + 1, 0, sample);
    } else {
        // New group or empty list, append to end
        projectSamples.push(sample);
    }
};

window.isDuplicateName = function (name) {
    return projectSamples.some(s => s.name === name);
};
