// drawer.js
// Interactive Grid-Based Map Drawer for HHMB City Planning Lessons.
// Handles tools selections, mouse click/drag grid painting, auto-save state, and communications.

document.addEventListener("DOMContentLoaded", () => {
    const GRID_COLS = 20;
    const GRID_ROWS = 15;
    const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
    const LOCAL_STORAGE_KEY = "hhmb-city-grid-state";
    const CUSTOM_GRAPHICS_KEY = "hhmb-city-custom-graphics";

    let activeTool = "limits"; // Default active brush
    let isDrawing = false;      // Drag paint gate state
    let gridState = [];         // Array to track state of each cell [{type: null, limits: false}]
    let customGraphics = {};    // Object to track custom drawings mapping tool to 64 color strings/nulls

    // Grab Elements
    const gridCanvas = document.getElementById("grid-canvas");
    const toolBtns = document.querySelectorAll(".tool-btn");
    const clearBtn = document.getElementById("clear-btn");
    const exportBtn = document.getElementById("export-btn");
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

    // Backup default premium SVGs
    const DEFAULT_TILE_GRAPHICS = Object.assign({}, TILE_GRAPHICS);

    // --- Dynamic SVG Builder for Custom 8x8 Pixel-Art Drawings ---
    function generateCustomSVG(pixelData) {
        let svg = `<svg viewBox="0 0 8 8" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">`;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const color = pixelData[r * 8 + c];
                if (color) {
                    // Slight sub-pixel bleed overlap to prevent thin rendering gap lines in some browsers
                    svg += `<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="${color}" stroke="${color}" stroke-width="0.05" />`;
                }
            }
        }
        svg += `</svg>`;
        return svg;
    }

    // Load custom graphics from localStorage and apply them to TILE_GRAPHICS dictionary
    function loadCustomGraphics() {
        const saved = localStorage.getItem(CUSTOM_GRAPHICS_KEY);
        if (saved) {
            try {
                customGraphics = JSON.parse(saved);
                for (const tool in customGraphics) {
                    if (customGraphics[tool]) {
                        TILE_GRAPHICS[tool] = generateCustomSVG(customGraphics[tool]);
                    }
                }
            } catch (e) {
                console.error("Error loading custom graphics:", e);
            }
        }
    }

    loadCustomGraphics();

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

    // --- Export Button Action ---
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            if (typeof html2canvas === 'undefined') {
                alert('Export library not loaded yet. Please try again in a moment.');
                return;
            }

            // Add a temporary class to grid-canvas to ensure it looks good for export if needed
            gridCanvas.classList.add('exporting');

            // Temporary fix for SVG issue with html2canvas (sometimes doesn't render inline SVG well)
            // It might just work fine with the current html2canvas version

            html2canvas(gridCanvas, {
                backgroundColor: '#ffffff', // Ensure white background
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true
            }).then(canvas => {
                gridCanvas.classList.remove('exporting');

                // Create download link
                const link = document.createElement('a');
                link.download = 'hhmb-city-plan.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error("Error exporting canvas:", err);
                alert("Sorry, there was an error exporting your map.");
                gridCanvas.classList.remove('exporting');
            });
        });
    }

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

    // --- PIXEL GRAPHIC EDITOR MODAL CONTROLLER ---
    
    // Grab Modal Elements
    const editorModal = document.getElementById("editor-modal");
    const editorGrid = document.getElementById("editor-grid");
    const editorTitle = document.getElementById("editor-tool-title");
    const editBtns = document.querySelectorAll(".edit-btn");
    const modalCloseHeaderBtn = document.getElementById("modal-close-header-btn");
    const editorToolPencil = document.getElementById("editor-tool-pencil");
    const editorToolEraser = document.getElementById("editor-tool-eraser");
    const editorToolFill = document.getElementById("editor-tool-fill");
    const paletteColors = document.querySelectorAll(".palette-color");
    const editorColorPicker = document.getElementById("editor-color-picker");
    const previewLarge = document.getElementById("preview-large");
    const previewSmall = document.getElementById("preview-small");
    const editorBtnRestore = document.getElementById("editor-btn-restore");
    const editorBtnClear = document.getElementById("editor-btn-clear");
    const editorBtnCancel = document.getElementById("editor-btn-cancel");
    const editorBtnSave = document.getElementById("editor-btn-save");

    let currentEditingTool = null;
    let editorPixelData = Array(64).fill(null);
    let editorActiveColor = "#f97316"; 
    let editorActiveTool = "pencil"; // pencil, eraser
    let editorIsDrawing = false;

    // Open Editor Modal for a specific tool
    editBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering any tool-btn click event
            
            currentEditingTool = btn.getAttribute("data-tool");
            if (!currentEditingTool) return;

            // Automatically switch the active sidebar tool to this tool for convenience
            const correspondingToolBtn = document.querySelector(`.tool-btn[data-tool="${currentEditingTool}"]`);
            if (correspondingToolBtn) {
                toolBtns.forEach(b => b.classList.remove("active"));
                correspondingToolBtn.classList.add("active");
                activeTool = currentEditingTool;
            }

            // Update title with tool name (capitalized)
            const toolNameDisplay = currentEditingTool.charAt(0).toUpperCase() + currentEditingTool.slice(1);
            editorTitle.textContent = toolNameDisplay;

            // Load existing custom pixel data or start with transparent/empty grid
            if (customGraphics[currentEditingTool]) {
                editorPixelData = [...customGraphics[currentEditingTool]];
            } else {
                editorPixelData = Array(64).fill(null);
            }

            // Sync Palette Active Color with current tool color preview block
            const defaultColors = {
                neighborhood: "#f97316",
                business: "#3b82f6",
                park: "#10b981",
                road: "#475569",
                path: "#d97706",
                track: "#78350f",
                water: "#0284c7"
            };

            const initialColor = defaultColors[currentEditingTool] || "#f97316";
            setEditorActiveColor(initialColor);

            // Highlight the matching palette button if it exists
            paletteColors.forEach(pBtn => {
                if (pBtn.getAttribute("data-color") === initialColor) {
                    paletteColors.forEach(p => p.classList.remove("active"));
                    pBtn.classList.add("active");
                }
            });

            // Reset tools
            setEditorActiveTool("pencil");

            // Render grid
            renderEditorGrid();

            // Display modal
            editorModal.classList.remove("hidden");
            editorModal.setAttribute("aria-hidden", "false");
        });
    });

    function setEditorActiveColor(color) {
        editorActiveColor = color;
        editorColorPicker.value = color;
    }

    function setEditorActiveTool(tool) {
        editorActiveTool = tool;
        editorToolPencil.classList.remove("active");
        editorToolEraser.classList.remove("active");
        
        if (tool === "pencil") {
            editorToolPencil.classList.add("active");
        } else if (tool === "eraser") {
            editorToolEraser.classList.add("active");
        }
    }

    function renderEditorGrid() {
        editorGrid.innerHTML = "";
        for (let i = 0; i < 64; i++) {
            const pixel = document.createElement("div");
            pixel.classList.add("pixel-square");
            pixel.setAttribute("data-index", i);

            // Fill color if it exists
            if (editorPixelData[i]) {
                pixel.style.backgroundColor = editorPixelData[i];
            }

            // Click/drag drawing listeners
            pixel.addEventListener("mousedown", (e) => {
                e.preventDefault();
                editorIsDrawing = true;
                paintEditorPixel(i, pixel);
            });

            pixel.addEventListener("mouseenter", () => {
                if (editorIsDrawing) {
                    paintEditorPixel(i, pixel);
                }
            });

            editorGrid.appendChild(pixel);
        }
        updateLivePreviews();
    }

    function paintEditorPixel(index, pixelNode) {
        if (editorActiveTool === "pencil") {
            editorPixelData[index] = editorActiveColor;
            pixelNode.style.backgroundColor = editorActiveColor;
        } else if (editorActiveTool === "eraser") {
            editorPixelData[index] = null;
            pixelNode.style.backgroundColor = "";
        }
        updateLivePreviews();
    }

    function updateLivePreviews() {
        const tempSVG = generateCustomSVG(editorPixelData);
        previewLarge.innerHTML = tempSVG;
        previewSmall.innerHTML = tempSVG;
    }

    // Global drag end listener for editor grid
    document.addEventListener("mouseup", () => {
        editorIsDrawing = false;
    });

    // Close Modal without saving
    function closeModal() {
        editorModal.classList.add("hidden");
        editorModal.setAttribute("aria-hidden", "true");
        currentEditingTool = null;
    }

    if (modalCloseHeaderBtn) modalCloseHeaderBtn.addEventListener("click", closeModal);
    if (editorBtnCancel) editorBtnCancel.addEventListener("click", closeModal);

    // Save Custom Graphic
    if (editorBtnSave) {
        editorBtnSave.addEventListener("click", () => {
            if (!currentEditingTool) return;

            // Check if the grid is entirely empty/transparent
            const isGridEmpty = editorPixelData.every(color => color === null);
            
            if (isGridEmpty) {
                if (!confirm("Your drawing is completely transparent. Click OK to save it anyway, or Cancel to keep editing.")) {
                    return;
                }
            }

            // Generate SVG and override TILE_GRAPHICS
            TILE_GRAPHICS[currentEditingTool] = generateCustomSVG(editorPixelData);
            
            // Save color array state in customGraphics dictionary
            customGraphics[currentEditingTool] = [...editorPixelData];
            localStorage.setItem(CUSTOM_GRAPHICS_KEY, JSON.stringify(customGraphics));

            // Update the toolbox button icon
            const toolBtn = document.querySelector(`.tool-btn[data-tool="${currentEditingTool}"]`);
            if (toolBtn) {
                const iconDiv = toolBtn.querySelector(".tool-icon");
                if (iconDiv) {
                    iconDiv.innerHTML = TILE_GRAPHICS[currentEditingTool];
                }
            }

            // Snappy redraw of the canvas cells
            const canvasCells = gridCanvas.querySelectorAll(".grid-cell");
            canvasCells.forEach((cell, idx) => {
                updateCellDOM(cell, gridState[idx]);
            });

            // Trigger auto-save blink indicator for polish
            autoSaveGrid();

            closeModal();
        });
    }

    // Clear Canvas Action
    if (editorBtnClear) {
        editorBtnClear.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear the drawing grid?")) {
                editorPixelData.fill(null);
                renderEditorGrid();
            }
        });
    }

    // Restore Default Action (Back to vector SVG art)
    if (editorBtnRestore) {
        editorBtnRestore.addEventListener("click", () => {
            if (!currentEditingTool) return;
            
            if (confirm(`Restore the ${currentEditingTool} graphic to its original designer vector SVG?`)) {
                // Delete custom entry
                delete customGraphics[currentEditingTool];
                localStorage.setItem(CUSTOM_GRAPHICS_KEY, JSON.stringify(customGraphics));

                // Restore SVG in TILE_GRAPHICS
                TILE_GRAPHICS[currentEditingTool] = DEFAULT_TILE_GRAPHICS[currentEditingTool];

                // Update toolbox button icon
                const toolBtn = document.querySelector(`.tool-btn[data-tool="${currentEditingTool}"]`);
                if (toolBtn) {
                    const iconDiv = toolBtn.querySelector(".tool-icon");
                    if (iconDiv) {
                        iconDiv.innerHTML = TILE_GRAPHICS[currentEditingTool];
                    }
                }

                // Snappy redraw of canvas cells
                const canvasCells = gridCanvas.querySelectorAll(".grid-cell");
                canvasCells.forEach((cell, idx) => {
                    updateCellDOM(cell, gridState[idx]);
                });

                closeModal();
            }
        });
    }

    // Tool click selectors
    if (editorToolPencil) editorToolPencil.addEventListener("click", () => setEditorActiveTool("pencil"));
    if (editorToolEraser) editorToolEraser.addEventListener("click", () => setEditorActiveTool("eraser"));
    if (editorToolFill) {
        editorToolFill.addEventListener("click", () => {
            if (confirm("Fill the entire graphic canvas with the active color?")) {
                const color = editorActiveTool === "pencil" ? editorActiveColor : null;
                editorPixelData.fill(color);
                renderEditorGrid();
            }
        });
    }

    // Palette colors click handler
    paletteColors.forEach(pBtn => {
        pBtn.addEventListener("click", () => {
            paletteColors.forEach(p => p.classList.remove("active"));
            pBtn.classList.add("active");
            setEditorActiveColor(pBtn.getAttribute("data-color"));
            setEditorActiveTool("pencil"); // Auto switch to pencil when color is selected
        });
    });

    // Custom Color Picker change handler
    if (editorColorPicker) {
        editorColorPicker.addEventListener("input", (e) => {
            setEditorActiveColor(e.target.value);
            setEditorActiveTool("pencil"); // Auto switch to pencil

            // De-highlight pre-defined palette buttons unless it matches exactly
            paletteColors.forEach(pBtn => {
                if (pBtn.getAttribute("data-color").toLowerCase() === e.target.value.toLowerCase()) {
                    pBtn.classList.add("active");
                } else {
                    pBtn.classList.remove("active");
                }
            });
        });
    }

    // Keyboard support: Escape key closes modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && editorModal && !editorModal.classList.contains("hidden")) {
            closeModal();
        }
    });

    // Run Initialization
    initGrid();
});
