# ============================================================
# OmniCast - Build script for PDF & DOCX reports
# Sets up MiKTeX and Pandoc environment and builds targets
# ============================================================
param (
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

$MikTexBin = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
$PandocBin = "$env:LOCALAPPDATA\Pandoc"

if (Test-Path $MikTexBin) {
    $env:PATH = "$MikTexBin;$env:PATH"
}
if (Test-Path $PandocBin) {
    $env:PATH = "$PandocBin;$env:PATH"
}

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Compile-Tex([string]$Dir, [string]$File, [string]$OutputFile = "", [string]$LatexNamedFile = "") {
    Write-Host "==> Compiling $File in $Dir..." -ForegroundColor Cyan
    Push-Location $Dir
    try {
        & xelatex -interaction=nonstopmode $File
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "First pass had warnings or non-zero code ($LASTEXITCODE). Retrying second pass..."
        }
        & xelatex -interaction=nonstopmode $File
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Compilation failed for $File"
        }
        Write-Host "==> Successfully compiled $File" -ForegroundColor Green

        $pdfName = [System.IO.Path]::ChangeExtension($File, ".pdf")
        if ($OutputFile -ne "") {
            $parentDir = Split-Path $Dir -Parent
            $targetPdf = Join-Path $parentDir $OutputFile
            Copy-Item -Path $pdfName -Destination $targetPdf -Force
            Write-Host "==> Copied $pdfName to $targetPdf" -ForegroundColor Green
        }
        if ($LatexNamedFile -ne "") {
            $namedPdf = Join-Path $Dir $LatexNamedFile
            Copy-Item -Path $pdfName -Destination $namedPdf -Force
            Write-Host "==> Copied $pdfName to $namedPdf" -ForegroundColor Green
        }
    }
    finally {
        Pop-Location
    }
}

$prn232Dir = Join-Path $RootDir "01_Reports\PRN232\latex"
$prm393Dir = Join-Path $RootDir "01_Reports\PRM393\latex"
$slidesDir = Join-Path $RootDir "06_Presentation"

switch ($Target) {
    "slides" {
        Compile-Tex $slidesDir "presentation.tex"
    }
    "prn232-vi" {
        Compile-Tex $prn232Dir "main-vi.tex" "PRN232_Report_VI.pdf" "OmniCast_Report_Latex PRN232 Version_Vietnamese.pdf"
    }
    "prn232-en" {
        Compile-Tex $prn232Dir "main-en.tex" "PRN232_Report_EN.pdf" "OmniCast_Report_Latex PRN232 Version_English.pdf"
    }
    "prm393-vi" {
        Compile-Tex $prm393Dir "main-vi.tex" "PRM393_Report_VI.pdf" "OmniCast_Report_Latex PRM393 Version_Vietnamese.pdf"
    }
    "prm393-en" {
        Compile-Tex $prm393Dir "main-en.tex" "PRM393_Report_EN.pdf" "OmniCast_Report_Latex PRM393 Version_English.pdf"
    }
    "tables" {
        Write-Host "==> Regenerating LaTeX tables from codebase..." -ForegroundColor Cyan
        Push-Location (Join-Path $RootDir "assets\shared")
        try {
            & node generate-tables.js
        }
        finally {
            Pop-Location
        }
    }
    "docx" {
        Write-Host "==> Generating 4 DOCX reports with Pandoc..." -ForegroundColor Cyan
        Push-Location (Join-Path $RootDir "assets\shared")
        try {
            & node build-docx.js
        }
        finally {
            Pop-Location
        }
    }
    "zip" {
        $parent = Split-Path $RootDir -Parent
        $zipFile = Join-Path $parent "OmniCast_PRN232_PRM393_Final_Deliverables.zip"
        if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
        Write-Host "==> Packaging deliverables into $zipFile..." -ForegroundColor Cyan
        Compress-Archive -Path $RootDir -DestinationPath $zipFile -CompressionLevel Optimal
        Write-Host "==> Verifying archive..." -ForegroundColor Cyan
        $item = Get-Item $zipFile
        Write-Host "==> Archive created successfully: $($item.FullName) ($([math]::Round($item.Length / 1MB, 2)) MB)" -ForegroundColor Green
    }
    "all" {
        if (Test-Path (Join-Path $prn232Dir "main-vi.tex")) { Compile-Tex $prn232Dir "main-vi.tex" "PRN232_Report_VI.pdf" "OmniCast_Report_Latex PRN232 Version_Vietnamese.pdf" }
        if (Test-Path (Join-Path $prn232Dir "main-en.tex")) { Compile-Tex $prn232Dir "main-en.tex" "PRN232_Report_EN.pdf" "OmniCast_Report_Latex PRN232 Version_English.pdf" }
        if (Test-Path (Join-Path $prm393Dir "main-vi.tex")) { Compile-Tex $prm393Dir "main-vi.tex" "PRM393_Report_VI.pdf" "OmniCast_Report_Latex PRM393 Version_Vietnamese.pdf" }
        if (Test-Path (Join-Path $prm393Dir "main-en.tex")) { Compile-Tex $prm393Dir "main-en.tex" "PRM393_Report_EN.pdf" "OmniCast_Report_Latex PRM393 Version_English.pdf" }
        if (Test-Path (Join-Path $slidesDir "presentation.tex")) { Compile-Tex $slidesDir "presentation.tex" }
    }
    default {
        Write-Error "Unknown target: $Target"
    }
}
