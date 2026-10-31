# ============================================================
# OmniCast - Start MediaMTX with Cloudflare HTTPS Tunnel
# ============================================================
#
# Enables real-time camera streaming that works seamlessly on:
#   1. Web Deployment on Vercel (https://omnicast-fe.vercel.app)
#      -> ZERO Mixed-Content errors (HTTPS to HTTPS).
#   2. Mobile Flutter APK
#      -> Works over Wi-Fi, 4G, 5G from anywhere.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File backend\scripts\start-mediamtx-tunnel.ps1
# ============================================================

[CmdletBinding()]
param(
  [int]$HlsPort = 8888,
  [int]$WebRtcPort = 8889
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$MediaMtxDir = Join-Path $BackendDir 'mediamtx'
$ConfigFile = Join-Path $MediaMtxDir 'mediamtx.yml'
$LocalConfigFile = Join-Path $MediaMtxDir 'mediamtx.local.yml'
$MediaMtxExe = Join-Path $MediaMtxDir 'mediamtx.exe'
$CloudflaredExe = Join-Path $MediaMtxDir 'cloudflared.exe'

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " OmniCast - Live Stream Engine (MediaMTX + Cloudflare Tunnel)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Stop any existing mediamtx or cloudflared processes
Write-Host "==> Checking running processes..." -ForegroundColor Yellow
Get-Process -Name "mediamtx", "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# 2. Check executables
if (-not (Test-Path $MediaMtxExe)) {
  Write-Host "==> Downloading mediamtx.exe..." -ForegroundColor Yellow
  $zipUrl = "https://github.com/bluenviron/mediamtx/releases/download/v1.21.3/mediamtx_v1.21.3_windows_amd64.zip"
  $zipFile = Join-Path $MediaMtxDir "mediamtx.zip"
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
  Expand-Archive -Path $zipFile -DestinationPath $MediaMtxDir -Force
  Remove-Item $zipFile -Force
}

if (-not (Test-Path $CloudflaredExe)) {
  Write-Host "==> Downloading cloudflared.exe..." -ForegroundColor Yellow
  $cfUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
  Invoke-WebRequest -Uri $cfUrl -OutFile $CloudflaredExe
}

# 3. Detect LAN IP
$candidate = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceAlias -notlike 'vEthernet*' -and
    $_.InterfaceAlias -notlike 'Loopback*'
  } |
  Sort-Object -Property { if ($_.InterfaceAlias -match 'Wi-Fi|Wireless') { 0 } else { 1 } } |
  Select-Object -First 1

$LanIp = if ($null -ne $candidate) { $candidate.IPAddress } else { '127.0.0.1' }

# 4. Generate local mediamtx config
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$config = [System.IO.File]::ReadAllText($ConfigFile, [System.Text.Encoding]::UTF8)

# The tunnel only publishes HLS over HTTPS; WebRTC stays on the LAN.
# The ICE candidates are discovered live from the network interfaces
# (`webrtcIPsFromInterfaces: true` in the shared config), so no IP is
# hard-coded here - a DHCP renewal cannot leave a stale candidate.
$pattern = '(?m)^webrtcAdditionalHosts:[^\r\n]*'
$config = [regex]::Replace($config, $pattern, 'webrtcAdditionalHosts: []')
$pattern = '(?m)^hlsAddress:[^\r\n]*'
$config = [regex]::Replace($config, $pattern, ('hlsAddress: :' + $HlsPort))
$pattern = '(?m)^webrtcAddress:[^\r\n]*'
$config = [regex]::Replace($config, $pattern, ('webrtcAddress: :' + $WebRtcPort))

[System.IO.File]::WriteAllText($LocalConfigFile, $config, $Utf8NoBom)
Write-Host "==> MediaMTX configuration generated (LAN IP: $LanIp)." -ForegroundColor Green

