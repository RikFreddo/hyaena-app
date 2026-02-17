
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
        if (document.getElementById('headerTitle')) document.getElementById('headerTitle').innerText = name; // Show Sample Name in Header
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
    const defaultName = getUniqueName("Sample_" + (projectSamples.length + 1));
    showInputDialog("New Sample", `Creating sample in <b>${groupName}</b>.<br>Enter Sample Name:`, defaultName, (name) => {
        if (name) finalizeCreateSample(name, groupName);
    });
};

window.finalizeCreateSample = function (name, groupName) {
    try {
        // Enforce Unique Name
        const uniqueName = getUniqueName(name);

        syncState(); // Save current before switching

        const newSample = initNewSample(uniqueName);
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
    const s = projectSamples.find(x => x.id === id);
    if (!s) return;

    showCustomDialog(
        "Delete Sample",
        `Are you sure you want to delete sample "<b>${s.name}</b>"?<br>This cannot be undone.`,
        [
            {
                label: "Delete",
                class: "btn-red",
                onClick: () => performDeleteSample(id)
            },
            {
                label: "Cancel",
                class: "btn-gray", // Optional class for cancel
                onClick: () => { }
            }
        ]
    );
};

window.performDeleteSample = function (id) {
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
            document.getElementById('headerTitle').innerText = currentProjectName; // Fallback to Project Name
        }
    }
    renderSampleList();
};

window.editSampleMetadata = function (id) {
    const s = projectSamples.find(x => x.id === id);
    if (!s) return;

    showEditSampleDialog(s, (newData) => {
        let nameChanged = false;
        // Handle Name Change
        if (newData.name !== s.name) {
            if (isDuplicateName(newData.name)) {
                alert(`Name "${newData.name}" already exists. Please choose another.`);
                return;
            }
            s.name = newData.name;
            nameChanged = true;
        }

        // Update Metadata (This overwrites s.metadata with values from dialog, potentially old specimenId)
        s.metadata = { ...s.metadata, ...newData.metadata };

        // [FIX] ALWAYS SYNC SPECIMEN ID WITH CURRENT NAME (USER REQUEST PRIORITIZES THIS)
        // Regardless of whether name actually changed, we ensure ID matches the current name
        // This fixes cases where ID was wrong/stale and user just hit Save.
        const parser = (window.parseFilename || parseFilename);
        if (parser) {
            try {
                const parsed = parser(s.name); // s.name is already updated
                if (parsed && parsed.id) {
                    s.metadata.specimenId = parsed.id;
                }
            } catch (e) {
                console.error("Error parsing filename during rename:", e);
            }
        }

        // Update UI
        if (activeSampleId === id) {
            currentFileName = s.name;
            document.getElementById('msgSampleName').innerText = s.name;
            document.getElementById('headerTitle').innerText = s.name;
        }
        renderSampleList();
    });
};

// Deprecated alias
window.renameSample = function (id) {
    editSampleMetadata(id);
};

window.renameProject = function () {
    showInputDialog("Rename Project", "Enter new name for the project:", currentProjectName, (newName) => {
        if (newName && newName !== currentProjectName) {
            currentProjectName = newName;
            document.getElementById('projNameDisplay').innerText = newName;
            // Only update header if NO sample is active, otherwise keep sample name
            if (!activeSampleId) {
                document.getElementById('headerTitle').innerText = newName;
            }
        }
    });
};

window.renameGroup = function (oldGroupName) {
    showInputDialog("Rename Group", `Enter new name for group "<b>${oldGroupName}</b>":`, oldGroupName, (newGroupName) => {
        if (newGroupName && newGroupName !== oldGroupName) {
            let count = 0;
            projectSamples.forEach(s => {
                if (s.group === oldGroupName) {
                    s.group = newGroupName;
                    count++;
                }
            });
            renderSampleList();
        }
    });
};

