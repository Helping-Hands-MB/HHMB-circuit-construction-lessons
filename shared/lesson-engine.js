// lesson-engine.js
// Centralized state-machine and slide rendering for interactive circuit construction lessons.

document.addEventListener("DOMContentLoaded", () => {
    // Check that lessonSteps is defined globally by the lesson's steps.js file
    if (typeof lessonSteps === 'undefined' || !Array.isArray(lessonSteps)) {
        console.error("Error: lessonSteps array is not defined. Please include steps.js before lesson-engine.js.");
        return;
    }

    let currentStepIndex = 0;

    // Grab Elements from the DOM
    const stepTitle = document.getElementById("step-title");
    const stepContent = document.getElementById("step-content");
    const stepContainer = document.getElementById("step-container");
    const progressText = document.getElementById("progress-text");
    
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const resetBtn = document.getElementById("reset-btn");

    // --- Sidebar Width Controller Logic ---
    const btnWidthStandard = document.getElementById("btn-width-standard");
    const btnWidthWide = document.getElementById("btn-width-wide");
    const widthSlider = document.getElementById("sidebar-width-slider");
    const widthDisplay = document.getElementById("sidebar-width-display");
    const appContainer = document.querySelector(".app-container");

    const STORAGE_KEY = "hhmb-sidebar-width";
    const DEFAULT_WIDTH = 350;
    const WIDE_WIDTH = 550;

    function applySidebarWidth(width, saveToStorage = true) {
        const parsedWidth = Math.max(300, Math.min(800, parseInt(width, 10) || DEFAULT_WIDTH));
        
        if (appContainer) {
            appContainer.style.setProperty("--sidebar-width", `${parsedWidth}px`);
        } else {
            document.documentElement.style.setProperty("--sidebar-width", `${parsedWidth}px`);
        }

        if (widthSlider) {
            widthSlider.value = parsedWidth;
        }
        if (widthDisplay) {
            widthDisplay.textContent = `${parsedWidth}px`;
        }

        if (btnWidthStandard) {
            if (parsedWidth === DEFAULT_WIDTH) {
                btnWidthStandard.classList.add("active");
            } else {
                btnWidthStandard.classList.remove("active");
            }
        }
        if (btnWidthWide) {
            if (parsedWidth === WIDE_WIDTH) {
                btnWidthWide.classList.add("active");
            } else {
                btnWidthWide.classList.remove("active");
            }
        }

        if (saveToStorage) {
            localStorage.setItem(STORAGE_KEY, parsedWidth);
        }
    }

    // Initialize sidebar width from LocalStorage or default
    if (widthSlider) {
        const savedWidth = localStorage.getItem(STORAGE_KEY);
        applySidebarWidth(savedWidth || DEFAULT_WIDTH, false);

        widthSlider.addEventListener("input", (e) => {
            applySidebarWidth(e.target.value, true);
        });
    }

    if (btnWidthStandard) {
        btnWidthStandard.addEventListener("click", () => {
            applySidebarWidth(DEFAULT_WIDTH, true);
        });
    }

    if (btnWidthWide) {
        btnWidthWide.addEventListener("click", () => {
            applySidebarWidth(WIDE_WIDTH, true);
        });
    }

    // Update Function (animates and injects data)
    function renderStep(index) {
        // Trigger CSS transition fade-out by removing class
        stepContainer.classList.remove("fade-in");
        
        // Wait 300ms for fade-out, then update content and fade-in
        setTimeout(() => {
            const step = lessonSteps[index];
            
            stepTitle.textContent = step.title;
            stepContent.innerHTML = step.content; // Allows bolding/styling in descriptions
            progressText.textContent = `Progress: ${index + 1} of ${lessonSteps.length}`;
            
            // Trigger CSS transition fade-up
            stepContainer.classList.add("fade-in");
            
            // Manage button disabled/enabled states
            updateButtons(index);
        }, 300);
    }

    // Handles the business logic for standard navigation button states
    function updateButtons(index) {
        prevBtn.disabled = index === 0;
        
        if (index === lessonSteps.length - 1) {
            nextBtn.textContent = "Finish";
            nextBtn.classList.add("finish-btn");
        } else {
            nextBtn.textContent = "Next Step";
            nextBtn.classList.remove("finish-btn");
        }
    }

    // Next button
    nextBtn.addEventListener("click", () => {
        if (currentStepIndex < lessonSteps.length - 1) {
            currentStepIndex++;
            renderStep(currentStepIndex);
        } else {
            // "Finish" button click action
            alert("Congratulations! You have completed this lesson module.");
        }
    });

    // Previous button
    prevBtn.addEventListener("click", () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            renderStep(currentStepIndex);
        }
    });

    // Reset button
    resetBtn.addEventListener("click", () => {
        currentStepIndex = 0;
        renderStep(currentStepIndex);
    });

    // Initial render
    renderStep(currentStepIndex);
});
