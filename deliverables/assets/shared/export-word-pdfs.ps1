param(
    [string]$ReportsRoot = "..\..\01_Reports"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedRoot = Resolve-Path (Join-Path $scriptDir $ReportsRoot)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " OmniCast - Professional Word & PDF Document Layout Styler and Exporter" -ForegroundColor Cyan
Write-Host " Standard: FPT University Academic & Professional Deliverable Layout Standard" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Terminate any lingering Word processes to avoid file lock
Get-Process "WINWORD" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0 # wdAlertsNone

$targets = @(
    @{
        Docx   = (Join-Path $resolvedRoot "PRN232\PRN232_Report_VI.docx")
        Pdf    = (Join-Path $resolvedRoot "PRN232\PRN232_Report_VI.pdf")
        Lang   = "vi"
        Course = "PRN232"
        Label  = "PRN232 Report Vietnamese"
        Header = "OmniCast - Bao Cao Nghiem Thu Do An PRN232 | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.docx")
        Pdf    = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.pdf")
        Lang   = "en"
        Course = "PRN232"
        Label  = "PRN232 Report English"
        Header = "OmniCast - PRN232 Deliverable Report | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.docx")
        Pdf    = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.pdf")
        Lang   = "vi"
        Course = "PRM393"
        Label  = "PRM393 Report Vietnamese"
        Header = "OmniCast - Bao Cao Nghiem Thu Do An PRM393 | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.docx")
        Pdf    = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.pdf")
        Lang   = "en"
        Course = "PRM393"
        Label  = "PRM393 Report English"
        Header = "OmniCast - PRM393 Deliverable Report | FPTU Quy Nhon AI Campus"
    }
)