# 5. Start MediaMTX in background
Write-Host "==> Starting MediaMTX server..." -ForegroundColor Green
$mediamtxLog = Join-Path $MediaMtxDir 'mediamtx.log'
$mediamtxErr = Join-Path $MediaMtxDir 'mediamtx.err.log'
$mediamtxProc = Start-Process -FilePath $MediaMtxExe -ArgumentList "`"$LocalConfigFile`"" -WorkingDirectory $MediaMtxDir -RedirectStandardOutput $mediamtxLog -RedirectStandardError $mediamtxErr -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1

# 6. Start Cloudflare Tunnel
Write-Host "==> Launching Cloudflare HTTPS Tunnel for port $HlsPort..." -ForegroundColor Green
$tunnelLog = Join-Path $MediaMtxDir 'cloudflared.log'
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

$cfProc = Start-Process -FilePath $CloudflaredExe -ArgumentList "tunnel --url http://localhost:$HlsPort" -WorkingDirectory $MediaMtxDir -RedirectStandardError $tunnelLog -PassThru -WindowStyle Hidden

# Wait for tunnel URL
$TunnelUrl = $null
$attempts = 0
while ($attempts -lt 30) {
  Start-Sleep -Seconds 1
  $attempts++
  if (Test-Path $tunnelLog) {
    $content = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
    if ($content -match 'https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com') {
      $TunnelUrl = $matches[0]
      break
    }
  }
}

if (-not $TunnelUrl) {
  Write-Host "[ERROR] Cloudflare Tunnel could not be established." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " LIVE STREAMING SECURE TUNNEL ESTABLISHED!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host " [HTTPS HLS Endpoint] : $TunnelUrl" -ForegroundColor Cyan
Write-Host " [Local HLS Port]     : http://localhost:$HlsPort" -ForegroundColor Cyan
Write-Host " [Local WHIP Ingest]  : http://localhost:$WebRtcPort" -ForegroundColor Cyan
Write-Host " [LAN IP]             : $LanIp" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green

# 6b. Publish the tunnel URL as MEDIAMTX_PUBLIC_BASE_URL in backend/.env
# The backend resolves the media host from this variable first, so every
# newly created live event is handed the tunnel URL (HTTPS — no mixed
# content on the Vercel deployment) instead of a LAN IP that only works
# for devices on this Wi-Fi.
$EnvFile = Join-Path $BackendDir '.env'
if (Test-Path $EnvFile) {
  try {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $envText = [System.IO.File]::ReadAllText($EnvFile, [System.Text.Encoding]::UTF8)
    $pattern = '(?m)^MEDIAMTX_PUBLIC_BASE_URL=.*$'
    if ($envText -match $pattern) {
      $envText = [regex]::Replace($envText, $pattern, "MEDIAMTX_PUBLIC_BASE_URL=$TunnelUrl")
    } else {
      $envText = $envText.TrimEnd() + "`r`nMEDIAMTX_PUBLIC_BASE_URL=$TunnelUrl`r`n"
    }
    [System.IO.File]::WriteAllText($EnvFile, $envText, $Utf8NoBom)
    Write-Host "==> MEDIAMTX_PUBLIC_BASE_URL set to $TunnelUrl" -ForegroundColor Green
    Write-Host "    (restart the backend to pick it up)" -ForegroundColor DarkGray
  } catch {
    Write-Warn "Could not update MEDIAMTX_PUBLIC_BASE_URL: $_"
  }
}

# 7. Update database active live events with the Tunnel HTTPS URL
Write-Host "==> Synchronizing Tunnel URL with Active Live Events in Cloud Database..." -ForegroundColor Yellow
$prismaPath = (Join-Path $BackendDir 'node_modules\@prisma\client').Replace('\', '/')
$syncScript = @"
const { PrismaClient } = require('$prismaPath');
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.liveEvent.findMany({
    where: { status: 'LIVE' },
    include: { channel: true }
  });
  if (events.length === 0) {
    console.log('No active LIVE events currently in DB. Ready for new broadcasts.');
  }
  for (const ev of events) {
    const slug = ev.channel?.slug || 'entertain';
    const newUrl = '$TunnelUrl/' + slug + '/index.m3u8';
    await prisma.liveEvent.update({
      where: { id: ev.id },
      data: { streamUrl: newUrl }
    });
    console.log('Synchronized LiveEvent ' + ev.id + ' (' + ev.title + ') -> ' + newUrl);
  }
}
main().catch(console.error).finally(() => prisma.`$disconnect());
"@
$tempSyncFile = Join-Path $BackendDir 'scripts\temp_sync.js'
Set-Content -Path $tempSyncFile -Value $syncScript -Encoding UTF8
node $tempSyncFile
Remove-Item $tempSyncFile -Force

Write-Host ""
Write-Host "DIRECTIONS TO BROADCAST AND VIEW:" -ForegroundColor White
Write-Host " 1. Broadcast Camera from Web Studio:" -ForegroundColor Yellow
Write-Host "    Open http://localhost:3000/studio/live (or http://localhost:3001/studio/live)" -ForegroundColor White
Write-Host "    Select channel -> Click 'Bat dau phat song truc tiep (Webcam)'." -ForegroundColor White
Write-Host ""
Write-Host " 2. View on Web Deployment (Vercel):" -ForegroundColor Yellow
Write-Host "    Open https://omnicast-fe.vercel.app/live/<room-id>" -ForegroundColor White
Write-Host "    -> Zero Mixed-Content errors, plays seamlessly via HTTPS!" -ForegroundColor White
Write-Host ""
Write-Host " 3. View on Mobile Flutter APK:" -ForegroundColor Yellow
Write-Host "    Open OmniCast APK -> Go to Live Room" -ForegroundColor White
Write-Host "    -> Plays seamlessly over Wi-Fi or 4G!" -ForegroundColor White
Write-Host ""
Write-Host "Press [Ctrl+C] to stop streaming and close tunnel." -ForegroundColor Gray

# Keep script alive while processes run
try {
  while ($true) {
    Start-Sleep -Seconds 2
    if ($mediamtxProc.HasExited -or $cfProc.HasExited) {
      break
    }
  }
} finally {
  Write-Host "==> Stopping streaming processes..." -ForegroundColor Yellow
  if (-not $mediamtxProc.HasExited) { Stop-Process -Id $mediamtxProc.Id -Force -ErrorAction SilentlyContinue }
  if (-not $cfProc.HasExited) { Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue }
  Write-Host "==> Stream engine stopped." -ForegroundColor Green
}
