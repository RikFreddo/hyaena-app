
// ==========================================================================
// FILE I/O: SAVE & EXPORT
// ==========================================================================

window.saveSingleSample = function () {
    if (!img.src) {
        alert("No image loaded!");
        return;
    }
    syncState();
    const d = {
        imageSrc: img.src, // WARNING: Base64 strings can be very large
        items: items,
        calibration: { ppu: pixelsPerUnit, unit: unitName, calibrated: isCalibrated },
        date: new Date().toISOString()
    };

    let name = prompt("Filename for this sample:", currentFileName);
    if (!name) return;

    const b = new Blob([JSON.stringify(d)], { type: "application/json" });
    const l = document.createElement('a');
    l.download = name + ".json";
    l.href = URL.createObjectURL(b);
    l.click();
};

window.saveProject = function () {
    syncState();
    if (projectSamples.length === 0) {
        alert("Project is empty.");
        return;
    }
    const projectData = {
        type: "hyaena_project",
        version: 1,
        name: currentProjectName,
        date: new Date().toISOString(),
        samples: projectSamples
    };
    const b = new Blob([JSON.stringify(projectData)], { type: "application/json" });
    const l = document.createElement('a');
    l.download = currentProjectName + ".json";
    l.href = URL.createObjectURL(b);
    l.click();
};

