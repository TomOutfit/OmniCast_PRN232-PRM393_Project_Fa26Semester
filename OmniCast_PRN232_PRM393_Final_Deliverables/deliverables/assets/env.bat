@echo off
REM ============================================================
REM OmniCast - LaTeX build helper
REM Adds MiKTeX + Pandoc to PATH for the current shell and
REM exposes the commands used by build.ps1
REM ============================================================
set "MIKTEX=%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64"
set "PANDOC=%LOCALAPPDATA%\Pandoc"
if not "%MIKTEX%"=="" path "%MIKTEX%;%PATH%"
if not "%PANDOC%"=="" path "%PANDOC%;%PATH%"
