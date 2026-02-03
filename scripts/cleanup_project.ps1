# Doctify Project Cleanup Script
# This script cleans up temporary files, moves test files, and organizes documentation

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n" -NoNewline
    Write-ColorOutput "========================================" "Cyan"
    Write-ColorOutput " $Title" "Cyan"
    Write-ColorOutput "========================================" "Cyan"
}

# Statistics
$stats = @{
    FilesDeleted = 0
    FilesMoved = 0
    DirectoriesCreated = 0
    BytesFreed = 0
}

Write-Section "DOCTIFY PROJECT CLEANUP"

if ($DryRun) {
    Write-ColorOutput "`n[DRY RUN MODE] - No changes will be made`n" "Yellow"
}

# ====================
# 1. DELETE TEMPORARY FILES
# ====================
Write-Section "1. Deleting Temporary Files"

# temp_* files
$tempFiles = Get-ChildItem -Path "." -Filter "temp_*" -File -ErrorAction SilentlyContinue
foreach ($file in $tempFiles) {
    $size = $file.Length
    Write-ColorOutput "  Deleting: $($file.Name) ($([math]::Round($size/1KB, 2)) KB)" "Red"

    if (-not $DryRun) {
        Remove-Item $file.FullName -Force
        $stats.FilesDeleted++
        $stats.BytesFreed += $size
    }
}

# tmpclaude-*-cwd files
$claudeCache = Get-ChildItem -Path "." -Filter "tmpclaude-*-cwd" -File -ErrorAction SilentlyContinue
$cacheCount = ($claudeCache | Measure-Object).Count
if ($cacheCount -gt 0) {
    $cacheSize = ($claudeCache | Measure-Object -Property Length -Sum).Sum
    Write-ColorOutput "  Deleting: $cacheCount Claude cache files ($([math]::Round($cacheSize/1KB, 2)) KB)" "Red"

    if (-not $DryRun) {
        $claudeCache | Remove-Item -Force
        $stats.FilesDeleted += $cacheCount
        $stats.BytesFreed += $cacheSize
    }
}

# nul file
if (Test-Path "nul") {
    $nulFile = Get-Item "nul"
    $size = $nulFile.Length
    Write-ColorOutput "  Deleting: nul ($([math]::Round($size/1KB, 2)) KB)" "Red"

    if (-not $DryRun) {
        Remove-Item "nul" -Force
        $stats.FilesDeleted++
        $stats.BytesFreed += $size
    }
}

# ====================
# 2. MOVE TEST FILES
# ====================
Write-Section "2. Moving Test Files to Correct Locations"

# Create directories if they don't exist
$testDirs = @(
    "backend\tests\integration\test_rag",
    "backend\tests\fixtures",
    "backend\scripts"
)

foreach ($dir in $testDirs) {
    if (-not (Test-Path $dir)) {
        Write-ColorOutput "  Creating: $dir" "Green"
        if (-not $DryRun) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            $stats.DirectoriesCreated++
        }
    }
}

# Move test scripts
$testScripts = @{
    "test_chat_api.py" = "backend\tests\integration\test_api\test_chat_api.py"
    "test_rag_edge_cases.py" = "backend\tests\integration\test_rag\test_rag_edge_cases.py"
    "test_rag_final.py" = "backend\tests\integration\test_rag\test_rag_final.py"
    "test_rag_with_threshold.py" = "backend\tests\integration\test_rag\test_rag_with_threshold.py"
    "create_test_data.py" = "backend\scripts\create_test_data.py"
}

foreach ($source in $testScripts.Keys) {
    $dest = $testScripts[$source]
    if (Test-Path $source) {
        Write-ColorOutput "  Moving: $source -> $dest" "Cyan"
        if (-not $DryRun) {
            Move-Item -Path $source -Destination $dest -Force
            $stats.FilesMoved++
        }
    }
}

# Move test data files
$testData = @{
    "test_document.txt" = "backend\tests\fixtures\test_document.txt"
    "test_upload_document.txt" = "backend\tests\fixtures\test_upload_document.txt"
}

