
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

        let h = `<table style="width:100%; border-collapse:collapse;">`;
        const row = (l, v) => `<tr><td style="border-bottom:1px solid #444; padding:4px;">${l}</td><td style="border-bottom:1px solid #444; padding:4px; font-weight:bold;">${v}</td></tr>`;

        h += row("Sample Name", s.name);
        h += row("Calibrated", s.calibration && s.calibration.calibrated ? "Yes" : "No");

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent);">Microwear Stats</td></tr>`;
        h += row("Crushing Index", st.crushingIndex.toFixed(2));
        h += row("% Large Pits", st.percLargePits.toFixed(1) + "%");
        h += row("Anisotropy (R)", st.anisotropy.toFixed(3));
        h += row("Mean Orient", st.meanOrient.toFixed(1) + "°");

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent);">Severity & Indices</td></tr>`;
        h += row("Bg Abrasion", st.bgAbrasion.toFixed(4));
        h += row("Severity (Total)", st.severityTotal.toFixed(0));
        h += row("Mean Feat. Sev.", st.meanFeatureSeverity.toFixed(1));
        h += row("Durophagy Index", st.durophagyIndex.toFixed(2));

        h += `<tr><td colspan="2" style="padding-top:10px; font-weight:bold; color:var(--accent);">Heterogeneity</td></tr>`;
        h += row("Pit Het.", st.pitHet.toFixed(2));
        h += row("Scratch Het.", st.scratchHet.toFixed(2));
        h += row("Global Het.", st.globalHet.toFixed(2));

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
