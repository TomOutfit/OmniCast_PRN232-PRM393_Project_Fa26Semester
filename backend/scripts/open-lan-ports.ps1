<#
.SYNOPSIS
    Opens the OmniCast development ports in the Windows Firewall for
    EVERY network profile, so the stack is reachable from any other
    device on whatever network the machine is currently joined to.

.DESCRIPTION
    WHY THIS EXISTS
    ---------------
    Windows Firewall rules created by installers are usually bound to
    a single network PROFILE (Public / Private / Domain). The machine
    in the lab is currently on a network Windows classifies as
    "Public", which is why the stack worked. The moment the same
    machine joins a home Wi-Fi (classified as "Private" by default)
    or a corporate Domain network, those rules no longer apply and
    every inbound connection to the dev ports is silently dropped.

    The rules created here are PORT based and cover ALL profiles, so
    the same setup works on any network without editing anything.

    They are also PATH independent: rules bound to `node.exe` break
    as soon as the executable lives somewhere else (nvm, a different
    Node install, a packaged build). Port rules keep working.

    ENCODING NOTE
    -------------
    This file is deliberately plain ASCII. Windows PowerShell 5.1
    reads a BOM-less file as ANSI, so a non-ASCII character such as
    an em dash inside a double-quoted string is decoded into bytes
    that terminate the string early and break the whole script.
    Keep this file ASCII-only.

.PARAMETER Remove
    Delete the OmniCast firewall rules instead of creating them.

.PARAMETER Ports
    Override the list of TCP ports that get opened.

.PARAMETER DryRun
    Print what would be done WITHOUT touching the firewall and
    WITHOUT requesting elevation. Useful for verifying the rule set.

.PARAMETER StatusFile
    Internal. Path of a file the elevated child process writes its
    exit code to, so the parent can tell whether the run succeeded
    when it had to fall back to an asynchronous elevation path.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\backend\scripts\open-lan-ports.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\backend\scripts\open-lan-ports.ps1 -Remove

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\backend\scripts\open-lan-ports.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [switch]$Remove,
    [switch]$DryRun,
    # A COMMA-SEPARATED list, e.g. "3000,3001,8888". It is a string
    # (not an int[]) on purpose: `powershell -File` passes every
    # argument as a literal string, so an int[] could not survive the
    # hand-off to the elevated child process.
    [string]$Ports = '3000,3001,8888,8889,1935',
    [string]$StatusFile = ''
)

$ErrorActionPreference = 'Stop'

# Prefix shared by every rule this script manages, so we can find and
# replace them idempotently without touching anything else.
$RulePrefix = 'OmniCast Dev'

$UdpPorts = @(8189)   # MediaMTX WebRTC ICE

# Parse the comma-separated port list into a clean int array.
$PortList = @(
    $Ports -split ',' |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -ne '' } |
        ForEach-Object { [int]$_ } |
        Sort-Object -Unique
)

if ($PortList.Count -eq 0) {
    throw 'No ports were given. Pass them as a comma-separated list, e.g. -Ports 3000,3001.'
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Remove-OmniCastRules {
    Get-NetFirewallRule -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like "$RulePrefix*" } |
        ForEach-Object {
            Write-Host "  Removing rule '$($_.DisplayName)'" -ForegroundColor DarkGray
            Remove-NetFirewallRule -Name $_.Name -ErrorAction SilentlyContinue
        }
}

# --- Dry run: describe the rules and exit -----------------------------
if ($DryRun) {
    Write-Host ''
    Write-Host 'OmniCast - firewall rules that WOULD be created:' -ForegroundColor Cyan
    Write-Host '------------------------------------------------' -ForegroundColor Cyan
    Write-Host '  Network profiles in effect:'
    Get-NetConnectionProfile -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host ("    {0,-24} {1}" -f $_.Name, $_.NetworkCategory) }
    Write-Host ''
    foreach ($port in $PortList) {
        Write-Host ("  + TCP {0}  (inbound, Profile Any)" -f $port)
    }
    foreach ($port in $UdpPorts) {
        Write-Host ("  + UDP {0}  (inbound, Profile Any)" -f $port)
    }
    Write-Host ''
    Write-Host 'Dry run - the firewall was NOT changed.' -ForegroundColor Yellow
    Write-Host ''
    exit 0
}

