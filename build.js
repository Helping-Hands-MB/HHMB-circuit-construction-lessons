// build.js
// Jekyll-style compiler that builds lesson markdown files into interactive website modules.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

// Configure marked options if needed (GFM, smart lists, etc.)
marked.setOptions({
    gfm: true,
    breaks: true
});

const LESSONS_DIR = path.join(__dirname, '_lessons');
const TEMPLATES_DIR = path.join(__dirname, '_templates');
const SHARED_DIR = path.join(__dirname, 'shared');
const ROOT_INDEX = path.join(__dirname, 'index.html');

// Predefined Icon SVGs for the homepage portal grid cards
const ICON_SVGs = {
    electricity: `
        <div class="glow-orb"></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>
    `,
    magnetism: `
        <div class="glow-orb" style="background: #ef4444;"></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"></path>
            <path d="M12 6v6"></path>
            <path d="M8 10l4-4 4 4"></path>
        </svg>
    `,
    generic: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
    `
};

function build() {
    console.log('Starting interactive lesson compilation...');

    // Generate keyterms.js from keyterms.json
    const keytermsJsonPath = path.join(SHARED_DIR, 'keyterms.json');
    const keytermsJsPath = path.join(SHARED_DIR, 'keyterms.js');
    if (fs.existsSync(keytermsJsonPath)) {
        try {
            console.log('Compiling vocabulary keyterms...');
            const keytermsContent = fs.readFileSync(keytermsJsonPath, 'utf8');
            // Validate JSON
            JSON.parse(keytermsContent);
            const compiledJs = `// Auto-generated from keyterms.json. Do not edit directly.\nconst KEYTERMS = ${keytermsContent.trim()};\n`;
            fs.writeFileSync(keytermsJsPath, compiledJs, 'utf8');
            console.log('Success: Generated shared/keyterms.js');
        } catch (e) {
            console.error('Error compiling keyterms.json:', e);
        }
    }

    if (!fs.existsSync(LESSONS_DIR)) {
        console.error(`Error: _lessons directory does not exist at ${LESSONS_DIR}`);
        process.exit(1);
    }

    const templatePath = path.join(TEMPLATES_DIR, 'lesson-template.html');
    if (!fs.existsSync(templatePath)) {
        console.error(`Error: lesson-template.html does not exist at ${templatePath}`);
        process.exit(1);
    }

    const lessonTemplate = fs.readFileSync(templatePath, 'utf8');
    const lessonFiles = fs.readdirSync(LESSONS_DIR).filter(file => file.endsWith('.md'));

    const compiledLessonsMetadata = [];

    lessonFiles.forEach(file => {
        const filePath = path.join(LESSONS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Parse front matter and content
        const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
        if (!match) {
            console.warn(`Warning: Skipping ${file} - missing or malformed YAML Front Matter.`);
            return;
        }

        const rawFrontMatter = match[1];
        const rawMarkdown = match[2];

        let metadata;
        try {
            metadata = yaml.load(rawFrontMatter);
        } catch (e) {
            console.error(`Error: Failed to parse YAML Front Matter in ${file}`);
            console.error(e);
            return;
        }

        const lessonId = path.basename(file, '.md');
        console.log(`Compiling lesson: [${lessonId}] - ${metadata.title}...`);

        // Split markdown by H2 headings (##)
        const stepBlocks = rawMarkdown.split(/^##\s+/m);
        const lessonSteps = [];

        stepBlocks.forEach((block, index) => {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) return;

            const lines = trimmedBlock.split('\n');
            const title = lines[0].trim();
            const bodyMarkdown = lines.slice(1).join('\n').trim();
            
            // Compile markdown body to clean HTML
            const contentHtml = marked.parse(bodyMarkdown).trim();

            lessonSteps.push({
                title: title,
                content: contentHtml
            });
        });

        // Calculate depth relative path (assumes outputs are always directly under root folders)
        const relativePath = '../';
        
        // Hydrate the layout template
        let hydratedHtml = lessonTemplate
            .replace(/{{TITLE}}/g, metadata.title)
            .replace(/{{RELATIVE_PATH}}/g, relativePath);

        // Generate output directory
        const outputDir = path.join(__dirname, lessonId);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write index.html
        fs.writeFileSync(path.join(outputDir, 'index.html'), hydratedHtml, 'utf8');
        
        // Write steps.js
        const stepsScript = `// Generated steps data for ${metadata.title}\nconst lessonSteps = ${JSON.stringify(lessonSteps, null, 4)};\n`;
        fs.writeFileSync(path.join(outputDir, 'steps.js'), stepsScript, 'utf8');

        // Store metadata for homepage listing
        compiledLessonsMetadata.push({
            id: lessonId,
            title: metadata.title,
            badge: metadata.badge || 'Science',
            icon: metadata.icon || 'generic',
            description: metadata.description || ''
        });

        console.log(`Success: Generated module at /${lessonId}/`);
    });

    // Automatically rebuild the root index.html lessons portal grid!
    if (fs.existsSync(ROOT_INDEX)) {
        console.log('Rebuilding homepage lessons portal...');
        let rootHtml = fs.readFileSync(ROOT_INDEX, 'utf8');

        // Construct the cards HTML
        let cardsHtml = '';
        compiledLessonsMetadata.forEach(lesson => {
            const visualClass = `${lesson.icon}-visual`;
            const iconSvg = ICON_SVGs[lesson.icon] || ICON_SVGs.generic;

            cardsHtml += `
            <a href="/${lesson.id}/" class="lesson-card">
                <div class="card-visual ${visualClass}">
                    ${iconSvg}
                </div>
                <div class="card-content">
                    <span class="badge">${lesson.badge}</span>
                    <h2>${lesson.title}</h2>
                    <p>${lesson.description}</p>
                    <span class="action-link">Start Lesson &rarr;</span>
                </div>
            </a>\n`;
        });

        // Add the generic placeholder "Coming Soon" card
        cardsHtml += `
            <div class="lesson-card coming-soon">
                <div class="card-visual">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="card-content">
                    <span class="badge badge-outline">Coming Soon</span>
                    <h2>More Modules</h2>
                    <p>We are constantly developing new interactive lessons. Check back soon for more educational
                        content!</p>
                </div>
            </div>`;

        // Match the layout grid brackets
        const gridRegex = /(<section class="lessons-grid">)([\s\S]*?)(<\/section>)/;
        if (gridRegex.test(rootHtml)) {
            rootHtml = rootHtml.replace(gridRegex, `$1${cardsHtml}\n        $3`);
            fs.writeFileSync(ROOT_INDEX, rootHtml, 'utf8');
            console.log('Success: Rebuilt homepage lessons list.');
        } else {
            console.warn('Warning: Could not locate <section class="lessons-grid"> element in index.html to rebuild.');
        }
    }

    console.log('Lesson compilation complete!');
}

build();