window.exportExcel = function (mode) {
    if (window.closeStatsModal) window.closeStatsModal();
    else document.getElementById('statsModalOverlay').style.display = 'none';

    if (projectSamples.length === 0) {
        alert("No data!");
        return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const safeName = currentProjectName.replace(/\s+/g, '_');
    const fname = `${safeName}_${mode}_${dateStr}.csv`;
    const sep = ";";
    let csv = "";

    // Headers
    let headers = ["Group", "Sample Name", "Calibrated"];

    if (mode === 'COUNTS' || mode === 'FULL') {
        STATS_ORDER.forEach(k => headers.push(CATS[k].label));
    }
    if (mode === 'STATS' || mode === 'FULL') {
        // Add robust headers
        headers.push(
            "Crushing Index", "% Large Pits", "Max Pit Dia", "Severity Pits",
            "Mean Scratch Width", "Aspect Ratio", "Severity Scratches", "Measured AR",
            "P/S Ratio", "Anisotropy", "Vector Consistency", "Mean Orient",
            "Bg Abrasion", "Severity Total", "Severity Ratio", "Mean Feat. Sev.",
            "Durophagy Index", "Pit Het.", "Scratch Het.", "Global Het."
        );
    }
    csv += headers.join(sep) + "\n";

    projectSamples.forEach(s => {
        let row = [`"${s.group || currentProjectName}"`, `"${s.name}"`, s.calibration && s.calibration.calibrated ? 'Yes' : 'No'];

        if (mode === 'COUNTS' || mode === 'FULL') {
            let counts = {};
            STATS_ORDER.forEach(k => counts[k] = 0);
            s.items.forEach(it => { if (counts[it.catId] !== undefined) counts[it.catId]++; });
            STATS_ORDER.forEach(k => row.push(counts[k]));
        }

        if (mode === 'STATS' || mode === 'FULL') {
            const calibAdapter = s.calibration ? {
                calibrated: s.calibration.calibrated,
                pixelsPerUnit: s.calibration.ppu
            } : { calibrated: false, pixelsPerUnit: 1 };

            const st = getStatsFromItems(s.items, calibAdapter);

            // Based on statistics.js return object
            row.push(
                st.crushingIndex.toFixed(2), st.percLargePits.toFixed(1), st.maxPitDiameter.toFixed(2), st.severityPits.toFixed(0),
                st.meanScratchWidth.toFixed(2), st.aspectRatio.toFixed(2), st.severityScratches.toFixed(0), st.measuredAspectRatio.toFixed(2),
                st.psRatio.toFixed(3), st.anisotropy.toFixed(3), st.vectorConsistency.toFixed(3), st.meanOrient.toFixed(1),
                st.bgAbrasion.toFixed(4), st.severityTotal.toFixed(0), st.severityRatio.toFixed(3), st.meanFeatureSeverity.toFixed(1),
                st.durophagyIndex.toFixed(2), st.pitHet.toFixed(2), st.scratchHet.toFixed(2), st.globalHet.toFixed(2)
            );
        }
        csv += row.join(sep) + "\n";
    });

    const l = document.createElement('a');
    l.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    l.download = fname;
    l.click();
};

window.downloadImg = function () {
    try {
        if (!img.src) { alert("No image loaded/visible to download."); return; }
        const cvs = document.getElementById('cvs');
        const p = selectedItem;
        selectedItem = null;
        redraw();

        const l = document.createElement('a');
        l.download = currentFileName + "_samp.jpg";
        l.href = cvs.toDataURL('image/jpeg', 0.9);
        l.click();

        selectedItem = p; // Restore selection
        redraw();
    } catch (e) { alert("Export Error: " + e.message); }
};

window.downloadImgWithCounts = function () {
    try {
        if (!img.src) { alert("No image loaded/visible to download."); return; }
        const cvs = document.getElementById('cvs');
        const ctx = cvs.getContext('2d');
        const p = selectedItem;
        selectedItem = null;

        // Draw clean image first
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(img, 0, 0);
        redraw();

        let counts = {};
        STATS_ORDER.forEach(k => counts[k] = 0);
        if (items) items.forEach(it => { if (counts[it.catId] !== undefined) counts[it.catId]++ });

        let statsText = `Calib: ${isCalibrated ? 'YES' : 'NO'} | `;
        STATS_ORDER.forEach(k => {
            if (CATS[k]) statsText += `${CATS[k].label}: ${counts[k]} | `;
        });

        const H = cvs.height;
        const W = cvs.width;
        const barH = Math.max(30, H * 0.05);

        // Draw Stats Banner
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(0, H - barH, W, barH);

        ctx.fillStyle = "black";
        ctx.font = "bold " + (barH * 0.5) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(statsText, W / 2, H - barH / 2);

        const l = document.createElement('a');
        l.download = currentFileName + "_count.jpg";
        l.href = cvs.toDataURL('image/jpeg', 0.9);
        l.click();

        selectedItem = p;
        redraw();
    } catch (e) { alert("Export Error: " + e.message); }
};

// ==========================================================================
// BATCH IMPORT LOGIC
// ==========================================================================
window.stagedFiles = [];

window.openImportModal = function () {
    stagedFiles = [];
    renderStagedList();
    document.getElementById('importModal').style.display = 'flex';
    // Hide Menu if open
    if (document.getElementById('menuDropdown').classList.contains('show')) toggleDropdown('menuDropdown');
};

window.closeImportModal = function () {
    document.getElementById('importModal').style.display = 'none';
    stagedFiles = [];
};

window.handleBatchSelect = function (input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    files.forEach(f => {
        // simple duplicate check by name
        if (!stagedFiles.some(sf => sf.name === f.name)) {
            stagedFiles.push(f);
        }
    });

    renderStagedList();
    input.value = ''; // allow re-selecting same folder/files if needed
};

window.renderStagedList = function () {
    const listEl = document.getElementById('stagedFilesList');
    const btnImport = document.getElementById('btnImportAll');
    listEl.innerHTML = '';

    if (stagedFiles.length === 0) {
        listEl.innerHTML = `<li style="padding:15px; text-align:center; color:var(--text-sec); font-style:italic;">No files selected</li>`;
        btnImport.disabled = true;
        return;
    }

    btnImport.disabled = false;
    stagedFiles.forEach((f, idx) => {
        const li = document.createElement('li');
        li.style.cssText = "padding:8px 12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; color:var(--text-main); font-size:13px;";

        const nameSpan = document.createElement('span');
        nameSpan.innerText = f.name;

        const delBtn = document.createElement('button');
        delBtn.innerText = "✕";
        delBtn.className = "btn-icon-small danger";
        delBtn.style.marginLeft = "10px";
        delBtn.onclick = () => {
            stagedFiles.splice(idx, 1);
            renderStagedList();
        };

        li.appendChild(nameSpan);
        li.appendChild(delBtn);
        listEl.appendChild(li);
    });
};

window.importAllStaged = async function () {
    if (stagedFiles.length === 0) return;

    document.getElementById('importModal').style.display = 'none';

    // 1. Read all files first
    const fileReads = stagedFiles.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = evt => {
                try {
                    const data = JSON.parse(evt.target.result);
                    // Normalize to sample object
                    let s = null;
                    if (data.type === 'hyaena_project') {
                        // If user selected a project file by mistake in batch, take its samples
                        s = data.samples || [];
                    } else {
                        // Single sample
                        const name = file.name.replace('.json', '');
                        s = initNewSample(name);
                        s.items = data.items || [];
                        if (data.calibration) {
                            s.calibration = { ppu: data.calibration.ppu, unit: data.calibration.unit, calibrated: true };
                        }
                    }
                    resolve(Array.isArray(s) ? s : [s]);
                } catch (e) {
                    console.error("Error batch parsing", file.name, e);
                    resolve([]); // Skip bad files
                }
            };
            reader.readAsText(file);
        });
    });

    // Wait for all to be read
    const results = await Promise.all(fileReads);
    // Flatten array of arrays
    const newSamples = results.flat();

    if (newSamples.length === 0) {
        alert("No valid samples imported.");
        return;
    }

    // Check for duplicates
    const duplicates = newSamples.filter(s => isDuplicateName(s.name));
    if (duplicates.length > 0) {
        const names = duplicates.map(d => d.name).join(", ");
        alert("Warning: The following samples already exist in the project:\n" + names + "\n\nCreating duplicates.");
    }

    // 2. Ask User for Group (Generic Dialog)
    const existingGroups = [...new Set(projectSamples.map(x => x.group || currentProjectName))];

    const buttons = existingGroups.map(g => ({
        label: `Add to <b>${g}</b>`,
        class: "btn-blue",
        onClick: () => {
            finalizeBatchImport(newSamples, g);
        }
    }));

    buttons.push({
        label: `Create <b>New Group</b>`,
        class: "btn-green",
        onClick: () => {
            const newG = prompt("Enter Name for New Group/Species:", "New_Species");
            if (newG) finalizeBatchImport(newSamples, newG);
        }
    });

    buttons.push({
        label: `Start <b>New Session</b>`,
        class: "btn-red",
        onClick: () => {
            if (confirm("This will clear the current project. Continue?")) {
                // Reset Project and start fresh
                currentProjectName = "New_Project";
                document.getElementById('headerTitle').innerText = currentProjectName;
                projectSamples = [];
                const newG = prompt("Enter Name for Group/Species:", "Species_1");
                finalizeBatchImport(newSamples, newG || "Species_1");
            }
        }
    });
    buttons.push({ label: "Cancel", class: "", onClick: () => { } });

    showCustomDialog(
        "Batch Import",
        `Ready to import <b>${newSamples.length}</b> samples.<br>Select target Group:`,
        buttons
    );
};