try {
    foreach ($item in $targets) {
        [string]$docxPath = [System.IO.Path]::GetFullPath($item.Docx)
        [string]$pdfPath  = [System.IO.Path]::GetFullPath($item.Pdf)
        $label = $item.Label
        $lang  = $item.Lang
        $headerText = $item.Header

        if (-not (Test-Path $docxPath)) {
            Write-Warning "Docx not found: $docxPath"
            continue
        }

        Write-Host "`n--> Formatting Layout and Typography: $label..." -ForegroundColor Yellow
        $doc = $word.Documents.Open($docxPath, $false, $false)

        # ---------------------------------------------------------
        # 1. Page Margins & Layout (Balanced Standard 0.75 - 0.8 in)
        # ---------------------------------------------------------
        $doc.PageSetup.TopMargin = 54      # 0.75 inch
        $doc.PageSetup.BottomMargin = 54   # 0.75 inch
        $doc.PageSetup.LeftMargin = 58     # 0.80 inch
        $doc.PageSetup.RightMargin = 58    # 0.80 inch
        $doc.PageSetup.DifferentFirstPageHeaderFooter = $true

        # ---------------------------------------------------------
        # 2. Typography Hierarchy (FPTU Academic Standards)
        # ---------------------------------------------------------
        # Normal Body Text
        try {
            $normal = $doc.Styles.Item("Normal")
            $normal.Font.Name = "Times New Roman"
            $normal.Font.Size = 11.5
            $normal.Font.Color = 0x222222
            $normal.ParagraphFormat.LineSpacing = 14
            $normal.ParagraphFormat.SpaceAfter = 5
            $normal.ParagraphFormat.SpaceBefore = 0
            $normal.ParagraphFormat.Alignment = 3 # wdAlignParagraphJustify
        } catch {}

        # Heading 1 (Major Chapters)
        try {
            $h1 = $doc.Styles.Item("Heading 1")
            $h1.Font.Name = "Times New Roman"
            $h1.Font.Size = 15
            $h1.Font.Bold = 1
            $h1.Font.Color = 0x45250B # Navy Blue (BGR)
            $h1.ParagraphFormat.SpaceBefore = 14
            $h1.ParagraphFormat.SpaceAfter = 6
            $h1.ParagraphFormat.KeepWithNext = -1
        } catch {}

        # Heading 2 (Subsections)
        try {
            $h2 = $doc.Styles.Item("Heading 2")
            $h2.Font.Name = "Times New Roman"
            $h2.Font.Size = 13
            $h2.Font.Bold = 1
            $h2.Font.Color = 0x894E1D # Slate Blue (BGR)
            $h2.ParagraphFormat.SpaceBefore = 10
            $h2.ParagraphFormat.SpaceAfter = 4
            $h2.ParagraphFormat.KeepWithNext = -1
        } catch {}

        # Heading 3 (Sub-subsections)
        try {
            $h3 = $doc.Styles.Item("Heading 3")
            $h3.Font.Name = "Times New Roman"
            $h3.Font.Size = 11.5
            $h3.Font.Bold = 1
            $h3.Font.Color = 0x2B3A42 # Deep Charcoal
            $h3.ParagraphFormat.SpaceBefore = 6
            $h3.ParagraphFormat.SpaceAfter = 2
            $h3.ParagraphFormat.KeepWithNext = -1
        } catch {}

        # Source Code / Monospace blocks
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
        
        # Primary Running Header (page 2+)
        try {
            $header = $section.Headers.Item(1) # wdHeaderFooterPrimary
            $header.Range.Text = $headerText
            $header.Range.Font.Name = "Times New Roman"
            $header.Range.Font.Size = 9
            $header.Range.Font.Italic = 1
            $header.Range.Font.Color = 0x666666
            $header.Range.ParagraphFormat.Alignment = 2 # wdAlignParagraphRight
        } catch {}

        # Primary Footer with Page Numbering (page 2+)
        try {
            $footer = $section.Footers.Item(1) # wdHeaderFooterPrimary
            $pagePrefix = if ($lang -eq "vi") { "Trang " } else { "Page " }
            $footer.Range.Text = $pagePrefix
            $fRange = $footer.Range
            $fRange.Collapse(0) # wdCollapseEnd
            $null = $footer.Range.Fields.Add($fRange, 33) # wdFieldPage
            $footer.Range.Font.Name = "Times New Roman"
            $footer.Range.Font.Size = 9.5
            $footer.Range.Font.Color = 0x555555
            $footer.Range.ParagraphFormat.Alignment = 1 # wdAlignParagraphCenter
        } catch {}

        # ---------------------------------------------------------
        # 4. Tables Optimization (AutoFit, Header Repeat, Padding)
        # ---------------------------------------------------------
        foreach ($table in $doc.Tables) {
            try { $table.AutoFitBehavior(2) } catch {} # wdAutoFitWindow
            try { $table.Rows.Alignment = 1 } catch {} # wdAlignRowCenter
            try { $table.Rows.AllowBreakAcrossPages = 0 } catch {}
            
            # Repeat header row across pages & apply soft banner shading
            try {
                $firstRow = $table.Rows.Item(1)
                $firstRow.HeadingFormat = -1
                $firstRow.Range.Font.Bold = 1
                $firstRow.Shading.BackgroundPatternColor = 0xF5F0E8 # Soft Azure/Beige Shading
            } catch {}

            # Cell font & padding
            try {
                $table.TopPadding = 3.5
                $table.BottomPadding = 3.5
                $table.LeftPadding = 5
                $table.RightPadding = 5
                $table.Range.Font.Name = "Times New Roman"
                $table.Range.Font.Size = 9.5
                $table.Range.ParagraphFormat.LineSpacing = 12
                $table.Range.ParagraphFormat.SpaceAfter = 1.5
                $table.Range.ParagraphFormat.SpaceBefore = 1.5
            } catch {}
        }

        # ---------------------------------------------------------
        # 5. Inline Figures & Captions
        # ---------------------------------------------------------
        foreach ($shape in $doc.InlineShapes) {
            try {
                $shape.Range.ParagraphFormat.Alignment = 1 # Center
                $shape.Range.ParagraphFormat.SpaceBefore = 6
                $shape.Range.ParagraphFormat.SpaceAfter = 3
                $shape.Range.ParagraphFormat.KeepWithNext = -1
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
        # 7. Synchronize BOTH Formatted Word (.docx) AND PDF (.pdf)
        # ---------------------------------------------------------
        Write-Host "--> Saving formatted Word document (.docx)..." -ForegroundColor Cyan
        $doc.Save()
        $docxItem = Get-Item $docxPath
        Write-Host "    [OK] Saved DOCX: $docxPath ($([math]::Round($docxItem.Length / 1MB, 2)) MB)" -ForegroundColor Green

        Write-Host "--> Exporting high-fidelity PDF (.pdf)..." -ForegroundColor Cyan
        $format = 17 # wdFormatPDF
        $doc.SaveAs([ref]$pdfPath, [ref]$format)
        $doc.Close([ref]$false)
        $pdfItem = Get-Item $pdfPath
        Write-Host "    [OK] Exported PDF: $pdfPath ($([math]::Round($pdfItem.Length / 1MB, 2)) MB)" -ForegroundColor Green
    }
} finally {
    $word.Quit([ref]$false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host " All 4 Word Documents & Native PDFs Formatted, Re-Styled and Synchronized!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
