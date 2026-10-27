# ============================================================
# OmniCast - Start MediaMTX locally (Windows, no Docker)
# ============================================================
#
# Usage
#   .\scripts\start-mediamtx.ps1
#   .\scripts\start-mediamtx.ps1 -PublicHost 192.168.1.88
#   .\scripts\start-mediamtx.ps1 -HlsPort 8888 -WebRtcPort 8889
#   .\scripts\start-mediamtx.ps1 -SyncEnv
#
# What it does
#   1. Detects the LAN IP of this machine (or uses -PublicHost).
#   2. Generates `backend/mediamtx/mediamtx.local.yml` from the
#      shared `backend/mediamtx/mediamtx.yml`, injecting the LAN IP
#      into `webrtcAdditionalHosts` and the requested ports, then
#      launches MediaMTX with the generated file.
#      The shared file is never modified, so the Docker branch
#      always starts from the exact same configuration.
#   3. Downloads `mediamtx.exe` (v1.21.3) on first run into
#      `backend/mediamtx/`.
#   4. Prints the URLs you need for `backend/.env`.
#
# Encoding note (do not "simplify" this away)
#   MediaMTX parses the YAML with a strict YAML->JSON decoder and
#   REJECTS a UTF-8 BOM with:
#       ERR json: unknown field "\ufefflogLevel"
#   and then exits. Windows PowerShell 5.1's `Set-Content
#   -Encoding UTF8` writes a BOM, and `Get-Content` without an
#   explicit encoding decodes UTF-8 as the system ANSI code page
#   (which corrupts the non-ASCII characters in the file).
#   Hence the explicit UTF-8 (no BOM) read/write below.
#
# The matching env values are:
#   MEDIAMTX_PUBLIC_HOST=<ip>
#   MEDIAMTX_HLS_URL=http://<ip>:8888
#   MEDIAMTX_WEBRTC_URL=ws://<ip>:8889
#   MEDIAMTX_WHIP_URL=http://<ip>:8889
# ============================================================

[CmdletBinding()]
param(
  # Force the LAN IP advertised to WebRTC clients (auto-detected when omitted).
  [string]$PublicHost = '',
  # HLS port (must match MEDIAMTX_HLS_URL).
  [int]$HlsPort = 8888,
  # WebRTC / WHIP port (must match MEDIAMTX_WHIP_URL).
  [int]$WebRtcPort = 8889,
  # Skip the download step even if mediamtx.exe is missing.
  [switch]$NoDownload,
  # Write the detected URLs back into `backend/.env` (MEDIAMTX_* keys only).
  [switch]$SyncEnv
)

$ErrorActionPreference = 'Stop'

$MediaMtxVersion = 'v1.21.3'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$MediaMtxDir = Join-Path $BackendDir 'mediamtx'
$ConfigFile = Join-Path $MediaMtxDir 'mediamtx.yml'
$LocalConfigFile = Join-Path $MediaMtxDir 'mediamtx.local.yml'
$EnvFile = Join-Path $BackendDir '.env'
$ExePath = Join-Path $MediaMtxDir 'mediamtx.exe'

# UTF-8 without BOM - MediaMTX refuses to start on a BOM.
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
  Write-Host "    $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
  Write-Host "    $Message" -ForegroundColor Yellow
}

# Replace a whole YAML key without touching the line terminator.
# `[^\r\n]*` keeps a CRLF file CRLF and an LF file LF.
function Set-YamlValue([string]$Text, [string]$Key, [string]$Value) {
  $pattern = '(?m)^' + [regex]::Escape($Key) + ':[^\r\n]*'
  if ($Text -notmatch $pattern) {
    throw "Key '$Key' not found in the MediaMTX configuration."
  }
  return [regex]::Replace($Text, $pattern, ($Key + ': ' + $Value))
}

# Same idea for dotenv files, which use `KEY=value` instead of YAML.
function Set-DotenvValue([string]$Text, [string]$Key, [string]$Value) {
  $pattern = '(?m)^' + [regex]::Escape($Key) + '=[^\r\n]*'
  if ($Text -notmatch $pattern) {
    throw "Key '$Key' not found in the .env file."
  }
  return [regex]::Replace($Text, $pattern, ($Key + '=' + $Value))
}

# ── 1. Resolve the public host ──────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($PublicHost)) {
  Write-Step 'Detecting LAN IP address...'
  $candidate = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notlike 'vEthernet*' -and
      $_.InterfaceAlias -notlike 'Loopback*'
    } |
    Sort-Object -Property { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless') { 0 } else { 1 } } |
    Select-Object -First 1

  if ($null -eq $candidate) {
    Write-Warn 'Could not auto-detect a LAN IP. Falling back to localhost.'
    $PublicHost = 'localhost'
  } else {
    $PublicHost = $candidate.IPAddress
    Write-Ok "Detected LAN IP: $PublicHost ($($candidate.InterfaceAlias))"
  }
} else {
  Write-Ok "Using provided PublicHost: $PublicHost"
}

# ── 2. Generate the runtime configuration ───────────────────────────────────
if (-not (Test-Path $ConfigFile)) {
  throw "Config file not found: $ConfigFile"
}

# ReadAllText detects and strips an existing BOM; the explicit UTF-8
# decoder keeps the remaining characters intact.
$config = [System.IO.File]::ReadAllText($ConfigFile, [System.Text.Encoding]::UTF8)

