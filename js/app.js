
// ==========================================================================
// APP INITIALIZATION
// ==========================================================================

const APP = {
    version: '0.25.43',
    init: function () {
        console.log("Hyaena App v" + this.version + " Initializing...");

        // Element bindings
        this.bindEvents();

        // Setup Service Worker
        this.registerSW();

        // Initial State
        const savedTheme = localStorage.getItem('hyaena_theme') || 'light';
        setTheme(savedTheme);

        // Start with one empty sample
        createNewSample(false);
    },

    bindEvents: function () {
        // Window Resize
        window.addEventListener('resize', () => {
            if (window.fitToScreen) fitToScreen();
        });

        // Input File Listeners
        document.getElementById('inpFile').addEventListener('change', handleFileSelection);
        document.getElementById('inpProject').addEventListener('change', handleFileSelection);

        // Global Canvas Events were attached in canvas.js (window.onDown etc)
        // But we need to physically attach them to the element now that DOM is ready
        const viewport = document.getElementById('viewport');
        const cvs = document.getElementById('cvs');

        viewport.addEventListener('mousedown', window.onDown);
        viewport.addEventListener('touchstart', window.onDown, { passive: false });

        window.addEventListener('mousemove', window.onMove);
        window.addEventListener('touchmove', window.onMove, { passive: false });

        window.addEventListener('mouseup', window.onUp);
        window.addEventListener('touchend', window.onUp);

        // Prevent context menu on canvas
        cvs.addEventListener('contextmenu', e => e.preventDefault());
    },

    registerSW: function () {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('SW Registered', reg);
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                if (confirm("New version available! Reload to update?")) {
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch(err => console.log('SW Failed', err));
        }
    }
};

window.startApp = function () {
    // Legacy support or initial load
    showMainMenu();
};

// Auto-Start
window.onload = function () {
    APP.init();
};
