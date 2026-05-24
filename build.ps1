# build.ps1
# PowerShell alternative compiler for Windows environments without Node.js installed.

$lessonsDir = Join-Path $PSScriptRoot "_lessons"
$templatesDir = Join-Path $PSScriptRoot "_templates"
$rootIndex = Join-Path $PSScriptRoot "index.html"

if (-not (Test-Path $lessonsDir)) {
    Write-Error "Error: _lessons directory not found."
    exit 1
}

$templatePath = Join-Path $templatesDir "lesson-template.html"
if (-not (Test-Path $templatePath)) {
    Write-Error "Error: lesson-template.html template not found."
    exit 1
}

$lessonTemplate = [System.IO.File]::ReadAllText($templatePath)
$lessonFiles = Get-ChildItem -Path $lessonsDir -Filter "*.md"

$compiledLessons = @()

foreach ($file in $lessonFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Split front matter and content
    # YAML front matter is surrounded by ---
    $parts = $content -split "(?m)^---`r?`n"
    if ($parts.Count -lt 3) {
        Write-Warning "Skipping $($file.Name): Invalid front matter format."
        continue
    }
    
    $frontMatterText = $parts[1]
    $markdownText = $parts[2]
    
    # Parse metadata from front matter
    $title = ""
    $badge = "Science"
    $icon = "generic"
    $description = ""
    
    $fmLines = $frontMatterText -split "`r?`n"
    foreach ($line in $fmLines) {
        if ($line -match "^title:\s*(.*)$") { $title = $Matches[1].Trim() }
        if ($line -match "^badge:\s*(.*)$") { $badge = $Matches[1].Trim() }
        if ($line -match "^icon:\s*(.*)$") { $icon = $Matches[1].Trim() }
        if ($line -match "^description:\s*(.*)$") { $description = $Matches[1].Trim() }
    }
    
    $lessonId = $file.BaseName
    Write-Host "Compiling lesson: [$lessonId] - $title..."
    
    # Split markdown by H2 headings (##)
    # H2 starts with ## followed by text
    $stepBlocks = $markdownText -split "(?m)^##\s+"
    $stepsList = @()
    
    foreach ($block in $stepBlocks) {
        $trimmedBlock = $block.Trim()
        if (-not $trimmedBlock) { continue }
        
        $blockLines = $trimmedBlock -split "`r?`n"
        $stepTitle = $blockLines[0].Trim()
        $bodyMarkdown = ($blockLines[1..($blockLines.Length-1)] -join "`r`n").Trim()
        
        # Convert basic markdown elements to HTML
        # Bold: **word** -> <strong>word</strong>
        $bodyHtml = $bodyMarkdown
        $bodyHtml = [regex]::Replace($bodyHtml, "\*\*(.*?)\*\*", "<strong>`$1</strong>")
        
        # Paragraphs: Split by double newline and wrap in <p>
        $paragraphs = $bodyHtml -split "(?m)\r?\n\r?\n"
        $formattedParagraphs = @()
        foreach ($p in $paragraphs) {
            $trimmedP = $p.Trim()
            if ($trimmedP) {
                # Clean up single newlines inside paragraph to space
                $cleanP = $trimmedP -replace "\r?\n", " "
                $formattedParagraphs += "<p>$cleanP</p>"
            }
        }
        $bodyHtml = $formattedParagraphs -join "`n"
        
        # Convert steps to custom JSON object format
        # Escape quotes for JSON string
        $escapedTitle = $stepTitle -replace '"', '\"'
        $escapedContent = $bodyHtml -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
        
        $stepsList += "    {`n        `"title`": `"$escapedTitle`",`n        `"content`": `"$escapedContent`"`n    }"
    }
    
    $relativePath = "../"
    
    # Hydrate layout template
    $hydratedHtml = $lessonTemplate
    $hydratedHtml = $hydratedHtml.Replace("{{TITLE}}", $title)
    $hydratedHtml = $hydratedHtml.Replace("{{RELATIVE_PATH}}", $relativePath)
    
    # Generate output directory
    $outputDir = Join-Path $PSScriptRoot $lessonId
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    # Write index.html
    [System.IO.File]::WriteAllText((Join-Path $outputDir "index.html"), $hydratedHtml)
    
    # Write steps.js
    $stepsScript = "// Generated steps data for $title`nconst lessonSteps = [`n" + ($stepsList -join ",`n") + "`n];`n"
    [System.IO.File]::WriteAllText((Join-Path $outputDir "steps.js"), $stepsScript)
    
    $compiledLessons += [PSCustomObject]@{
        Id = $lessonId
        Title = $title
        Badge = $badge
        Icon = $icon
        Description = $description
    }
    
    Write-Host "Success: Generated module at /$lessonId/"
}

# Automatically rebuild the root index.html lessons portal grid!
if (Test-Path $rootIndex) {
    Write-Host "Rebuilding homepage lessons portal..."
    $rootHtml = [System.IO.File]::ReadAllText($rootIndex)
    
    $cardsHtml = ""
    foreach ($lesson in $compiledLessons) {
        $visualClass = "$($lesson.Icon)-visual"
        
        # Select SVG icon
        $iconSvg = ""
        if ($lesson.Icon -eq "electricity") {
            $iconSvg = '
        <div class="glow-orb"></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>'
        } elseif ($lesson.Icon -eq "magnetism") {
            $iconSvg = '
        <div class="glow-orb" style="background: #ef4444;"></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"></path>
            <path d="M12 6v6"></path>
            <path d="M8 10l4-4 4 4"></path>
        </svg>'
        } else {
            $iconSvg = '
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>'
        }
        
        $cardsHtml += "
            <a href=`"/$($lesson.Id)/`" class=`"lesson-card`">
                <div class=`"card-visual $visualClass`">
                    $iconSvg
                </div>
                <div class=`"card-content`">
                    <span class=`"badge`">$($lesson.Badge)</span>
                    <h2>$($lesson.Title)</h2>
                    <p>$($lesson.Description)</p>
                    <span class=`"action-link`">Start Lesson &rarr;</span>
                </div>
            </a>`n"
    }
    
    $cardsHtml += "
            <div class=`"lesson-card coming-soon`">
                <div class=`"card-visual`">
                    <svg viewBox=`"0 0 24 24`" fill=`"none`" stroke=`"currentColor`" stroke-width=`"1.5`" stroke-linecap=`"round`"
                        stroke-linejoin=`"round`">
                        <circle cx=`"12`" cy=`"12`" r=`"10`"></circle>
                        <line x1=`"12`" y1=`"8`" x2=`"12`" y2=`"12`"></line>
                        <line x1=`"12`" y1=`"16`" x2=`"12.01`" y2=`"16`"></line>
                    </svg>
                </div>
                <div class=`"card-content`">
                    <span class=`"badge badge-outline`">Coming Soon</span>
                    <h2>More Modules</h2>
                    <p>We are constantly developing new interactive lessons. Check back soon for more educational
                        content!</p>
                </div>
            </div>"
            
    # Regex to match lessons-grid
    $gridRegex = [regex]"(?s)(<section class=`"lessons-grid`">)(.*?)(</section>)"
    if ($gridRegex.IsMatch($rootHtml)) {
        $rootHtml = $gridRegex.Replace($rootHtml, "`$1$cardsHtml`n        `$3")
        [System.IO.File]::WriteAllText($rootIndex, $rootHtml)
        Write-Host "Success: Rebuilt homepage lessons portal."
    } else {
        Write-Warning "Could not find <section class='lessons-grid'> to replace in index.html"
    }
}

Write-Host "Lesson compilation complete!"
