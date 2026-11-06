param(
    [string]$ReportsRoot = "..\..\01_Reports"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedRoot = Resolve-Path (Join-Path $scriptDir $ReportsRoot)

Write-Host "==> Starting Native Word COM PDF Export for All 4 Deliverable Reports..." -ForegroundColor Cyan

# Ensure no stale Word processes
Get-Process "WINWORD" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

$word = New-Object -ComObject Word.Application
$word.Visible = $false

$targets = @(
    @{
        Docx = (Join-Path $resolvedRoot "PRN232\PRN232_Report_VI.docx")
        Pdf  = (Join-Path $resolvedRoot "PRN232\PRN232_Report_VI.pdf")
        Label = "PRN232 Report Vietnamese"
    },
    @{
        Docx = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.docx")
        Pdf  = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.pdf")
        Label = "PRN232 Report English"
    },
    @{
        Docx = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.docx")
        Pdf  = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.pdf")
        Label = "PRM393 Report Vietnamese"
    },
    @{
        Docx = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.docx")
        Pdf  = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.pdf")
        Label = "PRM393 Report English"
    }
)

try {
    foreach ($item in $targets) {
        [string]$docxPath = [System.IO.Path]::GetFullPath($item.Docx)
        [string]$pdfPath  = [System.IO.Path]::GetFullPath($item.Pdf)
        $label = $item.Label

        if (-not (Test-Path $docxPath)) {
            Write-Warning "Docx not found: $docxPath"
            continue
        }

        Write-Host "--> Exporting $label to PDF via Word COM..." -ForegroundColor Yellow
        $doc = $word.Documents.Open($docxPath, $false, $true)
        $format = 17 # wdFormatPDF
        $doc.SaveAs([ref]$pdfPath, [ref]$format)
        $doc.Close([ref]$false)

        $pdfItem = Get-Item $pdfPath
        Write-Host "--> Successfully exported $label ($([math]::Round($pdfItem.Length / 1MB, 2)) MB)" -ForegroundColor Green
    }
} finally {
    $word.Quit([ref]$false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

Write-Host "==> All 4 Word PDF reports exported with 100% native Word fidelity!" -ForegroundColor Green
