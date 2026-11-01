[CmdletBinding()]
param(
  [string]$PublicIp = '',
  [string]$PublicHost = ''
)

$ErrorActionPreference = 'Stop'
$BackendDir = Split-Path -Parent $PSScriptRoot
$MediaDir = Join-Path $BackendDir 'mediamtx'
$EnvFile = Join-Path $BackendDir '.env'
$Caddyfile = Join-Path $BackendDir 'Caddyfile'
$CaddyState = Join-Path $env:LOCALAPPDATA 'OmniCast\public-media'
$AuthUrl = 'https://omnicast-api.vercel.app/api/v1/programs/studio/media-auth'

function Set-DotenvValue([string]$Text, [string]$Key, [string]$Value) {
  $pattern = '(?m)^' + [regex]::Escape($Key) + '=[^\r\n]*'
  if ($Text -match $pattern) {
    return [regex]::Replace($Text, $pattern, ($Key + '=' + $Value))
  }
  return $Text.TrimEnd() + "`r`n$Key=$Value`r`n"
}

function Send-UpnpAction([string]$Action, [string]$Arguments) {
  $envelope = @"
<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:$Action xmlns:u="$script:UpnpServiceType">$Arguments</u:$Action></s:Body>
</s:Envelope>
"@
  $request = [System.Net.HttpWebRequest]::Create($script:UpnpControlUri)
  $request.Method = 'POST'
  $request.ContentType = 'text/xml; charset="utf-8"'
  $request.Headers.Add('SOAPAction', "`"$script:UpnpServiceType#$Action`"")
  $body = [System.Text.Encoding]::UTF8.GetBytes($envelope)
  $request.ContentLength = $body.Length
  $request.Timeout = 8000
  $requestStream = $request.GetRequestStream()
  $requestStream.Write($body, 0, $body.Length)
  $requestStream.Close()

  try {
    $response = $request.GetResponse()
  } catch [System.Net.WebException] {
    $response = $_.Exception.Response
    if ($response) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $content = $reader.ReadToEnd()
      $response.Close()
      try {
        $fault = [xml]$content
        $code = $fault.SelectSingleNode("//*[local-name()='errorCode']")
        $description = $fault.SelectSingleNode("//*[local-name()='errorDescription']")
        if ($code) {
          throw "UPnP $Action fault $($code.InnerText): $($description.InnerText)"
        }
      } catch [System.Xml.XmlException] {
        # Keep the HTTP error below when the gateway did not return a SOAP fault.
      }
    }
    throw
  }

  $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
  $content = $reader.ReadToEnd()
  $response.Close()
  return [xml]$content
}

function Ensure-UpnpMapping([int]$Port, [string]$Protocol, [string]$LanIp) {
  $arguments = "<NewRemoteHost></NewRemoteHost><NewExternalPort>$Port</NewExternalPort><NewProtocol>$Protocol</NewProtocol><NewInternalPort>$Port</NewInternalPort><NewInternalClient>$LanIp</NewInternalClient><NewEnabled>1</NewEnabled><NewPortMappingDescription>OmniCast MediaMTX</NewPortMappingDescription><NewLeaseDuration>0</NewLeaseDuration>"
  try {
    [void](Send-UpnpAction 'AddPortMapping' $arguments)
    Write-Host "Mapped public $Protocol port $Port to ${LanIp}:$Port"
    return
  } catch {
    $addError = $_.Exception.Message
    $lookup = "<NewRemoteHost></NewRemoteHost><NewExternalPort>$Port</NewExternalPort><NewProtocol>$Protocol</NewProtocol>"
    try {
      $existing = Send-UpnpAction 'GetSpecificPortMappingEntry' $lookup
      $internalClient = $existing.SelectSingleNode("//*[local-name()='NewInternalClient']").InnerText
      $internalPort = $existing.SelectSingleNode("//*[local-name()='NewInternalPort']").InnerText
      if ($internalClient -eq $LanIp -and $internalPort -eq [string]$Port) {
        Write-Host "Public $Protocol port $Port is already mapped to this computer."
        return
      }
      throw "Public $Protocol port $Port is already mapped to $internalClient`:$internalPort."
    } catch {
      if ($_.Exception.Message -like 'Public * is already mapped*') { throw }
      throw "Router rejected the $Protocol port $Port mapping: $addError Configure this port manually to ${LanIp}:$Port, or run MediaMTX on a public VPS."
    }
  }
}

if ($PublicIp -and $PublicIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
  throw "Invalid public IPv4 address: $PublicIp"
}
if (-not (Test-Path $EnvFile)) { throw "Backend environment file not found: $EnvFile" }
if (-not (Test-Path $Caddyfile)) { throw "Caddyfile not found: $Caddyfile" }

$defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' |
  Sort-Object RouteMetric |
  Select-Object -First 1
$candidate = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1
if ($null -eq $candidate) { throw 'Could not detect this computer LAN IPv4 address.' }
$LanIp = $candidate.IPAddress
$RouterIp = $defaultRoute.NextHop

# Confirm that the router's WAN address matches the public address before
# creating port mappings; double NAT requires an upstream router change.
$udp = [System.Net.Sockets.UdpClient]::new()
$udp.Client.ReceiveTimeout = 1800
$search = "M-SEARCH * HTTP/1.1`r`nHOST: 239.255.255.250:1900`r`nMAN: `"ssdp:discover`"`r`nMX: 1`r`nST: urn:schemas-upnp-org:device:InternetGatewayDevice:1`r`n`r`n"
$searchBytes = [System.Text.Encoding]::ASCII.GetBytes($search)
$multicast = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Parse('239.255.255.250'), 1900)
[void]$udp.Send($searchBytes, $searchBytes.Length, $multicast)
$location = $null
try {
  $sender = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, 0)
  try {
    $reply = [System.Text.Encoding]::ASCII.GetString($udp.Receive([ref]$sender))
    if ($reply -match '(?im)^LOCATION:\s*(\S+)') { $location = $matches[1] }
  } catch [System.Net.Sockets.SocketException] {
    # Some gateways block SSDP multicast but still expose their description URL.
  }
} finally {
  $udp.Close()
}
if (-not $location) {
  $gatewayDescription = "http://$RouterIp`:5000/rootDesc.xml"
  try {
    [void](Invoke-WebRequest -Uri $gatewayDescription -TimeoutSec 8 -UseBasicParsing)
    $location = $gatewayDescription
  } catch {
    throw 'The router did not advertise UPnP over SSDP or expose its description at port 5000.'
  }
}

[xml]$deviceDescription = (Invoke-WebRequest -Uri $location -TimeoutSec 8 -UseBasicParsing).Content
$service = $null
foreach ($entry in $deviceDescription.SelectNodes("//*[local-name()='service']")) {
  $typeNode = $entry.SelectSingleNode("*[local-name()='serviceType']")
  if ($typeNode -and $typeNode.InnerText -match 'WAN(IP|PPP)Connection') {
    $service = $entry
    break
  }
}
if (-not $service) { throw 'The router does not expose a WANIPConnection/WANPPPConnection service.' }
$script:UpnpServiceType = $service.SelectSingleNode("*[local-name()='serviceType']").InnerText
$controlPath = $service.SelectSingleNode("*[local-name()='controlURL']").InnerText
$urlBaseNode = $deviceDescription.SelectSingleNode("//*[local-name()='URLBase']")
$urlBase = if ($urlBaseNode) { $urlBaseNode.InnerText } else { $location }
$script:UpnpControlUri = [Uri]::new([Uri]$urlBase, $controlPath).AbsoluteUri
$wan = Send-UpnpAction 'GetExternalIPAddress' ''
$routerPublicIp = $wan.SelectSingleNode("//*[local-name()='NewExternalIPAddress']").InnerText
$octets = @($routerPublicIp -split '\.' | ForEach-Object { [int]$_ })
$privateWanIp = (
  $octets[0] -eq 0 -or
  $octets[0] -eq 10 -or
  $octets[0] -eq 127 -or
  ($octets[0] -eq 169 -and $octets[1] -eq 254) -or
  ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31) -or
  ($octets[0] -eq 192 -and $octets[1] -eq 168) -or
  ($octets[0] -eq 100 -and $octets[1] -ge 64 -and $octets[1] -le 127)
)
if ($privateWanIp) {
  throw "Router WAN address $routerPublicIp is private/CGNAT; upstream port forwarding or a public VPS is required."
}
if ($PublicIp -and $PublicIp -ne $routerPublicIp) {
  throw "Requested public IP $PublicIp does not match router WAN IP $routerPublicIp."
}
$PublicIp = $routerPublicIp
if (-not $PublicHost) {
  $PublicHost = ($PublicIp -replace '\.', '-') + '.nip.io'
}

# Map only the HTTPS proxy and WebRTC ICE ports. HLS/WHIP HTTP stays behind Caddy.
$firewall = Join-Path $PSScriptRoot 'open-lan-ports.ps1'
$firewallProcess = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$firewall`"", '-Ports', '80,443') `
  -Wait -PassThru
if ($firewallProcess.ExitCode -ne 0) {
  throw 'Windows Firewall setup failed or elevation was not approved.'
}