function Invoke-FirewallSetup {
    Write-Host ''
    Write-Host 'OmniCast - Windows Firewall setup for LAN access' -ForegroundColor Cyan
    Write-Host '------------------------------------------------' -ForegroundColor Cyan
    Write-Host 'Network profiles in effect:'
    Get-NetConnectionProfile -ErrorAction SilentlyContinue |
        ForEach-Object {
            Write-Host ("  {0,-24} {1}" -f $_.Name, $_.NetworkCategory)
        }
    Write-Host ''

    try {
        Write-Host 'Removing previous OmniCast rules (if any)...' -ForegroundColor Cyan
        Remove-OmniCastRules

        if ($Remove) {
            Write-Host 'All OmniCast firewall rules were removed.' -ForegroundColor Green
            Write-Host ''
            return 0
        }

        Write-Host 'Creating rules for ALL network profiles...' -ForegroundColor Cyan

        foreach ($port in $PortList) {
            $name = "$RulePrefix TCP $port"
            New-NetFirewallRule `
                -DisplayName $name `
                -Name ($name -replace ' ', '-') `
                -Direction Inbound `
                -Action Allow `
                -Protocol TCP `
                -LocalPort $port `
                -Profile Any `
                -Enabled True | Out-Null
            Write-Host "  + TCP $port" -ForegroundColor Green
        }

        foreach ($port in $UdpPorts) {
            $name = "$RulePrefix UDP $port"
            New-NetFirewallRule `
                -DisplayName $name `
                -Name ($name -replace ' ', '-') `
                -Direction Inbound `
                -Action Allow `
                -Protocol UDP `
                -LocalPort $port `
                -Profile Any `
                -Enabled True | Out-Null
            Write-Host "  + UDP $port" -ForegroundColor Green
        }

        Write-Host ''
        Write-Host 'Done. The stack is now reachable on ANY network profile.' -ForegroundColor Green
        Write-Host ''
        Write-Host 'Open ports:' -ForegroundColor Cyan
        foreach ($port in $PortList) { Write-Host "  http://<this-machine-ip>:$port" }
        Write-Host '  rtmp://<this-machine-ip>:1935'
        Write-Host '  udp://<this-machine-ip>:8189  (WebRTC ICE)'
        Write-Host ''
        Write-Host 'To undo: powershell -ExecutionPolicy Bypass -File .\backend\scripts\open-lan-ports.ps1 -Remove'
        Write-Host ''
        return 0
    } catch {
        Write-Host ''
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host 'The firewall was NOT changed.' -ForegroundColor Red
        return 1
    }
}

# --- Elevation --------------------------------------------------------
if (-not (Test-Admin)) {
    Write-Host ''
    Write-Host 'Administrator rights are required to change the Windows Firewall.' -ForegroundColor Yellow
    Write-Host 'Requesting elevation...' -ForegroundColor Yellow
    Write-Host ''

    $statusPath = $StatusFile
    if (-not $statusPath) {
        $statusPath = Join-Path $env:TEMP ("omnicast-fw-{0}.status" -f $PID)
    }
    if (Test-Path $statusPath) {
        Remove-Item $statusPath -Force -ErrorAction SilentlyContinue
    }

    $portArg = ($PortList -join ',')
    $childExit = $null

    # Attempt 1: direct elevation. This is the normal path and shows
    # the UAC prompt on the interactive desktop.
    try {
        # `-File` binds each switch at most once and passes every value
        # as a literal string, so the port list travels as ONE
        # comma-separated value.
        $elevatedArgs = @(
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', $PSCommandPath,
            '-Ports', $portArg,
            '-StatusFile', $statusPath
        )
        if ($Remove) { $elevatedArgs += '-Remove' }

        $child = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList $elevatedArgs `
            -Verb RunAs `
            -Wait `
            -PassThru
        $childExit = $child.ExitCode
    } catch {
        $childExit = -1
    }

    # Attempt 2: route the request through the Windows shell.
    # Start-Process -Verb RunAs fails when the calling process has no
    # INTERACTIVE WINDOW STATION - a terminal hosted by an IDE, a CI
    # step, or any non-interactive automation host - because the UAC
    # consent dialog has nowhere to be drawn. Shell.Application
    # delegates the request to Explorer, which always has an
    # interactive desktop, so the prompt appears normally.
    if ($childExit -ne 0) {
        Write-Host 'Direct elevation was not available here; retrying through the Windows shell...' -ForegroundColor Yellow
        try {
            $argLine = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Ports "{1}" -StatusFile "{2}"' -f $PSCommandPath, $portArg, $statusPath
            if ($Remove) { $argLine += ' -Remove' }

            $shell = New-Object -ComObject Shell.Application
            $shell.ShellExecute('powershell.exe', $argLine, '', 'runas', 1)

            # ShellExecute is asynchronous, so wait for the child to
            # publish its exit code.
            $deadline = (Get-Date).AddSeconds(120)
            while ((Get-Date) -lt $deadline) {
                if (Test-Path $statusPath) { break }
                Start-Sleep -Milliseconds 500
            }

            if (Test-Path $statusPath) {
                $childExit = [int]((Get-Content $statusPath -Raw).Trim())
            } else {
                $childExit = -1
            }
        } catch {
            $childExit = -1
        }
    }

    Remove-Item $statusPath -Force -ErrorAction SilentlyContinue

    if ($childExit -ne 0) {
        Write-Host ''
        Write-Host 'The elevated run failed - the firewall was NOT changed.' -ForegroundColor Red
        Write-Host 'If a UAC prompt appeared, approve it and run this script again.' -ForegroundColor Yellow
        exit 1
    }

    Write-Host ''
    Write-Host 'Elevation succeeded.' -ForegroundColor Green
    exit 0
}

$exitCode = Invoke-FirewallSetup

if ($StatusFile) {
    Set-Content -Path $StatusFile -Value $exitCode -Encoding ASCII -ErrorAction SilentlyContinue
}

exit $exitCode
