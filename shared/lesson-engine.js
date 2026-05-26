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

    // --- Settings Panel Toggle Logic ---
    const settingsToggleBtn = document.getElementById("settings-toggle-btn");
    const settingsCloseBtn = document.getElementById("settings-close-btn");
    const settingsPanel = document.getElementById("settings-panel");

    function toggleSettingsPanel() {
        const isOpen = settingsPanel.classList.contains("open");
        if (isOpen) {
            closeSettingsPanel();
        } else {
            openSettingsPanel();
        }
    }

    function openSettingsPanel() {
        if (settingsPanel) {
            settingsPanel.classList.add("open");
        }
        if (settingsToggleBtn) {
            settingsToggleBtn.classList.add("active");
            settingsToggleBtn.setAttribute("aria-expanded", "true");
        }
    }

    function closeSettingsPanel() {
        if (settingsPanel) {
            settingsPanel.classList.remove("open");
        }
        if (settingsToggleBtn) {
            settingsToggleBtn.classList.remove("active");
            settingsToggleBtn.setAttribute("aria-expanded", "false");
        }
    }

    if (settingsToggleBtn) {
        settingsToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleSettingsPanel();
        });
    }

    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeSettingsPanel();
        });
    }

    // Close on click outside settings panel
    document.addEventListener("click", (e) => {
        if (settingsPanel && settingsPanel.classList.contains("open")) {
            if (!settingsPanel.contains(e.target) && !settingsToggleBtn.contains(e.target)) {
                closeSettingsPanel();
            }
        }
    });

    // Prevent closing when clicking inside the settings panel itself
    if (settingsPanel) {
        settingsPanel.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }

    // Close on Escape key press
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && settingsPanel && settingsPanel.classList.contains("open")) {
            closeSettingsPanel();
        }
    });

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


    // --- Translation & Vocabulary Logic ---
    const langBtns = document.querySelectorAll(".lang-btn");
    const tooltipEl = document.getElementById("keyterm-tooltip");
    const tooltipOriginal = document.getElementById("tooltip-original");
    const tooltipTranslation = document.getElementById("tooltip-translation");
    const tooltipDefinition = document.getElementById("tooltip-definition");
    const tooltipPronounceBtn = document.getElementById("tooltip-pronounce");

    let currentLang = localStorage.getItem("hhmb-translation-lang") || "none";
    let activeKeytermNode = null;
    let tooltipTimeout = null;

    function setTranslationLanguage(lang) {
        currentLang = lang;
        localStorage.setItem("hhmb-translation-lang", lang);

        langBtns.forEach(btn => {
            if (btn.getAttribute("data-lang") === lang) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        if (lang === "none") {
            if (appContainer) appContainer.classList.remove("translation-enabled");
        } else {
            if (appContainer) appContainer.classList.add("translation-enabled");
        }
    }

    // Initialize language toggle state
    setTranslationLanguage(currentLang);

    // Bind language button click actions
    langBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            setTranslationLanguage(btn.getAttribute("data-lang"));
            // Close tooltip if active when setting new language
            activeKeytermNode = null;
            hideTooltip();
        });
    });

    // Native Speech Synthesis for pronunciations
    function speakWord(text, lang) {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel(); // Cancel any active speech
            const utterance = new SpeechSynthesisUtterance(text);
            const locales = {
                "en": "en-US",
                "es": "es-ES",
                "pt": "pt-BR",
                "fr": "fr-FR",
                "de": "de-DE"
            };
            utterance.lang = locales[lang] || lang;
            window.speechSynthesis.speak(utterance);
        }
    }

    // Show floating tooltip
    function showTooltip(element, term) {
        if (typeof KEYTERMS === "undefined" || !KEYTERMS || !KEYTERMS[term]) return;
        if (currentLang === "none") return;

        const data = KEYTERMS[term][currentLang];
        if (!data) return;

        // Populate content values
        tooltipOriginal.textContent = element.textContent;
        tooltipTranslation.textContent = data.translation;
        tooltipDefinition.textContent = data.definition || "";

        // Setup pronounce button handler
        tooltipPronounceBtn.onclick = (e) => {
            e.stopPropagation();
            speakWord(data.translation, currentLang);
        };

        // Render in page and reset classes
        tooltipEl.style.display = "block";
        tooltipEl.classList.remove("visible", "arrow-top", "arrow-bottom");

        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();

        // Standard placement centered directly above the keyterm
        let top = window.scrollY + rect.top - tooltipRect.height - 8;
        let left = window.scrollX + rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Boundary adjustments
        if (rect.top - tooltipRect.height - 8 < 0) {
            // Flip tooltips to below if clipping at the top
            top = window.scrollY + rect.bottom + 8;
            tooltipEl.classList.add("arrow-top");
        } else {
            tooltipEl.classList.add("arrow-bottom");
        }

        // Horizontal screen constraint boundaries protection
        const padding = 12;
        if (left < padding) {
            left = padding;
        } else if (left + tooltipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tooltipRect.width - padding;
        }

        tooltipEl.style.top = `${top}px`;
        tooltipEl.style.left = `${left}px`;

        // Trigger CSS transition animation
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        setTimeout(() => {
            tooltipEl.classList.add("visible");
        }, 10);
    }

    function hideTooltip() {
        tooltipEl.classList.remove("visible");
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            if (!tooltipEl.classList.contains("visible")) {
                tooltipEl.style.display = "none";
            }
        }, 200);
    }

    // Keep tooltip active if hovering over the tooltip container itself
    if (tooltipEl) {
        tooltipEl.addEventListener("mouseleave", (e) => {
            const related = e.relatedTarget;
            if (related && (related === activeKeytermNode || activeKeytermNode?.contains(related))) {
                return;
            }
            activeKeytermNode = null;
            hideTooltip();
        });
    }

    // Dismiss active tooltips on clicking elsewhere
    document.addEventListener("click", () => {
        activeKeytermNode = null;
        hideTooltip();
    });

    // Safe, recursive DOM traversal to highlight vocabulary keywords exclusively in text nodes
    function injectKeyterms(node, regex) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (regex.test(text)) {
                const temp = document.createElement("div");
                temp.innerHTML = text.replace(regex, (match) => {
                    const normalized = match.toLowerCase();
                    return `<span class="keyterm" data-term="${normalized}">${match}</span>`;
                });

                const parent = node.parentNode;
                while (temp.firstChild) {
                    parent.insertBefore(temp.firstChild, node);
                }
                parent.removeChild(node);
            }
        } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.tagName !== "A" &&
            node.tagName !== "BUTTON" &&
            !node.classList.contains("keyterm")
        ) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                injectKeyterms(child, regex);
            }
        }
    }


    // Update Function (animates and injects data)
    function renderStep(index) {
        // Trigger CSS transition fade-out by removing class
        stepContainer.classList.remove("fade-in");
        
        // Wait 300ms for fade-out, then update content and fade-in
        setTimeout(() => {
            const step = lessonSteps[index];
            
            stepTitle.textContent = step.title;

            // Highlight matches dynamically using DOM tree walker
            const tempDiv = document.createElement("div");
            if (typeof DOMPurify === "undefined") {
                console.error("DOMPurify is not loaded! Halting render for security.");
                return;
            }

            // Configure DOMPurify to allow iframe and its necessary attributes
            const purifyConfig = { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] };
            tempDiv.innerHTML = DOMPurify.sanitize(step.content, purifyConfig);

            if (typeof KEYTERMS !== 'undefined' && KEYTERMS) {
                const terms = Object.keys(KEYTERMS).sort((a, b) => b.length - a.length);
                if (terms.length > 0) {
                    const escaped = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
                    const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
                    injectKeyterms(tempDiv, regex);
                }
            }

            stepContent.innerHTML = "";
            stepContent.appendChild(tempDiv);

            // Bind individual mouse listeners to the keyterm tags
            const keytermNodes = tempDiv.querySelectorAll(".keyterm");
            keytermNodes.forEach(node => {
                const term = node.getAttribute("data-term");

                node.addEventListener("mouseenter", () => {
                    if (activeKeytermNode !== node) {
                        activeKeytermNode = node;
                        showTooltip(node, term);
                    }
                });

                node.addEventListener("mouseleave", (e) => {
                    const related = e.relatedTarget;
                    if (related && (related === tooltipEl || tooltipEl.contains(related))) {
                        return;
                    }
                    activeKeytermNode = null;
                    hideTooltip();
                });

                node.addEventListener("click", (e) => {
                    e.stopPropagation();
                    activeKeytermNode = node;
                    showTooltip(node, term);
                });
            });

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
