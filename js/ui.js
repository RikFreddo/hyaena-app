
// ==========================================================================
// UI INTERACTION & DOM MANIPULATION
// ==========================================================================

window.toggleDropdown = function (id) {
    document.getElementById(id).classList.toggle("show");
};

// Close dropdowns if clicking outside
window.onclick = function (event) {
    if (!event.target.matches('.btn') && !event.target.matches('.btn *')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
    // Also close modal if clicking outside box (optional - currently overlay blocks)
};


// ==========================================================================
// THEME HANDLING
// ==========================================================================

window.setTheme = function (theme) {
    localStorage.setItem('hyaena_theme', theme);
    applyTheme(theme);
    updateThemeUI(theme);
};

window.applyTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
};

window.updateThemeUI = function (theme) {
    document.querySelectorAll('.theme-opt').forEach(el => el.classList.remove('selected'));
    if (theme === 'dark') document.getElementById('optDark').classList.add('selected');
    else document.getElementById('optLight').classList.add('selected');
};

window.toggleSettings = function () {
    const el = document.getElementById('settingsPanel');
    el.style.display = (el.style.display === 'flex') ? 'none' : 'flex';
};


// ==========================================================================
// CUSTOM DIALOG & MODAL UTILITIES
// ==========================================================================

window.openCalibration = function () {
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.closeModal = function () {
    document.getElementById('modalOverlay').style.display = 'none';
    if (window.setMode) window.setMode('pan');
};

window.showCustomDialog = function (title, message, buttons, contentNode = null) {
    const overlay = document.getElementById('dialogOverlay');
    document.getElementById('dialogTitle').innerText = title;
    document.getElementById('dialogMessage').innerHTML = message;

    const btnContainer = document.getElementById('dialogButtons');
    btnContainer.innerHTML = '';

    const contentContainer = document.getElementById('dialogContent');
    contentContainer.innerHTML = '';
    if (contentNode) contentContainer.appendChild(contentNode);

    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = `btn ${btn.class || ''}`;
        b.style.justifyContent = 'center';
        b.style.padding = '12px';
        b.innerHTML = btn.label;
        b.onclick = () => {
            overlay.style.display = 'none';
            if (btn.onClick) btn.onClick();
        };
        btnContainer.appendChild(b);
    });

    overlay.style.display = 'flex';
};

window.showInputDialog = function (title, message, defaultValue, callback) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue || '';
    input.className = 'inp-text-wide';
    input.style.marginTop = '10px';
    input.id = 'customDialogInput';

    // Focus input when dialog opens
    setTimeout(() => input.focus(), 100);

    const buttons = [
        {
            label: 'Cancel',
            onClick: () => { if (callback) callback(null); }
        },
        {
            label: 'OK',
            class: 'btn-blue',
            onClick: () => {
                const val = document.getElementById('customDialogInput').value;
                if (callback) callback(val);
            }
        }
    ];

    showCustomDialog(title, message, buttons, input);

    // Allow Enter key to submit
    input.onkeydown = function (e) {
        if (e.key === 'Enter') {
            const val = this.value;
            document.getElementById('dialogOverlay').style.display = 'none';
            if (callback) callback(val);
        }
    };
};

