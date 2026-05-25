// drawer.js
// Interactive Grid-Based Map Drawer for HHMB City Planning Lessons.
// Handles tools selections, mouse click/drag grid painting, auto-save state, and communications.

document.addEventListener("DOMContentLoaded", () => {
    const GRID_COLS = 20;
    const GRID_ROWS = 15;
    const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
    const LOCAL_STORAGE_KEY = "hhmb-city-grid-state";

    let activeTool = "limits"; // Default active brush
    let isDrawing = false;      // Drag paint gate state
    let gridState = [];         // Array to track state of each cell [{type: null, limits: false}]

    // Grab Elements
    const gridCanvas = document.getElementById("grid-canvas");
    const toolBtns = document.querySelectorAll(".tool-btn");
    const clearBtn = document.getElementById("clear-btn");
    const saveIndicator = document.querySelector(".autosave-indicator");

    // --- ARTIST GRAPHICS CUSTOMIZATION DICTIONARY ---
    // A human artist can modify these SVGs directly to instantly update the map graphics!
    const TILE_GRAPHICS = {
        limits: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="3" stroke-dasharray="3,3"></rect>
            </svg>
        `,
        neighborhood: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <!-- House roof -->
                <path d="M3 10l9-7 9 7" stroke="#7c2d12" stroke-width="2" fill="#ffedd5"></path>
                <!-- House body -->
                <path d="M4 10v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V10" stroke="#7c2d12" stroke-width="2" fill="#fed7aa"></path>
                <!-- Door -->
                <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" stroke="#7c2d12" fill="#f97316"></path>
                <!-- Window -->
                <rect x="7" y="12" width="3" height="3" rx="0.5" stroke="#7c2d12" fill="#ffffff"></rect>
                <rect x="14" y="12" width="3" height="3" rx="0.5" stroke="#7c2d12" fill="#ffffff"></rect>
            </svg>
        `,
        business: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <!-- Building frame -->
                <rect x="3" y="8" width="18" height="13" rx="1" stroke="#1e3a8a" stroke-width="2" fill="#dbeafe"></rect>
                <!-- Awning -->
                <path d="M3 8l3-4h12l3 4H3z" stroke="#1e3a8a" fill="#3b82f6" stroke-width="2"></path>
                <!-- Shop door -->
                <rect x="10" y="14" width="4" height="7" stroke="#1e3a8a" fill="#1d4ed8"></rect>
                <!-- Large windows -->
                <rect x="5" y="12" width="3" height="4" stroke="#1e3a8a" fill="#93c5fd"></rect>
                <rect x="16" y="12" width="3" height="4" stroke="#1e3a8a" fill="#93c5fd"></rect>
            </svg>
        `,
        park: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <!-- Left smaller pine tree -->
                <path d="M7 6l-3 6h6L7 6z" stroke="#065f46" fill="#34d399"></path>
                <rect x="6.5" y="12" width="1" height="2" stroke="#065f46" fill="#78350f"></rect>
                <!-- Center primary pine tree -->
                <path d="M14 3L8 15h12L14 3z" stroke="#065f46" stroke-width="2" fill="#10b981"></path>
                <rect x="13" y="15" width="2" height="4" rx="0.5" stroke="#065f46" fill="#78350f"></rect>
                <!-- Little shrub -->
                <circle cx="18" cy="16" r="2.5" stroke="#065f46" fill="#059669"></circle>
            </svg>
        `,
        road: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <!-- Asphalt base -->
                <rect x="0" y="0" width="24" height="24" fill="#475569"></rect>
                <!-- Double yellow divider line -->
                <line x1="12" y1="0" x2="12" y2="24" stroke="#facc15" stroke-width="1.5" stroke-dasharray="3,3"></line>
            </svg>
        `,
        path: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <!-- Tan pavement walk tiles -->
                <rect x="2" y="2" width="8" height="8" rx="1" stroke="#b45309" fill="#fef3c7"></rect>
                <rect x="14" y="2" width="8" height="8" rx="1" stroke="#b45309" fill="#fef3c7"></rect>
                <rect x="2" y="14" width="8" height="8" rx="1" stroke="#b45309" fill="#fef3c7"></rect>
                <rect x="14" y="14" width="8" height="8" rx="1" stroke="#b45309" fill="#fef3c7"></rect>
                <circle cx="12" cy="12" r="2" fill="#d97706"></circle>
            </svg>
        `,
        track: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <!-- Wooden ties -->
                <line x1="2" y1="5" x2="22" y2="5" stroke="#78350f" stroke-width="2.5"></line>
                <line x1="2" y1="12" x2="22" y2="12" stroke="#78350f" stroke-width="2.5"></line>
                <line x1="2" y1="19" x2="22" y2="19" stroke="#78350f" stroke-width="2.5"></line>
                <!-- Steel rails -->
                <line x1="6" y1="0" x2="6" y2="24" stroke="#cbd5e1" stroke-width="2"></line>
                <line x1="18" y1="0" x2="18" y2="24" stroke="#cbd5e1" stroke-width="2"></line>
            </svg>
        `,
        water: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <!-- Ripple wave lines -->
                <path d="M2 7c4-2 6 2 10 0s6-2 10 0" stroke="#0284c7" stroke-width="2" fill="none"></path>
                <path d="M2 17c4-2 6 2 10 0s6-2 10 0" stroke="#0284c7" stroke-width="2" fill="none"></path>
            </svg>
        `,
        eraser: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 20V12L10 4L4 10L12 18H18Z" stroke="#ef4444" fill="rgba(239, 68, 68, 0.1)"></path>
                <line x1="2" y1="20" x2="22" y2="20" stroke="#ef4444" stroke-width="2"></line>
            </svg>
        `
    };

    // Populate SVGs for toolbox buttons
    toolBtns.forEach(btn => {
        const tool = btn.getAttribute("data-tool");
        const iconDiv = btn.querySelector(".tool-icon");
        if (iconDiv && TILE_GRAPHICS[tool]) {
            iconDiv.innerHTML = TILE_GRAPHICS[tool];
        }
    });

    // --- State Handlers ---

    // Load initial state or initialize empty grid
    function initGrid() {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                gridState = JSON.parse(saved);
                if (gridState.length === TOTAL_CELLS) {
                    renderFullCanvas();
                    return;
                }
            } catch (e) {
                console.error("Error loading grid state:", e);
            }
        }
        
        // Reset grid state array
        gridState = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            gridState.push({ type: null, limits: false });
        }
        renderFullCanvas();
    }

    // Render the grid canvas layout from scratch
    function renderFullCanvas() {
        gridCanvas.innerHTML = "";
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement("div");
            cell.classList.add("grid-cell");
            cell.setAttribute("data-index", i);
            
            // Apply cell visuals
            updateCellDOM(cell, gridState[i]);
            
            // Mouse Drag Actions listeners
            cell.addEventListener("mousedown", (e) => {
                e.preventDefault();
                isDrawing = true;
                paintCell(i, cell);
            });
            
            cell.addEventListener("mouseenter", () => {
                if (isDrawing) {
                    paintCell(i, cell);
                }
            });
            
            gridCanvas.appendChild(cell);
        }
    }

    // Update single cell DOM styles and injected graphics
    function updateCellDOM(cellNode, cellData) {
        // Clear all previous tile styling classes
        cellNode.className = "grid-cell";
        cellNode.innerHTML = "";
        
        // 1. Base Layer (Neighborhood, Business, Park, Road, Path, Track, Water)
        if (cellData.type) {
            cellNode.classList.add(`tile-${cellData.type}`);
            if (TILE_GRAPHICS[cellData.type]) {
                cellNode.innerHTML = TILE_GRAPHICS[cellData.type];
            }
        }
        
        // 2. City Limits Overlay Layer
        if (cellData.limits) {
            cellNode.classList.add("tile-limits");
        }
    }

    // Triggered when clicking or dragging onto a cell
    function paintCell(index, cellNode) {
        const cellData = gridState[index];
        let stateChanged = false;

        if (activeTool === "limits") {
            if (!cellData.limits) {
                cellData.limits = true;
                stateChanged = true;
            }
        } else if (activeTool === "eraser") {
            // Eraser clears base type and limits
            if (cellData.type !== null || cellData.limits !== false) {
                cellData.type = null;
                cellData.limits = false;
                stateChanged = true;
            }
        } else {
            // Zoning/Infrastructure brushes
            if (cellData.type !== activeTool) {
                cellData.type = activeTool;
                stateChanged = true;
            }
        }

        if (stateChanged) {
            updateCellDOM(cellNode, cellData);
            autoSaveGrid();
        }
    }

    // Save grid state to localStorage
    function autoSaveGrid() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gridState));
        
        // Trigger quick blink on indicator
        if (saveIndicator) {
            saveIndicator.classList.add("saving");
            setTimeout(() => {
                saveIndicator.classList.remove("saving");
            }, 500);
        }
    }

    // Global drag listener to disable isDrawing on mouseup
    document.addEventListener("mouseup", () => {
        isDrawing = false;
    });

    // --- Toolbox Button Actions ---
    toolBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            toolBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeTool = btn.getAttribute("data-tool");
        });
    });

    // --- Clear All Action ---
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your city plan and start fresh?")) {
                resetGrid();
            }
        });
    }

    function resetGrid() {
        gridState = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            gridState.push({ type: null, limits: false });
        }
        renderFullCanvas();
        autoSaveGrid();
    }

    // --- Parent Window PostMessage listener ---
    window.addEventListener("message", (e) => {
        if (e.data && e.data.action === "resetMap") {
            resetGrid();
        }
    });

    // Run Initialization
    initGrid();
});