foreach ($source in $testData.Keys) {
    $dest = $testData[$source]
    if (Test-Path $source) {
        Write-ColorOutput "  Moving: $source -> $dest" "Cyan"
        if (-not $DryRun) {
            Move-Item -Path $source -Destination $dest -Force
            $stats.FilesMoved++
        }
    }
}

# ====================
# 3. ORGANIZE DOCUMENTATION
# ====================
Write-Section "3. Organizing Documentation Files"

# Create claudedocs subdirectories
$docDirs = @(
    "claudedocs\ocr-analysis",
    "claudedocs\rag-analysis"
)

foreach ($dir in $docDirs) {
    if (-not (Test-Path $dir)) {
        Write-ColorOutput "  Creating: $dir" "Green"
        if (-not $DryRun) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            $stats.DirectoriesCreated++
        }
    }
}

# Move OCR analysis documents
$ocrDocs = @{
    "GAP_ANALYSIS_REPORT.md" = "claudedocs\ocr-analysis\GAP_ANALYSIS_REPORT.md"
    "OCR_GAP_ANALYSIS_AND_OPTIMIZATIONS.md" = "claudedocs\ocr-analysis\OCR_GAP_ANALYSIS_AND_OPTIMIZATIONS.md"
    "OCR_IMPLEMENTATION_COMPLETE_SUMMARY.md" = "claudedocs\ocr-analysis\OCR_IMPLEMENTATION_COMPLETE_SUMMARY.md"
    "OCR_P1_ENHANCEMENTS_SUMMARY.md" = "claudedocs\ocr-analysis\OCR_P1_ENHANCEMENTS_SUMMARY.md"
    "OCR_PIPELINE_RESTORATION_SUMMARY.md" = "claudedocs\ocr-analysis\OCR_PIPELINE_RESTORATION_SUMMARY.md"
    "MIX_STORE_OCR_Analysis_Report.md" = "claudedocs\ocr-analysis\MIX_STORE_OCR_Analysis_Report.md"
    "OCR_Version_Comparison_Report.md" = "claudedocs\ocr-analysis\OCR_Version_Comparison_Report.md"
}

foreach ($source in $ocrDocs.Keys) {
    $dest = $ocrDocs[$source]
    if (Test-Path $source) {
        Write-ColorOutput "  Moving: $source -> $dest" "Cyan"
        if (-not $DryRun) {
            Move-Item -Path $source -Destination $dest -Force
            $stats.FilesMoved++
        }
    }
}

# Move RAG analysis document
if (Test-Path "RAG_TEST_REPORT.md") {
    Write-ColorOutput "  Moving: RAG_TEST_REPORT.md -> claudedocs\rag-analysis\RAG_TEST_REPORT.md" "Cyan"
    if (-not $DryRun) {
        Move-Item -Path "RAG_TEST_REPORT.md" -Destination "claudedocs\rag-analysis\RAG_TEST_REPORT.md" -Force
        $stats.FilesMoved++
    }
}

# ====================
# 4. DELETE CHINESE ORIGINALS
# ====================
Write-Section "4. Deleting Original Chinese Documents (Translated to English)"

# Find and delete Chinese markdown files (using wildcard pattern)
$chineseFiles = Get-ChildItem -Path "." -Filter "*OCR*分析*.md" -File -ErrorAction SilentlyContinue
$chineseFiles += Get-ChildItem -Path "." -Filter "*OCR*版本*.md" -File -ErrorAction SilentlyContinue

foreach ($file in $chineseFiles) {
    $size = $file.Length
    Write-ColorOutput "  Deleting: $($file.Name) (Translated to English) ($([math]::Round($size/1KB, 2)) KB)" "Red"
    if (-not $DryRun) {
        Remove-Item $file.FullName -Force
        $stats.FilesDeleted++
        $stats.BytesFreed += $size
    }
}

# ====================
# 5. CREATE INDEX FILES
# ====================
Write-Section "5. Creating Documentation Index Files"

# OCR Analysis Index
$ocrIndexPath = "claudedocs\ocr-analysis\README.md"
Write-ColorOutput "  Creating: $ocrIndexPath" "Green"