// Stats Modal Interface
window.openStatsModal = function () {
    syncState();
    const el = document.getElementById('statsModalOverlay');
    const content = document.getElementById('statsContent');

    if (!activeSampleId || !items || items.length === 0) {
        content.innerHTML = "No items in active sample.";
    } else {
        const s = projectSamples.find(x => x.id === activeSampleId);

        const calibAdapter = s.calibration ? {
            calibrated: s.calibration.calibrated,
            pixelsPerUnit: s.calibration.ppu
        } : { calibrated: false, pixelsPerUnit: 1 };

        // Assuming utils.js and statistics.js are loaded
        const st = getStatsFromItems(s.items, calibAdapter);

        const STATS_DESCRIPTIONS = {
            "Crushing Index": "Average diameter of valid Pits. Indicates compressive force intensity. (Sp, Lp)",
            "% Measured Pits": "% of Pits with diameter > 4.0 µm. Indicates prevalence of large features. (Sp, Lp)",
            "Max Pit Dia.": "Largest diameter among all measured Pits. (Sp, Lp)",
            "Mean Scr. Width": "Average width of Scratches (uses 1.0 µm if not measured). (Fs, Cs, Hcs)",
            "Aspect Ratio": "Average Length/Width ratio of Scratches. (Fs, Cs, Hcs)",
            "Measured AR": "L/W ratio calculated ONLY on manually measured Scratches. (Measured Fs, Cs, Hcs)",
            "P/S Ratio": "Ratio between Pit density and Scratch density. (Sp, Lp / Fs, Cs, Hcs)",
            "Anisotropy (R)": "Index (0-1) of scratch alignment. 1 = Parallel, 0 = Random. (Fs, Cs, Hcs)",
            "Vector Consistency": "Dispersion of orientations (1 - R). Higher = more chaotic. (Fs, Cs, Hcs)",
            "Mean Orient": "Average prevalent direction (0-180°) of Scratches. (Fs, Cs, Hcs)",
            "Bg Abrasion": "Linear density of Scratches (Total Length / Analysis Area). (Fs, Cs, Hcs)",
            "Sev. Pits": "Total area occupied by Pits. (Sp, Lp)",
            "Sev. Scratches": "Total area occupied by Scratches. (Fs, Cs, Hcs)",
            "Sev. Total": "Total damaged area. (Severity Pits + Severity Scratches)",
            "Sev. Ratio": "Ratio between Pits Area and Scratches Area. (Severity Pits / Severity Scratches)",
            "Mean Feat. Sev.": "Average damaged area per single feature. (Severity Total / Total Count)",
            "Durophagy Index": "Combined index to amplify hard-object feeding signal. (P/S Ratio * Crushing Index)",
            "Pit Het.": "Variation (CV) of Pit density on 9x9 grid. (Sp, Lp)",
            "Scratch Het.": "Variation (CV) of Scratch density (intersections) on 9x9 grid. (Fs, Cs, Hcs)",
            "Global Het.": "Average of Pit and Scratch Heterogeneity. (Pit Het, Scratch Het)",

            // New Tooltips
            "Density Pits": "Number of Pits per mm². Correlates with Spd (Density of Peaks).",
            "Density Scratches": "Number of Scratches per mm².",
            "Density Total": "Total features per mm².",
            "Sev. Pits %": "Percentage of total area covered by Pits.",
            "Sev. Scratches %": "Percentage of total area covered by Scratches.",
            "Sev. Total % (Void Vol)": "Percentage of total area covered by all features. Correlates with Vm/Vvv (Material/Void Volume).",

            // Experimental Tooltips
            "Intersections": "Total number of geometric intersections (Scratch-Scratch, Scratch-Pit).",
            "Intersect. Density": "Number of intersections per mm². Proxy for Asfc (Fractal Complexity).",
            "Texture Complex. Index": "Composite index (Int.Density * VectorConsistency + PitDensity * 0.5) to estimate Topographic Complexity.",
            "Complexity Het.": "Heterogeneity (CV) of Complexity Index across 81 cells. Proxy for HAsfc81."
        };

        let h = `<table style="width:100%; border-collapse:collapse;">`;
        const row = (l, v) => {
            const desc = STATS_DESCRIPTIONS[l] ? `data-tooltip="${STATS_DESCRIPTIONS[l]}" tabindex="0"` : '';
            return `<tr><td ${desc} style="border-bottom:1px solid #444; padding:4px; outline:none;">${l}</td><td style="border-bottom:1px solid #444; padding:4px; font-weight:bold;">${v}</td></tr>`;
        };

        h += row("Sample Name", s.name);
        h += row("Calibrated", s.calibration && s.calibration.calibrated ? "Yes" : "No");

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Morphometry</td></tr>`;
        h += row("Crushing Index", st.crushingIndex.toFixed(2));
        h += row("% Measured Pits", st.percMeasuredPits.toFixed(1) + "%");
        h += row("Max Pit Dia.", st.maxPitDiameter.toFixed(2));
        h += row("Mean Scr. Width", st.meanScratchWidth.toFixed(2));
        h += row("Aspect Ratio", st.aspectRatio.toFixed(2));
        h += row("Measured AR", st.measuredAspectRatio.toFixed(2));
        h += row("P/S Ratio", st.psRatio.toFixed(3));

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Vector (Orientation)</td></tr>`;
        h += row("Anisotropy (R)", st.anisotropy.toFixed(3));
        h += row("Vector Consistency", st.vectorConsistency.toFixed(3));
        h += row("Mean Orient", st.meanOrient.toFixed(1) + "°");

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Severity</td></tr>`;
        h += row("Bg Abrasion", st.bgAbrasion.toFixed(4));
        h += row("Sev. Pits", st.severityPits.toFixed(0));
        h += row("Sev. Scratches", st.severityScratches.toFixed(0));
        h += row("Sev. Total", st.severityTotal.toFixed(0));
        h += row("Sev. Ratio", st.severityRatio.toFixed(3));
        h += row("Mean Feat. Sev.", st.meanFeatureSeverity.toFixed(1));

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Composite & Het.</td></tr>`;
        h += row("Durophagy Index", st.durophagyIndex.toFixed(2));
        h += row("Pit Het.", st.pitHet.toFixed(2));
        h += row("Scratch Het.", st.scratchHet.toFixed(2));
        h += row("Global Het.", st.globalHet.toFixed(2));

        // NEW SECTIONS (v0.26.6)
        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Density (N/mm²)</td></tr>`;
        h += row("Density Pits", st.densityPits.toFixed(1));
        h += row("Density Scratches", st.densityScratches.toFixed(1));
        h += row("Density Total", st.densityTotal.toFixed(1));

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Normalized Severity (% Area)</td></tr>`;
        h += row("Sev. Pits %", st.severityPitsn.toFixed(3) + "%");
        h += row("Sev. Scratches %", st.severityScratchesn.toFixed(3) + "%");
        h += row("Sev. Total % (Void Vol)", st.severityTotaln.toFixed(3) + "%");

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent); text-transform:uppercase; font-size:11px;">Experimental Complexity</td></tr>`;
        h += row("Intersections", st.intersectionCount);
        h += row("Intersect. Density", st.intersectionDensity.toFixed(1));
        h += row("Texture Complex. Index", st.textureComplexityIndex.toFixed(2));
        h += row("Complexity Het.", st.complexityHet.toFixed(2));

        h += `</table>`;
        content.innerHTML = h;
    }
    el.style.display = 'flex';
};