$config = Set-YamlValue $config 'webrtcAdditionalHosts' ('["' + $PublicHost + '"]')
$config = Set-YamlValue $config 'hlsAddress' (':' + $HlsPort)
$config = Set-YamlValue $config 'webrtcAddress' (':' + $WebRtcPort)

[System.IO.File]::WriteAllText($LocalConfigFile, $config, $Utf8NoBom)
Write-Ok "Generated $LocalConfigFile (PublicHost=$PublicHost, HLS=$HlsPort, WebRTC=$WebRtcPort)"

# ── 3. Download mediamtx.exe if needed ──────────────────────────────────────
if (-not (Test-Path $ExePath)) {
  if ($NoDownload) {
    throw "mediamtx.exe not found at $ExePath and -NoDownload was specified."
  }

  $url = "https://github.com/bluenviron/mediamtx/releases/download/$MediaMtxVersion/mediamtx_${MediaMtxVersion}_windows_amd64.zip"
  $zipPath = Join-Path $MediaMtxDir 'mediamtx.zip'

  Write-Step "Downloading MediaMTX $MediaMtxVersion..."
  Write-Host "    $url"
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing -TimeoutSec 180

  Write-Step 'Extracting...'
  # Extract into a scratch folder - the release archive also ships its
  # own `mediamtx.yml` and we must NOT overwrite ours with it.
  $scratch = Join-Path $env:TEMP ("mediamtx-extract-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $scratch -Force | Out-Null
  try {
    Expand-Archive -Path $zipPath -DestinationPath $scratch -Force
    $extractedExe = Get-ChildItem -Path $scratch -Filter 'mediamtx.exe' -Recurse |
      Select-Object -First 1
    if ($null -eq $extractedExe) {
      throw 'mediamtx.exe not found inside the downloaded archive.'
    }
    Copy-Item -Path $extractedExe.FullName -Destination $ExePath -Force
  } finally {
    Remove-Item $scratch -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
  }

  if (-not (Test-Path $ExePath)) {
    throw "Download finished but $ExePath was not found in the archive."
  }
  Write-Ok 'mediamtx.exe ready.'
} else {
  Write-Ok 'mediamtx.exe already present - skipping download.'
}

# ── 4. Build the URL set ────────────────────────────────────────────────────
$hlsUrl = "http://${PublicHost}:$HlsPort"
$whipUrl = "http://${PublicHost}:$WebRtcPort"
$webrtcUrl = "ws://${PublicHost}:$WebRtcPort"
$rtmpUrl = "rtmp://${PublicHost}:1935"

# ── 5. Optionally sync backend/.env ──────────────────────────────────────────
if ($SyncEnv) {
  if (-not (Test-Path $EnvFile)) {
    Write-Warn "No $EnvFile found - skipping env sync."
  } else {
    $envText = [System.IO.File]::ReadAllText($EnvFile, [System.Text.Encoding]::UTF8)
    $envText = Set-DotenvValue $envText 'MEDIAMTX_PUBLIC_HOST' $PublicHost
    $envText = Set-DotenvValue $envText 'MEDIAMTX_HLS_URL' $hlsUrl
    $envText = Set-DotenvValue $envText 'MEDIAMTX_WEBRTC_URL' $webrtcUrl
    $envText = Set-DotenvValue $envText 'MEDIAMTX_WHIP_URL' $whipUrl
    $envText = Set-DotenvValue $envText 'MEDIAMTX_RTMP_URL' $rtmpUrl
    [System.IO.File]::WriteAllText($EnvFile, $envText, $Utf8NoBom)
    Write-Ok "Updated MEDIAMTX_* values in $EnvFile"
  }
}

# ── 6. Launch ───────────────────────────────────────────────────────────────
Write-Host ''
Write-Step 'MediaMTX starting...'
Write-Host ''
Write-Host '    Viewer HLS (LL-HLS) : ' -NoNewline -ForegroundColor Cyan
Write-Host "$hlsUrl/<channel-slug>/index.m3u8" -ForegroundColor White
Write-Host '    WHIP publish (cam)  : ' -NoNewline -ForegroundColor Cyan
Write-Host "$whipUrl/<channel-slug>/whip" -ForegroundColor White
Write-Host '    WHEP playback        : ' -NoNewline -ForegroundColor Cyan
Write-Host "$webrtcUrl/<channel-slug>" -ForegroundColor White
Write-Host '    RTMP publish (OBS)   : ' -NoNewline -ForegroundColor Cyan
Write-Host "$rtmpUrl/<channel-slug>" -ForegroundColor White
Write-Host '    API (localhost only) : ' -NoNewline -ForegroundColor Cyan
Write-Host 'http://127.0.0.1:9997' -ForegroundColor White
Write-Host ''
Write-Host '    Copy into backend/.env:' -ForegroundColor Yellow
Write-Host "      MEDIAMTX_PUBLIC_HOST=$PublicHost"
Write-Host "      MEDIAMTX_HLS_URL=$hlsUrl"
Write-Host "      MEDIAMTX_WEBRTC_URL=$webrtcUrl"
Write-Host "      MEDIAMTX_WHIP_URL=$whipUrl"
Write-Host "      MEDIAMTX_RTMP_URL=$rtmpUrl"
Write-Host ''
Write-Host '    Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

Push-Location $MediaMtxDir
try {
  & $ExePath $LocalConfigFile
} finally {
  Pop-Location
}
