
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

    showInputDialog("Save Sample", "Filename for this sample:", currentFileName, (name) => {
        if (!name) return;

        const b = new Blob([JSON.stringify(d)], { type: "application/json" });
        const l = document.createElement('a');
        l.download = name + ".json";
        l.href = URL.createObjectURL(b);
        l.click();
    });
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
    // NEW ORDER: Id, Species, Age, ...stats..., Tooth, Side, Part, Mag
    let headers = ["Id", "Species", "Age"];

    // HEADER LOGIC
    if (mode === 'AVERAGE') {
        // Average Mode: Counts + Stats + Mag (No Tooth/Side/Part)
        STATS_ORDER.forEach(k => headers.push(CATS[k].label)); // Counts
        headers.push(
            "Crushing Index", "% Measured Pits", "Max Pit Dia", "Severity Pits",
            "Mean Scratch Width", "Aspect Ratio", "Severity Scratches", "Measured AR",
            "P/S Ratio", "Anisotropy", "Vector Consistency", "Mean Orient",
            "Bg Abrasion", "Severity Total", "Severity Ratio", "Mean Feat. Sev.",
            "Durophagy Index", "Pit Het.", "Scratch Het.", "Global Het.",
            "Density Pits", "Density Scratches", "Density Total",
            "Sev. Pits %", "Sev. Scratches %", "Sev. Total %",
            "Intersections", "Intersection Density", "Texture Complexity Index",
            "Complexity Het.", "Mean Feature Dims. (MFD)"
        );
        headers.push("Mag"); // Mag at the end
    } else {
        // Standard Modes (COUNTS, STATS, FULL)
        if (mode === 'COUNTS' || mode === 'FULL') {
            STATS_ORDER.forEach(k => headers.push(CATS[k].label));
        }
        if (mode === 'STATS' || mode === 'FULL') {
            headers.push(
                "Crushing Index", "% Measured Pits", "Max Pit Dia", "Severity Pits",
                "Mean Scratch Width", "Aspect Ratio", "Severity Scratches", "Measured AR",
                "P/S Ratio", "Anisotropy", "Vector Consistency", "Mean Orient",
                "Bg Abrasion", "Severity Total", "Severity Ratio", "Mean Feat. Sev.",
                "Durophagy Index", "Pit Het.", "Scratch Het.", "Global Het.",
                "Density Pits", "Density Scratches", "Density Total",
                "Sev. Pits %", "Sev. Scratches %", "Sev. Total %",
                "Intersections", "Intersection Density", "Texture Complexity Index",
                "Complexity Het.", "Mean Feature Dims. (MFD)"
            );
        }
        // Full Metadata for standard modes
        headers.push("Tooth", "Side", "Part", "Mag");
    }

    csv += headers.join(sep) + "\n";

    // DATA PROCESSING
    if (mode === 'AVERAGE') {
        // --- AGGREGATION LOGIC ---
        // 1. Group by Specimen ID
        const groups = {};
        const orderedIds = []; // Keep track of insertion order to match Sidebar

        projectSamples.forEach(s => {
            const spId = s.metadata && s.metadata.specimenId ? s.metadata.specimenId : s.name;
            if (!groups[spId]) {
                groups[spId] = [];
                orderedIds.push(spId); // Add to ordered list on first encounter
            }
            groups[spId].push(s);
        });

        // 2. Process each Group IN ORDER (using orderedIds instead of Object.keys)
        orderedIds.forEach(spId => {
            const groupSamples = groups[spId];
            const numSamples = groupSamples.length;
            const firstS = groupSamples[0];
            const md = firstS.metadata || {};

            // Determine Age from first sample (assuming consistency)
            let age = "A";
            if (md.tooth && (md.tooth.startsWith('d') || md.tooth.startsWith('D'))) {
                age = "J";
            }

            // Initialize Sum Containers
            let countSums = {};
            STATS_ORDER.forEach(k => countSums[k] = 0);

            // Stats keys from statistics.js return object
            const statKeys = [
                'crushingIndex', 'percMeasuredPits', 'maxPitDiameter', 'severityPits',
                'meanScratchWidth', 'aspectRatio', 'severityScratches', 'measuredAspectRatio',
                'psRatio', 'anisotropy', 'vectorConsistency', 'meanOrient',
                'bgAbrasion', 'severityTotal', 'severityRatio', 'meanFeatureSeverity',
                'durophagyIndex', 'pitHet', 'scratchHet', 'globalHet',
                'densityPits', 'densityScratches', 'densityTotal',
                'severityPitsn', 'severityScratchesn', 'severityTotaln',
                'intersectionCount', 'intersectionDensity', 'textureComplexityIndex',
                'complexityHet', 'mfd'
            ];
            let statSums = {};
            statKeys.forEach(k => statSums[k] = 0);

            // 3. Accumulate Data
            groupSamples.forEach(s => {
                // Counts
                // Re-calculate counts for safety or trust s.items? safely recalc
                let localCounts = {};
                STATS_ORDER.forEach(k => localCounts[k] = 0);
                s.items.forEach(it => { if (localCounts[it.catId] !== undefined) localCounts[it.catId]++; });

                STATS_ORDER.forEach(k => countSums[k] += localCounts[k]);

                // Stats
                const calibAdapter = s.calibration ? {
                    calibrated: s.calibration.calibrated,
                    pixelsPerUnit: s.calibration.ppu
                } : { calibrated: false, pixelsPerUnit: 1 };

                const st = getStatsFromItems(s.items, calibAdapter);
                statKeys.forEach(k => statSums[k] += (st[k] || 0));
            });

            // 4. Construct Row (Averages)
            let row = [`"${spId}"`, `"${firstS.group || currentProjectName}"`, `"${age}"`];

            // Average Counts
            STATS_ORDER.forEach(k => {
                const avg = countSums[k] / numSamples;
                row.push(avg.toFixed(2)); // Keeping decimals for averages
            });

            // Average Stats
            statKeys.forEach(k => {
                const avg = statSums[k] / numSamples;
                // Special formatting if needed, otherwise fixed(2-4)
                if (k === 'psRatio' || k.includes('Het') || k.includes('density') || k.includes('severity') && k.endsWith('n') || k === 'textureComplexityIndex' || k === 'complexityHet' || k === 'mfd') row.push(avg.toFixed(3));
                else if (k === 'bgAbrasion') row.push(avg.toFixed(4));
                else if (k === 'intersectionCount') row.push(avg.toFixed(1)); // Avg count can be decimal
                else if (k === 'intersectionDensity') row.push(avg.toFixed(1));
                else row.push(avg.toFixed(2));
            });

            // Mag (Last Column)
            row.push(`"${md.mag || ''}"`);

            csv += row.join(sep) + "\n";
        });

    } else {
        // --- STANDARD ROW-BY-ROW LOGIC ---
        projectSamples.forEach(s => {
            // Use specimenId for export if available (for replicates), otherwise name
            const exportId = s.metadata && s.metadata.specimenId ? s.metadata.specimenId : s.name;
            const md = s.metadata || {};

            // AGE LOGIC: If tooth starts with 'd' or 'D', it is Juvenile (J), else Adult (A)
            let age = "A";
            if (md.tooth && (md.tooth.startsWith('d') || md.tooth.startsWith('D'))) {
                age = "J";
            }

            // NEW ROW ORDER: Id, Species, Age
            let row = [`"${exportId}"`, `"${s.group || currentProjectName}"`, `"${age}"`];

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
                    st.crushingIndex.toFixed(2), st.percMeasuredPits.toFixed(1), st.maxPitDiameter.toFixed(2), st.severityPits.toFixed(0),
                    st.meanScratchWidth.toFixed(2), st.aspectRatio.toFixed(2), st.severityScratches.toFixed(0), st.measuredAspectRatio.toFixed(2),
                    st.psRatio.toFixed(3), st.anisotropy.toFixed(3), st.vectorConsistency.toFixed(3), st.meanOrient.toFixed(1),
                    st.bgAbrasion.toFixed(4), st.severityTotal.toFixed(0), st.severityRatio.toFixed(3), st.meanFeatureSeverity.toFixed(1),
                    st.durophagyIndex.toFixed(2), st.pitHet.toFixed(2), st.scratchHet.toFixed(2), st.globalHet.toFixed(2),
                    st.densityPits.toFixed(1), st.densityScratches.toFixed(1), st.densityTotal.toFixed(1),
                    st.severityPitsn.toFixed(3), st.severityScratchesn.toFixed(3), st.severityTotaln.toFixed(3),
                    st.intersectionCount, st.intersectionDensity.toFixed(1), st.textureComplexityIndex.toFixed(2),
                    st.complexityHet.toFixed(2), st.mfd.toFixed(2)
                );
            }

            // APPEND METADATA VALUES
            // md already defined above
            row.push(
                `"${md.tooth || ''}"`,
                `"${md.side || ''}"`,
                `"${md.part || ''}"`,
                `"${md.mag || ''}"`
            );

            csv += row.join(sep) + "\n";
        });
    }

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
            showInputDialog("New Group", "Enter Name for New Group/Species:", "New_Species", (newG) => {
                if (newG) finalizeBatchImport(newSamples, newG);
            });
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
                showInputDialog("New Project", "Enter Name for Group/Species:", "Species_1", (newG) => {
                    finalizeBatchImport(newSamples, newG || "Species_1");
                });
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
            document.getElementById('mainMenu').style.display = 'none';
        }
    }

    const file = files[0];

    if (file.name.endsWith('.json')) {
        // JSON Import
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.type === "hyaena_project") {
                    const newSamples = data.samples || [];
                    const newProjName = data.name || "Imported_Project";

                    newSamples.forEach(s => { if (!s.group) s.group = newProjName; });

                    if (projectSamples.length === 0) {
                        projectSamples = newSamples;
                        if (window.sanitizeSpecimenIds) window.sanitizeSpecimenIds(); // FIX: Sync IDs on Load
                        currentProjectName = newProjName;
                        document.getElementById('headerTitle').innerText = currentProjectName;
                        if (projectSamples[0]) loadSampleIntoView(projectSamples[0].id);
                    } else {
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
                                        if (window.sanitizeSpecimenIds) window.sanitizeSpecimenIds(); // FIX: Sync IDs on Merge
                                        renderSampleList();
                                    }
                                },
                                {
                                    label: "<b>REPLACE</b><br><span style='font-size:11px'>Discard current and load new</span>",
                                    class: "btn-red",
                                    onClick: () => {
                                        projectSamples = newSamples;
                                        if (window.sanitizeSpecimenIds) window.sanitizeSpecimenIds(); // FIX: Sync IDs on Replace
                                        currentProjectName = newProjName;
                                        document.getElementById('headerTitle').innerText = currentProjectName;
                                        if (projectSamples[0]) loadSampleIntoView(projectSamples[0].id);
                                    }
                                },
                                { label: "Cancel", class: "", onClick: () => { } }
                            ]
                        );
                    }
                } else {
                    processSingleImport(file.name.replace('.json', ''), data);
                }
            } catch (err) { console.error("Error", err); alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
        // Image Load -> Preview -> Single Sample Creation
        const meta = parseFilename(file.name);

        window.showImportPreviewDialog(meta, (confirmedData) => {
            // PREVIEW CONFIRMED
            const fname = confirmedData.id;
            const cvs = document.getElementById('cvs');
            const waitingForImage = activeSampleId && (cvs && cvs.style.display === 'none');
            const currSample = projectSamples.find(s => s.id === activeSampleId);

            if (waitingForImage && currSample) {
                // Just load image into active sample (update its metadata)
                // Use the name as Specimen ID if not already set? 
                // Actually, if we are loading into existing, we keep existing structure.

                // FORCE UNIQUE NAME IF CONFLICT
                // If the user loads "Tiger.jpg" into "Sample_1", we want "Tiger" (if unique) or "Tiger_2"
                // The current sample ID should be excluded from check
                const uniqueName = getUniqueName(fname, currSample.id);

                currSample.name = uniqueName;
                currentFileName = uniqueName;
                currSample.metadata = {
                    tooth: confirmedData.tooth,
                    side: confirmedData.side,
                    part: confirmedData.part,
                    mag: confirmedData.mag,
                    originalFilename: confirmedData.originalFilename,
                    specimenId: confirmedData.id // Specimen ID stays as parsed
                };
                renderSampleList();
                document.getElementById('headerTitle').innerText = uniqueName; // Update Header
                loadImageFromFile(file);
            } else {
                // New Sample Creation Flow
                // HANDLE DUPLICATES -> REPLICATES
                const specimenId = fname;
                const uniqueName = getUniqueName(fname);

                // Note: confirmedData comes from showImportPreviewDialog which passed 'meta'
                // We should enrich confirmedData with specimenId
                confirmedData.specimenId = specimenId;

                const newSample = initNewSample(uniqueName, confirmedData);
                // Explicitly set specimenId in metadata (initNewSample might not cover it genericly if not in 'metadata' arg structure)
                newSample.metadata.specimenId = specimenId;

                askGroupForImageImport(newSample, file);
            }
        }, () => {
            // Cancelled
            e.target.value = '';
        });
    }
    e.target.value = ''; // Reset input
};

