# ============================================================
# OmniCast - Start MediaMTX with Cloudflare HTTPS Tunnel
# ============================================================
#
# Publishes both HLS playback and WHIP WebRTC publishing over
# a unified HTTPS reverse proxy (port 8885) to Cloudflare Tunnel.
# Works from any network / Wi-Fi with HTTPS and CORS support.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File backend\scripts\start-mediamtx-tunnel.ps1
# ============================================================

[CmdletBinding()]
param(
  [int]$HlsPort = 8888,
  [int]$WebRtcPort = 8889,
  [int]$ProxyPort = 8885
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$MediaMtxDir = Join-Path $BackendDir 'mediamtx'
$ConfigFile = Join-Path $MediaMtxDir 'mediamtx.yml'
$LocalConfigFile = Join-Path $MediaMtxDir 'mediamtx.local.yml'
$MediaMtxExe = Join-Path $MediaMtxDir 'mediamtx.exe'
$CloudflaredExe = Join-Path $MediaMtxDir 'cloudflared.exe'
$ProxyScript = Join-Path $ScriptDir 'media-proxy.js'

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

# Disable external HTTP auth dependency in tunnel mode so Web Studio & Mobile can publish directly
$pattern = '(?m)^authMethod:[^\r\n]*'
$config = [regex]::Replace($config, $pattern, 'authMethod: internal')
$pattern = '(?m)^authHTTPAddress:[^\r\n]*'
$config = [regex]::Replace($config, $pattern, "authInternalUsers:`r`n  - user: any`r`n    permissions:`r`n      - action: publish`r`n      - action: read`r`n      - action: playback")
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

# 6. Start Unified Reverse Proxy (Port 8885)
Write-Host "==> Starting Unified Media Reverse Proxy (port $ProxyPort)..." -ForegroundColor Green
$proxyLog = Join-Path $MediaMtxDir 'proxy.log'
$proxyErr = Join-Path $MediaMtxDir 'proxy.err.log'
$proxyProc = Start-Process -FilePath "node" -ArgumentList "`"$ProxyScript`"" -WorkingDirectory $BackendDir -RedirectStandardOutput $proxyLog -RedirectStandardError $proxyErr -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1

# 7. Start Cloudflare Tunnel for Proxy Port
Write-Host "==> Launching Cloudflare HTTPS Tunnel for port $ProxyPort..." -ForegroundColor Green
$tunnelLog = Join-Path $MediaMtxDir 'cloudflared.log'
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

$cfProc = Start-Process -FilePath $CloudflaredExe -ArgumentList "tunnel --url http://localhost:$ProxyPort" -WorkingDirectory $MediaMtxDir -RedirectStandardError $tunnelLog -PassThru -WindowStyle Hidden

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
  if (-not $proxyProc.HasExited) { Stop-Process -Id $proxyProc.Id -Force -ErrorAction SilentlyContinue }
  if (-not $mediamtxProc.HasExited) { Stop-Process -Id $mediamtxProc.Id -Force -ErrorAction SilentlyContinue }
  exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " LIVE STREAMING SECURE TUNNEL ESTABLISHED!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host " [HTTPS Tunnel Origin] : $TunnelUrl" -ForegroundColor Cyan
Write-Host " [Unified Proxy Port]  : http://localhost:$ProxyPort" -ForegroundColor Cyan
Write-Host " [Local HLS Port]      : http://localhost:$HlsPort" -ForegroundColor Cyan
Write-Host " [Local WHIP Ingest]   : http://localhost:$WebRtcPort" -ForegroundColor Cyan
Write-Host " [LAN IP]              : $LanIp" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green

# 8. Update environment file
$EnvFile = Join-Path $BackendDir '.env'
if (Test-Path $EnvFile) {
  try {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $envText = [System.IO.File]::ReadAllText($EnvFile, [System.Text.Encoding]::UTF8)

    $pattern = '(?m)^MEDIAMTX_HLS_URL=.*$'
    if ($envText -match $pattern) {
      $envText = [regex]::Replace($envText, $pattern, "MEDIAMTX_HLS_URL=$TunnelUrl")
    } else {
      $envText = $envText.TrimEnd() + "`r`nMEDIAMTX_HLS_URL=$TunnelUrl`r`n"
    }

    $whipPattern = '(?m)^MEDIAMTX_WHIP_URL=.*$'
    if ($envText -match $whipPattern) {
      $envText = [regex]::Replace($envText, $whipPattern, "MEDIAMTX_WHIP_URL=$TunnelUrl")
    } else {
      $envText = $envText.TrimEnd() + "`r`nMEDIAMTX_WHIP_URL=$TunnelUrl`r`n"
    }

    $basePattern = '(?m)^MEDIAMTX_PUBLIC_BASE_URL=.*$'
    if ($envText -match $basePattern) {
      $envText = [regex]::Replace($envText, $basePattern, "MEDIAMTX_PUBLIC_BASE_URL=$TunnelUrl")
    } else {
      $envText = $envText.TrimEnd() + "`r`nMEDIAMTX_PUBLIC_BASE_URL=$TunnelUrl`r`n"
    }

    [System.IO.File]::WriteAllText($EnvFile, $envText, $Utf8NoBom)
    Write-Host "==> MEDIAMTX_HLS_URL and MEDIAMTX_WHIP_URL set to $TunnelUrl" -ForegroundColor Green
  } catch {
    Write-Warning "Could not update .env: $_"
  }
}

# 9. Update database active live events with the Tunnel HTTPS URL
Write-Host "==> Synchronizing Tunnel URL with Active Live Events in Cloud Database..." -ForegroundColor Yellow
$prismaPath = (Join-Path $BackendDir 'node_modules\@prisma\client').Replace('\', '/')
$syncScript = @"
const { PrismaClient } = require('$prismaPath');
const prisma = new PrismaClient();
async function main() {
  const uri = new URL('$TunnelUrl');
  await prisma.liveMediaEndpointConfig.upsert({
    where: { id: 'primary' },
    create: {
      id: 'primary',
      publicHost: uri.hostname,
      hlsUrl: '$TunnelUrl',
      whipUrl: '$TunnelUrl',
      webrtcUrl: 'wss://' + uri.hostname,
    },
    update: {
      publicHost: uri.hostname,
      hlsUrl: '$TunnelUrl',
      whipUrl: '$TunnelUrl',
      webrtcUrl: 'wss://' + uri.hostname,
    },
  });
  console.log('⚡ Registered LiveMediaEndpointConfig in Cloud DB: ' + uri.hostname);

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
Write-Host "    Open http://localhost:3000/studio/live or https://omnicast-fe.vercel.app/studio/live" -ForegroundColor White
Write-Host "    Select channel -> Click 'Bat dau phat song truc tiep (Webcam)'." -ForegroundColor White
Write-Host ""
Write-Host " 2. View on Web Deployment (Vercel):" -ForegroundColor Yellow
Write-Host "    Open https://omnicast-fe.vercel.app/live/<room-id>" -ForegroundColor White
Write-Host "    -> Zero Mixed-Content errors, plays seamlessly via HTTPS!" -ForegroundColor White
Write-Host ""
Write-Host " 3. View / Broadcast on Mobile Flutter APK:" -ForegroundColor Yellow
Write-Host "    Open OmniCast APK -> Go to Live Room" -ForegroundColor White
Write-Host "    -> HLS playback and WHIP camera publish are accessible across all networks!" -ForegroundColor White
Write-Host ""
Write-Host "Press [Ctrl+C] to stop streaming and close tunnel." -ForegroundColor Gray

# Keep script alive while processes run
try {
  while ($true) {
    Start-Sleep -Seconds 2
    if ($mediamtxProc.HasExited -or $proxyProc.HasExited -or $cfProc.HasExited) {
      break
    }
  }
} finally {
  Write-Host "==> Stopping streaming processes..." -ForegroundColor Yellow
  if (-not $proxyProc.HasExited) { Stop-Process -Id $proxyProc.Id -Force -ErrorAction SilentlyContinue }
  if (-not $mediamtxProc.HasExited) { Stop-Process -Id $mediamtxProc.Id -Force -ErrorAction SilentlyContinue }
  if (-not $cfProc.HasExited) { Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue }
  Write-Host "==> Stream engine stopped." -ForegroundColor Green
}
