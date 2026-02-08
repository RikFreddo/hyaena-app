
// ==========================================================================
// GLOBAL STATE
// ==========================================================================

// Project Data
window.currentProjectName = "My_Project";
window.currentFileName = "Sample_1";

// Runtime Data
window.projectSamples = [];
window.activeSampleId = null;
window.items = []; // Current annotation items for the active sample

// Canvas & Viewport State
window.img = new Image();
window.currentScale = 1;
window.mode = 'pan'; // pan, draw, select, measure, doubt_measure
window.isDragging = false;
window.lastX = 0;
window.lastY = 0;
window.panStart = { x: 0, y: 0, sx: 0, sy: 0 };

// Drawing State
window.activeDrawTool = 'line_fs'; // line_fs, point_sp, point_pp, circle_auto
window.startPos = { x: 0, y: 0 };
window.selectedItem = null;
window.dragItemStart = null;

// Calibration State
window.pixelsPerUnit = 1;
window.unitName = 'px';
window.isCalibrated = false;
window.measurePoints = [];

// Doubt Mode State
window.isDoubtMode = false;
window.perpEndPos = { x: 0, y: 0 };

// History State
window.MAX_HISTORY = 50;
window.historyStack = [];
window.historyIndex = -1;

// Undo/Redo Stacks (Legacy/Simple - replacing with historyStack logic generally)
window.redoStack = []; 