window.finalizeBatchImport = function (samples, groupName) {
    samples.forEach(s => {
        s.group = groupName;
        addSampleToProject(s);
    });
    renderSampleList();
    stagedFiles = []; // Clear buffer only after success
};

// ==========================================================================
// SINGLE FILE IMPORT LOGIC
// ==========================================================================

window.handleFileSelection = function (e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (document.getElementById('mainMenu').style.display !== 'none') {
        const s = document.getElementById('mainMenu').style.display;
        if (s !== 'none') {
            // If main menu is open, we assume starting a new flow
            // but 'startApp()' is actually just hiding the menu mainly?
            // Let's hide it manually if needed.
            document.getElementById('mainMenu').style.display = 'none';
        }
    }

    const file = files[0]; // Process first file only in this simplistic logic

    if (file.name.endsWith('.json')) {
        // JSON Import
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.type === "hyaena_project") {
                    const newSamples = data.samples || [];
                    const newProjName = data.name || "Imported_Project";

                    // Tag imported samples
                    newSamples.forEach(s => { if (!s.group) s.group = newProjName; });

                    if (projectSamples.length === 0) {
                        // Direct load if empty
                        projectSamples = newSamples;
                        currentProjectName = newProjName;
                        document.getElementById('headerTitle').innerText = currentProjectName;
                        loadSampleIntoView(projectSamples[0].id);
                    } else {
                        // CUSTOM DIALOG: MERGE vs REPLACE
                        showCustomDialog(
                            "Import Project",
                            `Ready to import "${newProjName}" (${newSamples.length} samples).`,
                            [
                                {
                                    label: "<b>MERGE (Append)</b><br><span style='font-size:11px'>Add to current list as new group</span>",
                                    class: "btn-green",
                                    onClick: () => {
                                        projectSamples.forEach(s => { if (!s.group) s.group = currentProjectName; });
                                        projectSamples = projectSamples.concat(newSamples);
                                        renderSampleList();
                                    }
                                },
                                {
                                    label: "<b>REPLACE</b><br><span style='font-size:11px'>Discard current and load new</span>",
                                    class: "btn-red",
                                    onClick: () => {
                                        projectSamples = newSamples;
                                        currentProjectName = newProjName;
                                        document.getElementById('headerTitle').innerText = currentProjectName;
                                        loadSampleIntoView(projectSamples[0].id);
                                    }
                                },
                                { label: "Cancel", class: "", onClick: () => { } }
                            ]
                        );
                    }
                } else {
                    // Single Sample JSON Import
                    processSingleImport(file.name.replace('.json', ''), data);
                }
            } catch (err) { console.error("Error", err); alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
        // Image Load -> Single Sample Creation
        // Use parseFilename (Global from js/utils.js)
        const meta = parseFilename(file.name);
        const fname = meta.id; // Use the parsed ID as the sample name
        const currSample = projectSamples.find(s => s.id === activeSampleId);
        const waitingForImage = activeSampleId && (cvs.style.display === 'none');

        if (waitingForImage) {
            // Just load image into active sample
            if (currSample && (currSample.name.startsWith("Sample_") || currSample.items.length === 0)) {
                // If generic name, adopt file name.
                currSample.name = fname;
                currentFileName = fname;
            }
            renderSampleList();
            loadImageFromFile(file);
        } else {
            // Create NEW sample from image -> Ask for Group
            if (isDuplicateName(fname)) {
                alert(`Warning: The sample "${fname}" already exists.`);
            }
            const newSample = initNewSample(fname);

            // Prepare Group Selection
            const existingGroups = [...new Set(projectSamples.map(s => s.group || currentProjectName))];
            const buttons = existingGroups.map(g => ({
                label: `Add to <b>${g}</b>`,
                class: "btn-blue",
                onClick: () => {
                    newSample.group = g;
                    finalizeSingleImport(newSample, file);
                }
            }));

            buttons.push({
                label: `Create <b>New Group</b>`,
                class: "btn-green",
                onClick: () => {
                    const newG = prompt("Enter Name for New Group/Species:", "New_Species");
                    if (newG) {
                        newSample.group = newG;
                        finalizeSingleImport(newSample, file);
                    }
                }
            });
            buttons.push({
                label: `Start <b>New Session</b>`,
                class: "btn-red",
                onClick: () => {
                    if (confirm("This will clear the current project. Continue?")) {
                        currentProjectName = "New_Project";
                        document.getElementById('headerTitle').innerText = currentProjectName;
                        projectSamples = [];
                        const newG = prompt("Enter Name for Group/Species:", "Species_1");
                        newSample.group = newG || "Species_1";
                        finalizeSingleImport(newSample, file);
                    }
                }
            });
            buttons.push({ label: "Cancel", class: "", onClick: () => { } });

            showCustomDialog(
                "New Sample",
                `Where should "${fname}" be added?`,
                buttons
            );
        }
    }
    e.target.value = ''; // Reset input
};