window.sortSamplesAZ = function () {
    projectSamples.sort((a, b) => {
        // Primary Sort: Group Name (Alphabetical)
        // Handle missing groups by treating as empty string or specific logic
        const groupA = (a.group || "").toLowerCase();
        const groupB = (b.group || "").toLowerCase();

        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;

        // Secondary Sort: Sample Name (Alphabetical) within same group
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
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
    // If sample.imageSrc exists (from import), try to use it.
    if (sample.imageSrc) {
        // Placeholder for future logic
    }

    // Reset UI for new sample
    img = new Image(); // Clear current image reference
    if (document.getElementById('cvs')) document.getElementById('cvs').style.display = 'none';
    document.getElementById('noImageMsg').style.display = 'block';
    document.getElementById('msgSampleName').innerText = sample.name;
    document.getElementById('headerTitle').innerText = sample.name; // Show Sample Name
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
            h.style.display = 'flex';
            h.style.justifyContent = 'space-between';
            h.style.alignItems = 'center';

            const titleSpan = document.createElement('span');
            titleSpan.innerText = s.group;
            h.appendChild(titleSpan);

            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-icon-small';
            btnEdit.innerHTML = '✎';
            btnEdit.title = 'Rename Group';
            btnEdit.style.fontSize = '12px';
            btnEdit.style.opacity = '0.7';
            btnEdit.onclick = (e) => {
                e.stopPropagation();
                renameGroup(s.group);
            };
            h.appendChild(btnEdit);

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

        // Safe Display Logic for Age (Does not modify data)
        let displayAge = md.age;
        // Treat whitespace-only as empty to force inference
        if (!displayAge || (typeof displayAge === 'string' && !displayAge.trim())) {
            // Infer from Tooth
            const t = (md.tooth || "").toLowerCase();
            if (t.startsWith('d')) displayAge = "J";
            else displayAge = "A";
        }

        li.innerHTML = `
<div class="sample-info">
<div class="sample-name">${s.name}</div>
<div class="sample-stats">${statStr}</div>
<div class="sample-warning ${activeSampleId === s.id && !img.src ? 'no-img' : ''}">⚠️ No Image</div>
</div>

<!-- Metadata Columns (Visible in Fullscreen) -->
<div class="meta-col" title="Tooth">🦷 ${md.tooth || '-'}</div>
<div class="meta-col" title="Age">⏳ ${displayAge}</div>
<div class="meta-col" title="Side">📍 ${md.side || '-'}</div>
<div class="meta-col" title="Part">🧩 ${md.part || '-'}</div>
<div class="meta-col" title="Mag">🔎 ${md.mag || '-'}</div>

<div class="btn-icon-group">
<button class="btn-icon-small" onclick="event.stopPropagation(); editSampleMetadata('${s.id}')" title="Edit Details">✎</button>
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

        projectSamples.splice(srcIdx, 1);
        projectSamples.splice(targetIdx, 0, movedItem);

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

// ==========================================================================
// METADATA UTILS
// ==========================================================================

window.getUniqueName = function (baseName, excludeId = null) {
    let name = baseName;
    let count = 2;
    // Check if name exists, excluding the current sample (if excludeId provided)
    while (projectSamples.some(s => s.name === name && s.id !== excludeId)) {
        name = `${baseName}_${count}`;
        count++;
    }
    return name;
};

window.regenerateMetadata = function () {
    showCustomDialog(
        "Regenerate Metadata",
        "Regenerate metadata for all samples based on their filenames?<br><br><b>This will overwrite</b> existing Tooth, Side, Part, Mag fields AND <b>Rename Samples</b> to their clean IDs.",
        [
            {
                label: "Regenerate & Rename",
                class: "btn-green",
                onClick: () => performRegeneration()
            },
            {
                label: "Cancel",
                class: "btn-gray",
                onClick: () => { }
            }
        ]
    );
};

window.sanitizeSpecimenIds = function () {
    let count = 0;
    projectSamples.forEach(s => {
        // Enforce SpecimenID from Current Name
        // This ensures export/aggregation always matches the visible list name
        // parseFilename handles stripping suffixes like _2 automatically
        if (typeof parseFilename === 'function') {
            const parsed = parseFilename(s.name); // Always use name
            if (parsed && parsed.id) {
                // If ID is different or missing, update it
                if (!s.metadata) s.metadata = {};
                if (s.metadata.specimenId !== parsed.id) {
                    s.metadata.specimenId = parsed.id;
                    count++;
                }
            }
        }
    });
    if (count > 0) {
        console.log(`[Sanitize] Updated specimenId for ${count} samples based on current names.`);
    }
};

window.performRegeneration = function () {
    let count = 0;
    projectSamples.forEach(s => {
        // Source to parse: ALWAYS use current Name as source of truth
        // User requested manual renames to be priority over originalFilename
        const source = s.name;

        // Use the utility function from utils.js
        if (typeof parseFilename === 'function') {
            const parsed = parseFilename(source);

            let modified = false;
            // Ensure metadata object exists
            if (!s.metadata) s.metadata = {};

            // Update fields if parsed value is valid and different
            if (parsed.tooth && s.metadata.tooth !== parsed.tooth) { s.metadata.tooth = parsed.tooth; modified = true; }
            if (parsed.side && s.metadata.side !== parsed.side) { s.metadata.side = parsed.side; modified = true; }
            if (parsed.part && s.metadata.part !== parsed.part) { s.metadata.part = parsed.part; modified = true; }
            if (parsed.mag && s.metadata.mag !== parsed.mag) { s.metadata.mag = parsed.mag; modified = true; }

            // RENAME SAMPLE TO CLEAN ID (UNIQUE)
            // IF the current name is different from what parsing suggests (meaning it might be dirty?)
            // But if we trust s.name, maybe we shouldn't rename it unless it's to fix casing?
            // Actually, if s.name is "FSL2013_2", parsed.id is "FSL2013".
            // Regeneration usually wants to restore "Clean" names.
            // Let's keep rename logic but driven by the name itself (so it might just confirm it).
            if (parsed.id) {
                // Generate a unique name based on parsed ID, excluding self
                const newName = getUniqueName(parsed.id, s.id);

                if (s.name !== newName) {
                    s.name = newName;
                    modified = true;
                }
            }

            // Sync specimenId (Keep clean ID, do not add suffix _2 etc to metadata ID)
            if (!s.metadata.specimenId || s.metadata.specimenId !== parsed.id) {
                s.metadata.specimenId = parsed.id;
                modified = true;
            }

            if (modified) count++;
        }
    });

    renderSampleList();

    // If active sample was renamed, update header
    if (activeSampleId) {
        const activeS = projectSamples.find(s => s.id === activeSampleId);
        if (activeS) {
            document.getElementById('msgSampleName').innerText = activeS.name;
            document.getElementById('headerTitle').innerText = activeS.name;
            currentFileName = activeS.name;
        }
    }

    // Show success message using Custom Dialog too, instead of alert
    showCustomDialog(
        "Regeneration Complete",
        `Metadata regenerated and samples renamed for <b>${count}</b> samples.<br>Specimen IDs synced with current names.`,
        [
            { label: "OK", class: "btn-blue", onClick: () => toggleSettings() }
        ]
    );
};