if (-not $DryRun) {
    $ocrIndexContent = @"
# OCR Analysis Reports Index

This directory contains comprehensive analysis reports for the OCR system development and optimization.

## Reports Overview

### Gap Analysis
- **[GAP_ANALYSIS_REPORT.md](GAP_ANALYSIS_REPORT.md)** - Initial gap analysis and improvement opportunities

### OCR Implementation
- **[OCR_GAP_ANALYSIS_AND_OPTIMIZATIONS.md](OCR_GAP_ANALYSIS_AND_OPTIMIZATIONS.md)** - Detailed OCR gap analysis and optimization strategies
- **[OCR_IMPLEMENTATION_COMPLETE_SUMMARY.md](OCR_IMPLEMENTATION_COMPLETE_SUMMARY.md)** - Complete implementation summary
- **[OCR_P1_ENHANCEMENTS_SUMMARY.md](OCR_P1_ENHANCEMENTS_SUMMARY.md)** - Phase 1 enhancements summary
- **[OCR_PIPELINE_RESTORATION_SUMMARY.md](OCR_PIPELINE_RESTORATION_SUMMARY.md)** - Pipeline restoration process and results

### Test Case Analysis
- **[MIX_STORE_OCR_Analysis_Report.md](MIX_STORE_OCR_Analysis_Report.md)** - Detailed analysis of MIX.STORE receipt OCR processing
- **[OCR_Version_Comparison_Report.md](OCR_Version_Comparison_Report.md)** - Version comparison and model escalation bug analysis

## Timeline
- Initial Gap Analysis: 2026-01-30
- Implementation & Testing: 2026-01-30
- Version Comparison & Bug Discovery: 2026-01-30

## Key Findings
- Model escalation metadata recording bug identified
- Line items recognition challenges with complex receipts
- Chinese character recognition accuracy issues
- Validation threshold configuration needs adjustment

_Last Updated: $(Get-Date -Format 'yyyy-MM-dd')_
"@

    $ocrIndexContent | Out-File -FilePath $ocrIndexPath -Encoding UTF8 -Force
}

# RAG Analysis Index
$ragIndexPath = "claudedocs\rag-analysis\README.md"
Write-ColorOutput "  Creating: $ragIndexPath" "Green"

if (-not $DryRun) {
    $ragIndexContent = @"
# RAG (Retrieval-Augmented Generation) Analysis Reports

This directory contains analysis reports for the RAG system testing and optimization.

## Reports

- **[RAG_TEST_REPORT.md](RAG_TEST_REPORT.md)** - Comprehensive RAG testing results and performance analysis

_Last Updated: $(Get-Date -Format 'yyyy-MM-dd')_
"@

    $ragIndexContent | Out-File -FilePath $ragIndexPath -Encoding UTF8 -Force
}

# ====================
# SUMMARY
# ====================
Write-Section "CLEANUP SUMMARY"

Write-ColorOutput "`nFiles Deleted: $($stats.FilesDeleted)" "Red"
Write-ColorOutput "Files Moved: $($stats.FilesMoved)" "Cyan"
Write-ColorOutput "Directories Created: $($stats.DirectoriesCreated)" "Green"
Write-ColorOutput "Space Freed: $([math]::Round($stats.BytesFreed/1KB, 2)) KB ($([math]::Round($stats.BytesFreed/1MB, 2)) MB)" "Yellow"

if ($DryRun) {
    Write-ColorOutput "`n[DRY RUN COMPLETED] - No changes were made" "Yellow"
    Write-ColorOutput "Run without -DryRun to execute cleanup`n" "Yellow"
} else {
    Write-ColorOutput "`n[CLEANUP COMPLETED SUCCESSFULLY]`n" "Green"
}

Write-Section "NEXT STEPS"

$nextSteps = @"

1. Review the organized documentation in claudedocs/
2. Verify test files are in correct locations under backend/tests/
3. Update .gitignore to prevent temp files from being committed
4. Consider adding the following to .gitignore:

   # Temporary files
   temp_*
   tmpclaude-*-cwd
   nul

"@

Write-ColorOutput $nextSteps "White"