window.processSingleImport = function (name, data) {
    if (isDuplicateName(name)) {
        alert(`Warning: The sample "${name}" already exists in the current project.`);
    }

    // Ask for group for single JSON too
    const newSample = initNewSample(name);
    newSample.items = data.items || [];
    if (data.calibration) {
        newSample.calibration = { ppu: data.calibration.ppu, unit: data.calibration.unit, calibrated: true };
    }

    const existingGroups = [...new Set(projectSamples.map(s => s.group || currentProjectName))];
    const buttons = existingGroups.map(g => ({
        label: `Add to <b>${g}</b>`,
        class: "btn-blue",
        onClick: () => {
            newSample.group = g;
            addSampleToProject(newSample);
            renderSampleList();
        }
    }));
    buttons.push({
        label: `Create <b>New Group</b>`,
        class: "btn-green",
        onClick: () => {
            const newG = prompt("Enter Name for New Group/Species:", "New_Species");
            if (newG) {
                newSample.group = newG;
                addSampleToProject(newSample);
                renderSampleList();
            }
        }
    });
    buttons.push({
        label: `Start <b>New Session</b>`,
        class: "btn-red",
        onClick: () => {
            if (confirm("This will clear the current project. Continue?")) {
                currentProjectName = "New_Project";
                document.getElementById('headerTitle').innerText = currentProjectName;
                projectSamples = [];
                const newG = prompt("Enter Name for Group/Species:", "Species_1");
                newSample.group = newG || "Species_1";
                addSampleToProject(newSample);
                renderSampleList();
            }
        }
    });
    buttons.push({ label: "Cancel", class: "", onClick: () => { } });

    showCustomDialog("Import Sample", `Import "${name}" to which group?`, buttons);
};

window.finalizeSingleImport = function (sample, imgFile) {
    addSampleToProject(sample);
    activeSampleId = sample.id;
    // Don't call syncState because we want to load fresh
    // But we need to ensure previous state is guarded? 
    // Actually, addSampleToProject just adds it. We need to switch view.

    // Switch logic
    if (!imgFile) {
        // Just load
        loadSampleIntoView(sample.id);
        return;
    }

    // If image file provided, we need to load it manually after setting active
    activeSampleId = sample.id;
    currentFileName = sample.name;
    items = []; // Clear items
    redoStack = [];
    isCalibrated = false;

    loadImageFromFile(imgFile);
};

window.triggerLoadProject = function () {
    document.getElementById('inpProject').click();
};

window.loadImageFromFile = function (file) {
    const r = new FileReader();
    r.onload = evt => {
        img = new Image();
        img.onload = () => {
            const cvs = document.getElementById('cvs');
            cvs.style.display = 'block';
            cvs.width = img.width;
            cvs.height = img.height;
            document.getElementById('noImageMsg').style.display = 'none';
            fitToScreen();
            renderSampleList();
            redraw();
        };
        img.src = evt.target.result;
    };
    r.readAsDataURL(file);
};