window.askGroupForImageImport = function (newSample, file) {
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
            showInputDialog("New Group", "Enter Name for New Group/Species:", "New_Species", (newG) => {
                if (newG) {
                    newSample.group = newG;
                    finalizeSingleImport(newSample, file);
                }
            });
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
                showInputDialog("New Project", "Enter Name for Group/Species:", "Species_1", (newG) => {
                    newSample.group = newG || "Species_1";
                    finalizeSingleImport(newSample, file);
                });
            }
        }
    });
    buttons.push({ label: "Cancel", class: "", onClick: () => { } });

    showCustomDialog(
        "New Sample",
        `Where should "<b>${newSample.name}</b>" be added?`,
        buttons
    );
};

window.processSingleImport = function (name, data) {
    const specimenId = name;
    const uniqueName = getUniqueName(name);

    // Ask for group for single JSON too
    const newSample = initNewSample(uniqueName);
    newSample.metadata.specimenId = specimenId; // Store original ID for replicates

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
            showInputDialog("New Group", "Enter Name for New Group/Species:", "New_Species", (newG) => {
                if (newG) {
                    newSample.group = newG;
                    addSampleToProject(newSample);
                    renderSampleList();
                }
            });
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
                showInputDialog("New Project", "Enter Name for Group/Species:", "Species_1", (newG) => {
                    newSample.group = newG || "Species_1";
                    addSampleToProject(newSample);
                    renderSampleList();
                });
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
    document.getElementById('headerTitle').innerText = sample.name; // Update Header
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
