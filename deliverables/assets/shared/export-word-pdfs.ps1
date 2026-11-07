param(
    [string]$ReportsRoot = "..\..\01_Reports"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedRoot = Resolve-Path (Join-Path $scriptDir $ReportsRoot)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " OmniCast - Professional Word & PDF Document Layout Styler and Exporter" -ForegroundColor Cyan
Write-Host " Academic Standard: FPT University Graduation Thesis Layout Specification" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Terminate any lingering Word processes to avoid file lock
Get-Process "WINWORD" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

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
        Header = "OmniCast --- Báo cáo Đồ án Tốt nghiệp Toàn diện (PRN232) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.docx")
        Pdf    = (Join-Path $resolvedRoot "PRN232\PRN232_Report_EN.pdf")
        Lang   = "en"
        Course = "PRN232"
        Label  = "PRN232 Report English"
        Header = "OmniCast --- Comprehensive Graduation Project Report (PRN232) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.docx")
        Pdf    = (Join-Path $resolvedRoot "PRM393\PRM393_Report_VI.pdf")
        Lang   = "vi"
        Course = "PRM393"
        Label  = "PRM393 Report Vietnamese"
        Header = "OmniCast --- Báo cáo Đồ án Tốt nghiệp Toàn diện (PRM393) | FPTU Quy Nhon AI Campus"
    },
    @{
        Docx   = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.docx")
        Pdf    = (Join-Path $resolvedRoot "PRM393\PRM393_Report_EN.pdf")
        Lang   = "en"
        Course = "PRM393"
        Label  = "PRM393 Report English"
        Header = "OmniCast --- Comprehensive Graduation Project Report (PRM393) | FPTU Quy Nhon AI Campus"
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
        # 1. Page Margins & Layout (FPTU Graduation Project A4 Standard)
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
        # Normal Body Text
        try {
            $normal = $doc.Styles.Item("Normal")
            $normal.Font.Name = "Times New Roman"
            $normal.Font.Size = 11.5
            $normal.Font.Color = 0x1E293B
            $normal.ParagraphFormat.LineSpacing = 15 # 1.25 line spacing
            $normal.ParagraphFormat.SpaceAfter = 4.5
            $normal.ParagraphFormat.SpaceBefore = 0
            $normal.ParagraphFormat.Alignment = 3 # wdAlignParagraphJustify
        } catch {}

        # Heading 1 (Major Chapters - Forces Clean Page Break)
        try {
            $h1 = $doc.Styles.Item("Heading 1")
            $h1.Font.Name = "Times New Roman"
            $h1.Font.Size = 16
            $h1.Font.Bold = 1
            $h1.Font.Color = 0x2A170F # Deep Navy (BGR)
            $h1.ParagraphFormat.SpaceBefore = 18
            $h1.ParagraphFormat.SpaceAfter = 8
            $h1.ParagraphFormat.KeepWithNext = -1
            $h1.ParagraphFormat.PageBreakBefore = -1 # Always start chapter at top of new page
        } catch {}

        # Heading 2 (Subsections)
        try {
            $h2 = $doc.Styles.Item("Heading 2")
            $h2.Font.Name = "Times New Roman"
            $h2.Font.Size = 13.5
            $h2.Font.Bold = 1
            $h2.Font.Color = 0x90740E # Dark Teal / Blue (BGR)
            $h2.ParagraphFormat.SpaceBefore = 12
            $h2.ParagraphFormat.SpaceAfter = 4
            $h2.ParagraphFormat.KeepWithNext = -1
        } catch {}

        # Heading 3 (Sub-subsections)
        try {
            $h3 = $doc.Styles.Item("Heading 3")
            $h3.Font.Name = "Times New Roman"
            $h3.Font.Size = 12
            $h3.Font.Bold = 1
            $h3.Font.Italic = 1
            $h3.Font.Color = 0x334155 # Deep Charcoal
            $h3.ParagraphFormat.SpaceBefore = 8
            $h3.ParagraphFormat.SpaceAfter = 2
            $h3.ParagraphFormat.KeepWithNext = -1
        } catch {}

        # Source Code / Monospace blocks
        try {
            $sc = $doc.Styles.Item("Source Code")
            $sc.Font.Name = "Consolas"
            $sc.Font.Size = 8.5
            $sc.ParagraphFormat.Alignment = 0 # wdAlignParagraphLeft (Prevents forced full justification letter-stretching)
            $sc.ParagraphFormat.LineSpacing = 11.5
            $sc.ParagraphFormat.SpaceBefore = 4
            $sc.ParagraphFormat.SpaceAfter = 4
            $sc.ParagraphFormat.LeftIndent = 12
            $sc.ParagraphFormat.RightIndent = 12
            $sc.ParagraphFormat.Shading.BackgroundPatternColor = 16053492 # 0xF4F4F4 elegant light gray box
        } catch {}

        # Ensure all Source Code and Monospace paragraphs are strictly Left-Aligned
        foreach ($p in $doc.Paragraphs) {
            $sName = ""
            try { $sName = $p.Style.NameLocal } catch {}
            $fName = ""
            try { $fName = $p.Range.Font.Name } catch {}
            if ($sName -match "Source|Code|Mã" -or $fName -match "Consolas|Courier") {
                $p.Range.ParagraphFormat.Alignment = 0 # wdAlignParagraphLeft
                $p.Range.ParagraphFormat.LeftIndent = 12
                $p.Range.ParagraphFormat.RightIndent = 12
                $p.Range.ParagraphFormat.LineSpacing = 11.5
                $p.Range.ParagraphFormat.SpaceBefore = 4
                $p.Range.ParagraphFormat.SpaceAfter = 4
                $p.Range.Font.Name = "Consolas"
                $p.Range.Font.Size = 8.5
                $p.Range.Font.Spacing = 0
                $p.Range.Font.Scaling = 100
                $p.Range.ParagraphFormat.Shading.BackgroundPatternColor = 16053492
            }
        }

        # ---------------------------------------------------------
        # 3. Graduation Thesis Cover Page Formatting & Section Break
        # ---------------------------------------------------------
        $findBreak = $doc.Content.Find
        $findBreak.Text = "[OMNICAST_COVER_SECTION_BREAK]"
        if ($findBreak.Execute()) {
            try {
                $rBreak = $findBreak.Parent
                $rBreak.Text = ""
                $rBreak.InsertBreak(2) # wdSectionBreakNextPage
            } catch {}
        }

        # Format Section 1 (COVER PAGE ONLY):
        try {
            $secCover = $doc.Sections.Item(1)
            $secCover.PageSetup.DifferentFirstPageHeaderFooter = $false
            $secCover.Headers.Item(1).Range.Text = ""
            $secCover.Footers.Item(1).Range.Text = ""
            
            # Decorative Double Line Academic Border Frame on Cover Page:
            foreach ($bId in @(-1, -2, -3, -4)) {
                $b = $secCover.Borders.Item($bId)
                $b.LineStyle = 7 # wdLineStyleDouble
                $b.LineWidth = 18 # wdLineWidth225pt (2.25 pt)
                $b.Color = 0x803300 # Deep Navy Blue in BGR
            }

            # Style Cover Page Logo
            if ($secCover.Range.InlineShapes.Count -ge 1) {
                $coverLogo = $secCover.Range.InlineShapes.Item(1)
                $coverLogo.Range.ParagraphFormat.Alignment = 1 # Center
                $coverLogo.Width = 85
                $coverLogo.Range.ParagraphFormat.SpaceBefore = 2
                $coverLogo.Range.ParagraphFormat.SpaceAfter = 3
            }

            # Style Cover Page Metadata Table
            if ($secCover.Range.Tables.Count -ge 1) {
                $coverTable = $secCover.Range.Tables.Item(1)
                $coverTable.AutoFitBehavior(2) # wdAutoFitWindow
                $coverTable.Rows.Alignment = 1 # Center
                $coverTable.Borders.Enable = 1
                foreach ($bId in @(-1, -2, -3, -4, -5, -6)) {
                    try {
                        $coverTable.Borders.Item($bId).Color = 0x803300
                        $coverTable.Borders.Item($bId).LineWidth = 8
                    } catch {}
                }
                $coverTable.Shading.BackgroundPatternColor = 0xFAF7F5
                $coverTable.TopPadding = 1.5
                $coverTable.BottomPadding = 1.5
                $coverTable.LeftPadding = 5
                $coverTable.RightPadding = 5
                $coverTable.Range.Font.Name = "Times New Roman"
                $coverTable.Range.Font.Size = 8.5
                $coverTable.Range.ParagraphFormat.LineSpacing = 10.5
                $coverTable.Range.ParagraphFormat.SpaceBefore = 1
                $coverTable.Range.ParagraphFormat.SpaceAfter = 1
            }
        } catch {}

        # Format Section 2+ (REPORT BODY):
        if ($doc.Sections.Count -ge 2) {
            $secBody = $doc.Sections.Item(2)
            try {
                # Ensure Section 2 has NO border frame
                foreach ($bId in @(-1, -2, -3, -4)) {
                    $secBody.Borders.Item($bId).LineStyle = 0 # wdLineStyleNone
                }
                
                # Unlink headers/footers from Section 1
                $secBody.Headers.Item(1).LinkToPrevious = $false
                $secBody.Footers.Item(1).LinkToPrevious = $false
                
                # Running Header for Report Body
                $secBody.Headers.Item(1).Range.Text = $headerText
                $secBody.Headers.Item(1).Range.Font.Name = "Times New Roman"
                $secBody.Headers.Item(1).Range.Font.Size = 9
                $secBody.Headers.Item(1).Range.Font.Italic = 1
                $secBody.Headers.Item(1).Range.ParagraphFormat.Alignment = 2 # wdAlignParagraphRight
                
                # Running Footer with Page Numbers
                $footerPrefix = if ($lang -eq "vi") { "Trang " } else { "Page " }
                $footerSep = if ($lang -eq "vi") { " / " } else { " of " }
                
                $secBody.Footers.Item(1).Range.Text = $footerPrefix
                $r1 = $secBody.Footers.Item(1).Range
                $r1.Collapse(0) # wdCollapseEnd
                $null = $secBody.Footers.Item(1).Range.Fields.Add($r1, 33) # wdFieldPage
                
                $r2 = $secBody.Footers.Item(1).Range
                $r2.Collapse(0)
                $r2.Text = $footerSep
                
                $r3 = $secBody.Footers.Item(1).Range
                $r3.Collapse(0)
                $null = $secBody.Footers.Item(1).Range.Fields.Add($r3, 26) # wdFieldNumPages

                $secBody.Footers.Item(1).Range.Font.Name = "Times New Roman"
                $secBody.Footers.Item(1).Range.Font.Size = 9.5
                $secBody.Footers.Item(1).Range.ParagraphFormat.Alignment = 1 # wdAlignParagraphCenter
            } catch {}
        } else {
            # Single section fallback
            $section = $doc.Sections.Item(1)
            try {
                $header = $section.Headers.Item(1)
                $header.Range.Text = $headerText
                $header.Range.Font.Name = "Times New Roman"
                $header.Range.Font.Size = 9
                $header.Range.Font.Italic = 1
                $header.Range.ParagraphFormat.Alignment = 2
            } catch {}

            try {
                $footer = $section.Footers.Item(1)
                $footerPrefix = if ($lang -eq "vi") { "Trang " } else { "Page " }
                $footerSep = if ($lang -eq "vi") { " / " } else { " of " }
                $footer.Range.Text = $footerPrefix
                $r1 = $footer.Range
                $r1.Collapse(0)
                $null = $footer.Range.Fields.Add($r1, 33)
                $r2 = $footer.Range
                $r2.Collapse(0)
                $r2.Text = $footerSep
                $r3 = $footer.Range
                $r3.Collapse(0)
                $null = $footer.Range.Fields.Add($r3, 26)
                $footer.Range.Font.Name = "Times New Roman"
                $footer.Range.Font.Size = 9.5
                $footer.Range.ParagraphFormat.Alignment = 1
            } catch {}
        }

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
                $firstRow.Shading.BackgroundPatternColor = 0xFAF5EB # Soft Azure/Blue Shading
            } catch {}

            # Cell font & padding
            try {
                $table.TopPadding = 4
                $table.BottomPadding = 4
                $table.LeftPadding = 6
                $table.RightPadding = 6
                $table.Range.Font.Name = "Times New Roman"
                $table.Range.Font.Size = 9.5
                $table.Range.ParagraphFormat.LineSpacing = 12
                $table.Range.ParagraphFormat.SpaceAfter = 2
                $table.Range.ParagraphFormat.SpaceBefore = 2
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

                # Restrict figure width to max 450 pt so it never overflows margins
                if ($shape.Width -gt 450) {
                    $ratio = 450.0 / $shape.Width
                    $shape.Width = 450
                    $shape.Height = [math]::Round($shape.Height * $ratio)
                }
            } catch {}
        }

        # ---------------------------------------------------------
        # 6. Insert Table of Contents & Update Dynamic Fields
        # ---------------------------------------------------------
        $findToc = $doc.Content.Find
        $findToc.Text = "[OMNICAST_TABLE_OF_CONTENTS_PLACEHOLDER]"
        if ($findToc.Execute()) {
            try {
                $tocRange = $findToc.Parent
                $tocRange.Text = ""
                $doc.TablesOfContents.Add($tocRange, $true, 1, 3)
            } catch {}
        }

        foreach ($tLevel in @("TOC 1", "TOC 2", "TOC 3")) {
            try {
                $st = $doc.Styles.Item($tLevel)
                $st.Font.Name = "Times New Roman"
                $st.Font.Size = 10.5
                $st.ParagraphFormat.LineSpacing = 13.5
            } catch {}
        }

        foreach ($toc in $doc.TablesOfContents) {
            try { $toc.Update() } catch {}
        }
        try { $doc.Fields.Update() } catch {}

        # ---------------------------------------------------------
        # References / Bibliography Formatting (Hanging Indent)
        # ---------------------------------------------------------
        foreach ($p in $doc.Paragraphs) {
            $pText = ""
            try { $pText = $p.Range.Text.Trim() } catch {}
            if ($pText -eq "REFERENCES" -or $pText -eq "TÀI LIỆU THAM KHẢO") {
                $p.Range.ParagraphFormat.PageBreakBefore = -1
                $p.Range.ParagraphFormat.SpaceBefore = 18
                $p.Range.ParagraphFormat.SpaceAfter = 12
                $p.Range.Font.Name = "Times New Roman"
                $p.Range.Font.Size = 16
                $p.Range.Font.Bold = 1
                $p.Range.Font.Color = 0x2A170F
            } elseif ($pText -match "^\[\d+\]") {
                $p.Range.ParagraphFormat.Alignment = 3 # wdAlignParagraphJustify
                $p.Range.ParagraphFormat.LeftIndent = 24
                $p.Range.ParagraphFormat.FirstLineIndent = -24
                $p.Range.ParagraphFormat.SpaceBefore = 2
                $p.Range.ParagraphFormat.SpaceAfter = 4
                $p.Range.ParagraphFormat.LineSpacing = 13
                $p.Range.Font.Name = "Times New Roman"
                $p.Range.Font.Size = 10
            }
        }

        # ---------------------------------------------------------
        # 7. Synchronize BOTH Formatted Word (.docx) AND PDF (.pdf)
        # ---------------------------------------------------------
        Write-Host "--> Saving formatted Word document (.docx)..." -ForegroundColor Cyan
        $doc.Save()
        $docxItem = Get-Item $docxPath
        $docxSizeMB = [math]::Round($docxItem.Length / 1048576, 2)
        Write-Host "    [OK] Saved DOCX: $docxPath ($docxSizeMB MB)" -ForegroundColor Green

        Write-Host "--> Exporting high-fidelity PDF (.pdf)..." -ForegroundColor Cyan
        $format = 17 # wdFormatPDF
        $doc.SaveAs([ref]$pdfPath, [ref]$format)
        $doc.Close([ref]$false)
        $pdfItem = Get-Item $pdfPath
        $pdfSizeMB = [math]::Round($pdfItem.Length / 1048576, 2)
        Write-Host "    [OK] Exported PDF: $pdfPath ($pdfSizeMB MB)" -ForegroundColor Green
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
