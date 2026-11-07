const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const sharedDir = __dirname;
const reportsDir = path.resolve(sharedDir, '../../01_Reports');

console.log('Reports root:', reportsDir);

// Build PowerShell script text
const ps1Content = `
$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " OmniCast - Professional Word & PDF Document Layout Styler and Exporter" -ForegroundColor Cyan
Write-Host " Academic Standard: FPT University Graduation Thesis Layout Specification" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Terminate any lingering Word processes to avoid file locks
Get-Process "WINWORD" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0 # wdAlertsNone

$targets = @(
    @{
        Docx   = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRN232\\\\PRN232_Report_VI.docx"
        Pdf    = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRN232\\\\PRN232_Report_VI.pdf"
        Lang   = "vi"
        Course = "PRN232"
        Label  = "PRN232 Report Vietnamese"
        Header = "OmniCast - Bao cao Do an Tot nghiep Toan dien (PRN232) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRN232\\\\PRN232_Report_EN.docx"
        Pdf    = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRN232\\\\PRN232_Report_EN.pdf"
        Lang   = "en"
        Course = "PRN232"
        Label  = "PRN232 Report English"
        Header = "OmniCast - Comprehensive Graduation Project Report (PRN232) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRM393\\\\PRM393_Report_VI.docx"
        Pdf    = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRM393\\\\PRM393_Report_VI.pdf"
        Lang   = "vi"
        Course = "PRM393"
        Label  = "PRM393 Report Vietnamese"
        Header = "OmniCast - Bao cao Do an Tot nghiep Toan dien (PRM393) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRM393\\\\PRM393_Report_EN.docx"
        Pdf    = "${reportsDir.replace(/\\/g, '\\\\')}\\\\PRM393\\\\PRM393_Report_EN.pdf"
        Lang   = "en"
        Course = "PRM393"
        Label  = "PRM393 Report English"
        Header = "OmniCast - Comprehensive Graduation Project Report (PRM393) | FPTU Quy Nhon AI Campus"
    }
)

try {
    foreach ($item in $targets) {
        $docxPath = $item.Docx
        $pdfPath  = $item.Pdf
        $label    = $item.Label
        $lang     = $item.Lang
        $headerText = $item.Header

        if (-not (Test-Path $docxPath)) {
            Write-Warning "Docx not found: $docxPath"
            continue
        }

        Write-Host ""
        Write-Host "--> Processing: $label" -ForegroundColor Yellow
        Write-Host "    File: $docxPath"
        
        $doc = $word.Documents.Open($docxPath, $false, $false)

        # ---------------------------------------------------------
        # 1. Page Margins & Layout (A4 Graduation Thesis Standard)
        # ---------------------------------------------------------
        $doc.PageSetup.PaperSize = 7       # wdPaperA4 (210mm x 297mm)
        $doc.PageSetup.TopMargin = 57      # 2.0 cm (approx 56.7 pt)
        $doc.PageSetup.BottomMargin = 57   # 2.0 cm (approx 56.7 pt)
        $doc.PageSetup.LeftMargin = 85     # 3.0 cm (book binding margin)
        $doc.PageSetup.RightMargin = 57    # 2.0 cm (approx 56.7 pt)
        $doc.PageSetup.DifferentFirstPageHeaderFooter = $true

        # ---------------------------------------------------------
        # 2. Typography Hierarchy (FPTU Academic Standards)
        # ---------------------------------------------------------
        try {
            $normal = $doc.Styles.Item("Normal")
            $normal.Font.Name = "Times New Roman"
            $normal.Font.Size = 11.5
            $normal.ParagraphFormat.LineSpacing = 15 # 1.25 line spacing
            $normal.ParagraphFormat.SpaceAfter = 4.5
            $normal.ParagraphFormat.SpaceBefore = 0
            $normal.ParagraphFormat.Alignment = 3 # wdAlignParagraphJustify
        } catch {}

        try {
            $h1 = $doc.Styles.Item("Heading 1")
            $h1.Font.Name = "Times New Roman"
            $h1.Font.Size = 16
            $h1.Font.Bold = 1
            $h1.ParagraphFormat.SpaceBefore = 18
            $h1.ParagraphFormat.SpaceAfter = 8
            $h1.ParagraphFormat.KeepWithNext = -1
            $h1.ParagraphFormat.PageBreakBefore = -1 # Always start chapter at top of new page
        } catch {}

        try {
            $h2 = $doc.Styles.Item("Heading 2")
            $h2.Font.Name = "Times New Roman"
            $h2.Font.Size = 13.5
            $h2.Font.Bold = 1
            $h2.ParagraphFormat.SpaceBefore = 12
            $h2.ParagraphFormat.SpaceAfter = 4
            $h2.ParagraphFormat.KeepWithNext = -1
        } catch {}

        try {
            $h3 = $doc.Styles.Item("Heading 3")
            $h3.Font.Name = "Times New Roman"
            $h3.Font.Size = 12
            $h3.Font.Bold = 1
            $h3.Font.Italic = 1
            $h3.ParagraphFormat.SpaceBefore = 8
            $h3.ParagraphFormat.SpaceAfter = 2
            $h3.ParagraphFormat.KeepWithNext = -1
        } catch {}

        try {
            $sc = $doc.Styles.Item("Source Code")
            $sc.Font.Name = "Consolas"
            $sc.Font.Size = 9.5
            $sc.ParagraphFormat.LineSpacing = 12
            $sc.ParagraphFormat.SpaceBefore = 3
            $sc.ParagraphFormat.SpaceAfter = 3
        } catch {}

        # ---------------------------------------------------------
        # 3. Running Headers & Footers with Page Numbers
        # ---------------------------------------------------------
        $section = $doc.Sections.Item(1)
        
        try {
            $header = $section.Headers.Item(1) # wdHeaderFooterPrimary
            $header.Range.Text = $headerText
            $header.Range.Font.Name = "Times New Roman"
            $header.Range.Font.Size = 9
            $header.Range.Font.Italic = 1
            $header.Range.ParagraphFormat.Alignment = 2 # wdAlignParagraphRight
        } catch {}

        try {
            $footer = $section.Footers.Item(1) # wdHeaderFooterPrimary
            $footerPrefix = if ($lang -eq "vi") { "Trang " } else { "Page " }
            $footerSep = if ($lang -eq "vi") { " / " } else { " of " }
            
            $footer.Range.Text = $footerPrefix
            $r1 = $footer.Range
            $r1.Collapse(0) # wdCollapseEnd
            $null = $footer.Range.Fields.Add($r1, 33) # wdFieldPage
            
            $r2 = $footer.Range
            $r2.Collapse(0)
            $r2.Text = $footerSep
            
            $r3 = $footer.Range
            $r3.Collapse(0)
            $null = $footer.Range.Fields.Add($r3, 26) # wdFieldNumPages

            $footer.Range.Font.Name = "Times New Roman"
            $footer.Range.Font.Size = 9.5
            $footer.Range.ParagraphFormat.Alignment = 1 # wdAlignParagraphCenter
        } catch {}

        # ---------------------------------------------------------
        # 4. Tables Optimization (AutoFit, Header Repeat, Padding)
        # ---------------------------------------------------------
        foreach ($table in $doc.Tables) {
            try { $table.AutoFitBehavior(2) } catch {} # wdAutoFitWindow
            try { $table.Rows.Alignment = 1 } catch {} # wdAlignRowCenter
            try { $table.Rows.AllowBreakAcrossPages = 0 } catch {}
            
            try {
                $firstRow = $table.Rows.Item(1)
                $firstRow.HeadingFormat = -1
                $firstRow.Range.Font.Bold = 1
                $firstRow.Shading.BackgroundPatternColor = 0xFAF5EB
            } catch {}

            try {
                $table.TopPadding = 4
                $table.BottomPadding = 4
                $table.LeftPadding = 6
                $table.RightPadding = 6
                $table.Range.Font.Name = "Times New Roman"
                $table.Range.Font.Size = 9.5
                $table.Range.ParagraphFormat.LineSpacing = 12
            } catch {}
        }

        # ---------------------------------------------------------
        # 5. Inline Figures & Captions (Auto Fit to Printable Width)
        # ---------------------------------------------------------
        foreach ($shape in $doc.InlineShapes) {
            try {
                $shape.Range.ParagraphFormat.Alignment = 1 # Center
                $shape.Range.ParagraphFormat.SpaceBefore = 8
                $shape.Range.ParagraphFormat.SpaceAfter = 3
                $shape.Range.ParagraphFormat.KeepWithNext = -1

                if ($shape.Width -gt 450) {
                    $ratio = 450.0 / $shape.Width
                    $shape.Width = 450
                    $shape.Height = [math]::Round($shape.Height * $ratio)
                }
            } catch {}
        }

        # ---------------------------------------------------------
        # 6. Update Table of Contents & All Dynamic Fields
        # ---------------------------------------------------------
        foreach ($toc in $doc.TablesOfContents) {
            try { $toc.Update() } catch {}
        }
        try { $doc.Fields.Update() } catch {}

        # ---------------------------------------------------------
        # 7. Save DOCX and Export PDF
        # ---------------------------------------------------------
        Write-Host "    [1/2] Saving formatted Word document (.docx)..." -ForegroundColor Cyan
        $doc.Save()
        $docxLen = (Get-Item $docxPath).Length
        Write-Host "    --> DOCX saved successfully. Size: $docxLen bytes" -ForegroundColor Green

        Write-Host "    [2/2] Exporting high-fidelity PDF (.pdf)..." -ForegroundColor Cyan
        $doc.SaveAs([ref]$pdfPath, [ref]17) # 17 = wdFormatPDF
        $doc.Close([ref]$false)
        $pdfLen = (Get-Item $pdfPath).Length
        Write-Host "    --> PDF exported successfully. Size: $pdfLen bytes" -ForegroundColor Green
    }
} finally {
    $word.Quit([ref]$false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host " All 4 Word Documents & Native PDFs Formatted, Re-Styled and Synchronized!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
`;

const ps1Path = path.join(sharedDir, 'run_export_clean.ps1');
// Write with UTF-8 BOM
fs.writeFileSync(ps1Path, '\uFEFF' + ps1Content, { encoding: 'utf8' });
console.log('Wrote clean PowerShell script with UTF-8 BOM to:', ps1Path);

console.log('Launching PowerShell process...');
const result = spawnSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', ps1Path], {
    stdio: 'inherit'
});

if (result.status !== 0) {
    console.error('PowerShell failed with exit code:', result.status);
    process.exit(result.status || 1);
} else {
    console.log('PDF & DOCX Export completed successfully!');
}