try {
  Ensure-UpnpMapping 80 'TCP' $LanIp
} catch {
  Write-Warning "Router did not accept TCP port 80; HTTPS will use the TLS challenge on port 443. $($_.Exception.Message)"
}
Ensure-UpnpMapping 443 'TCP' $LanIp
Ensure-UpnpMapping 8189 'UDP' $LanIp
Ensure-UpnpMapping 8189 'TCP' $LanIp

$baseUrl = "https://$PublicHost"
$envText = [System.IO.File]::ReadAllText($EnvFile, [System.Text.Encoding]::UTF8)
$envText = Set-DotenvValue $envText 'MEDIAMTX_PUBLIC_HOST' $PublicHost
$envText = Set-DotenvValue $envText 'MEDIAMTX_PUBLIC_BASE_URL' $baseUrl
$envText = Set-DotenvValue $envText 'MEDIAMTX_HLS_URL' ''
$envText = Set-DotenvValue $envText 'MEDIAMTX_WHIP_URL' ''
$envText = Set-DotenvValue $envText 'MEDIAMTX_WEBRTC_URL' ''
$envText = Set-DotenvValue $envText 'MEDIAMTX_AUTH_URL' $AuthUrl
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($EnvFile, $envText, $utf8NoBom)

$env:OMNICAST_MEDIA_PUBLIC_HOST = $PublicHost
$env:OMNICAST_MEDIA_HLS_URL = $baseUrl
$env:OMNICAST_MEDIA_WHIP_URL = $baseUrl
$env:OMNICAST_MEDIA_WEBRTC_URL = $baseUrl.Replace('https://', 'wss://')
Push-Location $BackendDir
try {
  & npm.cmd run generate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed.' }
  & npm.cmd run migrate
  if ($LASTEXITCODE -ne 0) { throw 'Prisma migration failed.' }
  & node scripts/register-media-endpoint.js
  if ($LASTEXITCODE -ne 0) { throw 'Could not register the public media endpoint in the database.' }
} finally {
  Pop-Location
  Remove-Item Env:OMNICAST_MEDIA_PUBLIC_HOST -ErrorAction SilentlyContinue
  Remove-Item Env:OMNICAST_MEDIA_HLS_URL -ErrorAction SilentlyContinue
  Remove-Item Env:OMNICAST_MEDIA_WHIP_URL -ErrorAction SilentlyContinue
  Remove-Item Env:OMNICAST_MEDIA_WEBRTC_URL -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $CaddyState -Force | Out-Null
$caddyExe = Join-Path $CaddyState 'caddy.exe'
if (-not (Test-Path $caddyExe)) {
  Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' `
    -OutFile $caddyExe -TimeoutSec 60
}

$env:MEDIAMTX_PUBLIC_HOST = $PublicHost
$env:MEDIAMTX_UPSTREAM_HOST = '127.0.0.1'
& $caddyExe validate --config $Caddyfile
if ($LASTEXITCODE -ne 0) { throw 'Caddyfile validation failed.' }

$mediaMtx = Join-Path $MediaDir 'mediamtx.exe'
$mediaConfig = Join-Path $MediaDir 'mediamtx.yml'
$mediaLog = Join-Path $CaddyState 'mediamtx.log'
$mediaErr = Join-Path $CaddyState 'mediamtx.err.log'
$caddyLog = Join-Path $CaddyState 'caddy.log'
$caddyErr = Join-Path $CaddyState 'caddy.err.log'
$env:MTX_AUTHMETHOD = 'http'
$env:MTX_AUTHHTTPADDRESS = $AuthUrl
$env:MTX_WEBRTCADDITIONALHOSTS = $PublicHost
$mediaProcess = Start-Process -FilePath $mediaMtx -ArgumentList "`"$mediaConfig`"" `
  -WorkingDirectory $MediaDir -RedirectStandardOutput $mediaLog `
  -RedirectStandardError $mediaErr -WindowStyle Hidden -PassThru
$caddyProcess = Start-Process -FilePath $caddyExe `
  -ArgumentList "run --config `"$Caddyfile`"" `
  -WorkingDirectory $BackendDir -RedirectStandardOutput $caddyLog `
  -RedirectStandardError $caddyErr -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 3
if ($mediaProcess.HasExited) { throw "MediaMTX exited; inspect $mediaErr" }
if ($caddyProcess.HasExited) { throw "Caddy exited; inspect $caddyErr" }

Write-Host "Public HLS:  $baseUrl/<channel>/index.m3u8" -ForegroundColor Green
Write-Host "Public WHIP: $baseUrl/<channel>/whip" -ForegroundColor Green
Write-Host "ICE host:    $PublicHost (UDP/TCP 8189 forwarded to $LanIp)" -ForegroundColor Green
Write-Host "MediaMTX PID: $($mediaProcess.Id); Caddy PID: $($caddyProcess.Id)" -ForegroundColor DarkGray
