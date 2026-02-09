# PROJECT CONTEXT: HYAENA (Dental Microwear Analysis)

## 1. Project Overview
**Hyaena** is a scientific web application for 2D Dental Microwear Analysis. It processes geometric features (Pits and Scratches) extracted from low-magnification images to infer the diet of ancient specimens (Paleoecology).
The app is designed as a **Progressive Web App (PWA)**, usable offline and installable on devices.

**Current Version**: `v0.25.0` (Refactored Modular)

## 2. Tech Stack & Architecture
*   **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3.
*   **Rendering**: HTML5 Canvas API (for high-performance drawing of thousands of features).
*   **Architecture**: Modular design with `index.html` as entry point, `css/` for styles, and `js/` for logic modules.
*   **Offline Support**: Service Worker (`sw.js`) with Cache API.
*   **Persistence**: Custom JSON format for Project files; LocalStorage for session preferences.
*   **No Build Step**: Native ES Modules / Script tags.

## 3. Key Files
*   **`index.html`**: Main entry point (Markup & Layout only).
*   **`css/style.css`**: All application styles.
*   **`js/` Modules**:
    *   `app.js`: Initialization and Event Binding.
    *   `state.js`: Global State Management.
    *   `canvas.js`: Drawing & Interaction Logic.
    *   `project.js`: Sample & Data Management.
    *   `statistics.js`: Scientific Logic.
    *   `utils.js`: Helper functions.
*   **`tests/`**: Unit tests using Vitest (Project, Utils, Statistics).
*   **`sw.js`**: Service Worker implementation for caching assets.
*   **`manifest.json`**: PWA metadata.

## 4. Core Features
### A. Microwear Annotation
*   **Pits**: Points (`sp`, `pp`) and Circles (`lp` - Large Pits).
*   **Scratches**: Lines (`line`) and Fine Scratches (`line_fs`).
*   **Tools**: Draw, Move/Select, Delete, Doubt Mode (for ambiguous features).

### B. Scientific Analysis (Statistics)
Calculates metrics based on feature geometry:
*   **Morphometry**: Pits vs Scratches ratio, Pit Diameter, Scratch Width/Length.
*   **Orientation**: Anisotropy, Vector Consistency, Mean Orientation.
*   **Texture**: Heterogeneity (Grid-based coefficient of variation).
*   **Calibration**: Manual (Line reference) or Field of View (FOV) based.

### C. Data Management
*   **Import/Export**: Load Images, Import JSON projects, Batch Import.
*   **Export Formats**:
    *   **Excel**: Counts, Summary Stats, Full Item List.
    *   **Image**: JPG Snapshot, JPG with Verification Overlay.
*   **History**: Robust Undo/Redo system (Snapshot-based, Max 50 steps).

## 5. Recent Changes & State
*   **Refactoring**: Split monolithic `index.html` into `css/style.css` and multiple `js/` modules.
*   **Testing**: Added Unit Tests (`npm test`) covering core logic, geometry, and parsing.
*   **Cleanup**: Removed legacy inline JavaScript and CSS.
*   **Restoration**: Previously reverted to stable `v0.23.4` logic before refactoring.
*   **Known Issues/Notes**:
    *   `statistics.js` assumes specific `catId`s (`sp`, `pp`, `lp`, `line`).
    *   UI completely responsive (dark/light mode).

## 6. User Persona & Autonomy
*   **User Role**: The user is **Atomic User**, not a professional programmer.
*   **Agent Autonomy**: The agent is authorized and encouraged to **act autonomously** on the project (fixes, cleanup, git operations) without constant confirmation, focusing on results and stability.
*   **Versioning**: The agent **MUST increment the patch version** (e.g., 0.25.4 -> 0.25.5) in:
    1.  `package.json`
    2.  `sw.js` (Cache Name)
    3.  `index.html` (**Footer in Main Menu** matches new version)
    **with every commit/modification**. The user controls the minor version (middle number).
*   **Testing**: The agent **MUST write a test** for every modification or new feature requested.