window.closeStatsModal = function () {
    document.getElementById('statsModalOverlay').style.display = 'none';
};

window.isSessionDirty = function () {
    if (!window.projectSamples || window.projectSamples.length === 0) return false;
    if (window.projectSamples.length > 1) return true;
    const s = window.projectSamples[0];
    // It's dirty if the single sample has items or has been renamed from default
    // Assuming default name is "Sample_1" or "New Sample"? createNewSample uses "Sample_N"
    // Let's check items count and project name
    return (s.items.length > 0 || window.currentProjectName !== "New_Project");
};

window.showMainMenu = function () {
    const hasSession = window.isSessionDirty();
    const btnResume = document.getElementById('btnResumeSession');
    if (btnResume) {
        btnResume.style.display = hasSession ? 'flex' : 'none';
    }
    document.getElementById('mainMenu').style.display = 'flex';
};

window.resumeSession = function () {
    document.getElementById('mainMenu').style.display = 'none';
};

window.startNewSession = function () {
    const performReset = () => {
        try {
            // Clear State
            window.projectSamples = [];
            window.activeSampleId = null;
            window.items = [];
            window.currentProjectName = "New_Project";
            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle) headerTitle.innerText = window.currentProjectName;

            // Create first empty sample
            window.createNewSample(false);

            // Hide Menu
            document.getElementById('mainMenu').style.display = 'none';
        } catch (e) {
            console.error("Error starting new session:", e);
            alert("Error starting session: " + e.message);
        }
    };

    if (window.isSessionDirty()) {
        window.showCustomDialog(
            "Start New Session?",
            "This will start a fresh session.<br>Any unsaved progress in the current session will be lost.",
            [
                { label: "Cancel", onClick: null },
                {
                    label: "Start New Session",
                    class: "btn-red",
                    onClick: performReset
                }
            ]
        );
    } else {
        performReset();
    }
};

