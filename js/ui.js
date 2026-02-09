
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

window.showMainMenu = function () {
    const hasSession = (window.projectSamples && window.projectSamples.length > 0);
    const btnResume = document.getElementById('btnResumeSession');
    if (btnResume) {
        btnResume.style.display = hasSession ? 'flex' : 'none';
        // Highlight Resume if active
        if (hasSession) {
            // Optional: visual cue
        }
    }
    document.getElementById('mainMenu').style.display = 'flex';
};

window.resumeSession = function () {
    document.getElementById('mainMenu').style.display = 'none';
};

window.startNewSession = function () {
    const performReset = () => {
        // Clear State
        window.projectSamples = [];
        window.activeSampleId = null;
        window.items = [];
        window.currentProjectName = "New_Project";
        document.getElementById('headerTitle').innerText = window.currentProjectName;

        // Create first empty sample
        window.createNewSample(false);

        // Hide Menu
        document.getElementById('mainMenu').style.display = 'none';
    };

    if (window.projectSamples && window.projectSamples.length > 0) {
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
