# ============================================================
# OmniCast - Build script for PDF & DOCX reports
# Sets up MiKTeX and Pandoc environment and builds targets
# ============================================================
param (
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

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
        $texStderr = Join-Path $env:TEMP "omnicast-xelatex-stderr.log"
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        & xelatex -interaction=nonstopmode $File 2> $texStderr
        $firstPassExit = $LASTEXITCODE
        $ErrorActionPreference = $previousErrorAction
        if (Test-Path $texStderr) { Get-Content $texStderr | ForEach-Object { Write-Host $_ } }
        if ($firstPassExit -ne 0) {
            Write-Warning "First pass had warnings or non-zero code ($firstPassExit). Retrying second pass..."
        }
        $ErrorActionPreference = "Continue"
        & xelatex -interaction=nonstopmode $File 2> $texStderr
        $secondPassExit = $LASTEXITCODE
        $ErrorActionPreference = $previousErrorAction
        if (Test-Path $texStderr) { Get-Content $texStderr | ForEach-Object { Write-Host $_ } }
        if ($secondPassExit -ne 0) {
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
            if ($pdfName -ne $LatexNamedFile -and (Test-Path $pdfName)) {
                Remove-Item -Path $pdfName -Force -ErrorAction SilentlyContinue
                Write-Host "==> Cleaned intermediate $pdfName" -ForegroundColor Yellow
            }
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
        Compile-Tex $prn232Dir "main-vi.tex" "" "OmniCast_Report_Latex PRN232 Version_Vietnamese.pdf"
    }
    "prn232-en" {
        Compile-Tex $prn232Dir "main-en.tex" "" "OmniCast_Report_Latex PRN232 Version_English.pdf"
    }
    "prm393-vi" {
        Compile-Tex $prm393Dir "main-vi.tex" "" "OmniCast_Report_Latex PRM393 Version_Vietnamese.pdf"
    }
    "prm393-en" {
        Compile-Tex $prm393Dir "main-en.tex" "" "OmniCast_Report_Latex PRM393 Version_English.pdf"
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
        Write-Host "==> Generating 4 Exhaustive DOCX reports and exporting Word PDFs..." -ForegroundColor Cyan
        Push-Location (Join-Path $RootDir "assets\shared")
        try {
            & node build-docx.js
        }
        finally {
            Pop-Location
        }
    }
    "word-pdf" {
        Write-Host "==> Exporting all 4 Word reports to PDF via native Word COM..." -ForegroundColor Cyan
        Push-Location (Join-Path $RootDir "assets\shared")
        try {
            & powershell -ExecutionPolicy Bypass -File export-word-pdfs.ps1
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
        Write-Host "==> Step 1: Building Exhaustive Word Reports & Native Word PDFs..." -ForegroundColor Cyan
        Push-Location (Join-Path $RootDir "assets\shared")
        try {
            & node build-docx.js
        }
        finally {
            Pop-Location
        }

        Write-Host "==> Step 2: Compiling Concise & Streamlined LaTeX Reports (IEEE Conference Format)..." -ForegroundColor Cyan
        if (Test-Path (Join-Path $prn232Dir "main-vi.tex")) { Compile-Tex $prn232Dir "main-vi.tex" "" "OmniCast_Report_Latex PRN232 Version_Vietnamese.pdf" }
        if (Test-Path (Join-Path $prn232Dir "main-en.tex")) { Compile-Tex $prn232Dir "main-en.tex" "" "OmniCast_Report_Latex PRN232 Version_English.pdf" }
        if (Test-Path (Join-Path $prm393Dir "main-vi.tex")) { Compile-Tex $prm393Dir "main-vi.tex" "" "OmniCast_Report_Latex PRM393 Version_Vietnamese.pdf" }
        if (Test-Path (Join-Path $prm393Dir "main-en.tex")) { Compile-Tex $prm393Dir "main-en.tex" "" "OmniCast_Report_Latex PRM393 Version_English.pdf" }
        if (Test-Path (Join-Path $slidesDir "presentation.tex")) { Compile-Tex $slidesDir "presentation.tex" }
    }
    default {
        Write-Error "Unknown target: $Target"
    }
}
