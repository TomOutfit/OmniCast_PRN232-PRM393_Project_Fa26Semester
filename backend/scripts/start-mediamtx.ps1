# ============================================================
# OmniCast - Start MediaMTX locally (Windows, no Docker)
# ============================================================
#
# Usage
#   .\scripts\start-mediamtx.ps1
#   .\scripts\start-mediamtx.ps1 -PublicHost 192.168.2.74
#   .\scripts\start-mediamtx.ps1 -Port 8888
#
# What it does
#   1. Detects the LAN IP of this machine (or uses -PublicHost).
#   2. Writes that IP into `backend/mediamtx/mediamtx.yml`
#      (`webrtcICEHostCandidates`) so phones on the same Wi-Fi can
#      establish the WebRTC ICE handshake.
#   3. Downloads `mediamtx.exe` (v1.21.3) on first run into
#      `backend/mediamtx/`.
#   4. Launches `mediamtx.exe mediamtx.yml` and prints the URLs
#      you need for `backend/.env`.
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
  [switch]$NoDownload
)

$ErrorActionPreference = 'Stop'

$MediaMtxVersion = 'v1.21.3'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$MediaMtxDir = Join-Path $BackendDir 'mediamtx'
$ConfigFile = Join-Path $MediaMtxDir 'mediamtx.yml'
$ExePath = Join-Path $MediaMtxDir 'mediamtx.exe'

function Write-Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
  Write-Host "    $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
  Write-Host "    $Message" -ForegroundColor Yellow
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

# ── 2. Ensure the config file exists ────────────────────────────────────────
if (-not (Test-Path $ConfigFile)) {
  throw "Config file not found: $ConfigFile"
}

# Rewrite the advertised LAN host + ports so the file always matches this run.
$config = Get-Content -Path $ConfigFile -Raw
$config = [regex]::Replace(
  $config,
  '(?m)^webrtcAdditionalHosts:.*$',
  "webrtcAdditionalHosts: [`"$PublicHost`"]"
)
$config = [regex]::Replace(
  $config,
  '(?m)^hlsAddress:.*$',
  "hlsAddress: :$HlsPort"
)
$config = [regex]::Replace(
  $config,
  '(?m)^webrtcAddress:.*$',
  "webrtcAddress: :$WebRtcPort"
)
Set-Content -Path $ConfigFile -Value $config -Encoding UTF8
Write-Ok "Synced $ConfigFile with PublicHost=$PublicHost"

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
  # Extract into a scratch folder — the release archive also ships its
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
  Write-Ok 'mediamtx.exe already present — skipping download.'
}

# ── 4. Launch ───────────────────────────────────────────────────────────────
$hlsUrl = "http://${PublicHost}:$HlsPort"
$whipUrl = "http://${PublicHost}:$WebRtcPort"
$webrtcUrl = "ws://${PublicHost}:$WebRtcPort"

Write-Host ''
Write-Step 'MediaMTX starting...'
Write-Host ''
Write-Host '    Viewer HLS (LL-HLS) : ' -NoNewline -ForegroundColor Cyan
Write-Host "$hlsUrl/<channel-slug>/index.m3u8" -ForegroundColor White
Write-Host '    WHIP publish (cam)  : ' -NoNewline -ForegroundColor Cyan
Write-Host "$whipUrl/<channel-slug>/whip" -ForegroundColor White
Write-Host '    WHEP playback        : ' -NoNewline -ForegroundColor Cyan
Write-Host "$webrtcUrl/<channel-slug>" -ForegroundColor White
Write-Host '    API / metrics        : ' -NoNewline -ForegroundColor Cyan
Write-Host "http://${PublicHost}:9997" -ForegroundColor White
Write-Host ''
Write-Host '    Copy into backend/.env:' -ForegroundColor Yellow
Write-Host "      MEDIAMTX_PUBLIC_HOST=$PublicHost"
Write-Host "      MEDIAMTX_HLS_URL=$hlsUrl"
Write-Host "      MEDIAMTX_WEBRTC_URL=$webrtcUrl"
Write-Host "      MEDIAMTX_WHIP_URL=$whipUrl"
Write-Host ''
Write-Host '    Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

Push-Location $MediaMtxDir
try {
  & $ExePath $ConfigFile
} finally {
  Pop-Location
}