window.showImportPreviewDialog = function (parsedData, onConfirm, onCancel) {
    const container = document.createElement('div');
    container.style.textAlign = 'left';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    const createField = (label, value, id) => {
        const div = document.createElement('div');
        div.innerHTML = `<label style="font-size:11px; font-weight:bold; color:var(--text-sec); text-transform:uppercase;">${label}</label>`;
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'inp-text-wide';
        inp.value = value || '';
        inp.id = 'preview_' + id;
        div.appendChild(inp);
        return div;
    };

    // Original Filename (Read-only display)
    const fileRow = document.createElement('div');
    fileRow.innerHTML = `<label style="font-size:11px; font-weight:bold; color:var(--text-sec);">ORIGINAL FILE</label><div style="font-family:monospace; margin-bottom:5px; word-break:break-all;">${parsedData.originalName || '-'}</div>`;
    container.appendChild(fileRow);

    // Editable Fields
    container.appendChild(createField("Sample ID (Name)", parsedData.id, "id"));
    container.appendChild(createField("Age (A/J) ⏳", parsedData.age || '', "age")); // Added to Preview
    container.appendChild(createField("Tooth (e.g. m1, P4)", parsedData.tooth, "tooth"));
    container.appendChild(createField("Side (e.g. buc, ling)", parsedData.side, "side"));
    container.appendChild(createField("Part (e.g. trig, met)", parsedData.part, "part"));
    container.appendChild(createField("Magnification", parsedData.mag, "mag"));

    const buttons = [
        {
            label: "Cancel",
            onClick: onCancel
        },
        {
            label: "Continue",
            class: "btn-blue",
            onClick: () => {
                const newData = {
                    id: document.getElementById('preview_id').value.trim(),
                    tooth: document.getElementById('preview_tooth').value.trim(),
                    side: document.getElementById('preview_side').value.trim(),
                    part: document.getElementById('preview_part').value.trim(),
                    mag: document.getElementById('preview_mag').value.trim(),
                    age: document.getElementById('preview_age').value.trim().toUpperCase(), // Capture Age
                    originalFilename: parsedData.originalName
                };
                if (!newData.id) {
                    alert("Sample Name cannot be empty.");
                    return; // Prevent closing
                }
                // Determine logic to close dialog is handled by showCustomDialog helper usually?
                // The helper closes on click. We need to manually invoke callback.
                onConfirm(newData);
            }
        }
    ];

    showCustomDialog("Import Preview", "Verify and edit sample details:", buttons, container);
};

window.showEditSampleDialog = function (sample, onConfirm) {
    const container = document.createElement('div');
    container.style.textAlign = 'left';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    const createField = (label, value, id) => {
        const div = document.createElement('div');
        div.innerHTML = `<label style="font-size:11px; font-weight:bold; color:var(--text-sec); text-transform:uppercase;">${label}</label>`;
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'inp-text-wide';
        inp.value = value || '';
        inp.id = 'edit_' + id;
        div.appendChild(inp);
        return div;
    };

    // Original Filename (Read-only display)
    const originalName = (sample.metadata && sample.metadata.originalFilename) ? sample.metadata.originalFilename : '-';
    const fileRow = document.createElement('div');
    fileRow.innerHTML = `<label style="font-size:11px; font-weight:bold; color:var(--text-sec);">ORIGINAL FILE</label><div style="font-family:monospace; margin-bottom:5px; word-break:break-all; user-select:all; cursor:text; background:#222; padding:4px; border-radius:4px;">${originalName}</div>`;
    container.appendChild(fileRow);

    // Editable Fields
    container.appendChild(createField("Sample ID (Name)", sample.name, "id"));

    const md = sample.metadata || {};

    // Auto-detect Age if missing
    let defaultAge = md.age;
    if (!defaultAge && md.tooth) {
        defaultAge = (md.tooth.startsWith('d') || md.tooth.startsWith('D')) ? 'J' : 'A';
    }

    container.appendChild(createField("Age (A/J) ⏳", defaultAge, "age")); // Moved Up
    container.appendChild(createField("Tooth (e.g. m1, P4)", md.tooth, "tooth"));
    container.appendChild(createField("Side (e.g. buc, ling)", md.side, "side"));
    container.appendChild(createField("Part (e.g. trig, met)", md.part, "part"));
    container.appendChild(createField("Magnification", md.mag, "mag"));

    const buttons = [
        {
            label: "Cancel",
            onClick: () => { }
        },
        {
            label: "Save Changes",
            class: "btn-blue",
            onClick: () => {
                const newData = {
                    name: document.getElementById('edit_id').value.trim(),
                    metadata: {
                        tooth: document.getElementById('edit_tooth').value.trim(),
                        side: document.getElementById('edit_side').value.trim(),
                        part: document.getElementById('edit_part').value.trim(),
                        mag: document.getElementById('edit_mag').value.trim(),
                        age: document.getElementById('edit_age').value.trim().toUpperCase(), // Start Age
                        originalFilename: md.originalFilename, // Preserve original
                        specimenId: md.specimenId // Preserve original
                    }
                };
                if (!newData.name) {
                    alert("Sample Name cannot be empty.");
                    return; // Prevent closing
                }
                onConfirm(newData);
            }
        }
    ];

    showCustomDialog("Edit Sample", `Editing details for <b>${sample.name}</b>`, buttons, container);
};
