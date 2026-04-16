param(
  [string]$BaseUrl = "http://localhost:5000",
  [string]$TenantId = "tenant-001",
  [string]$AdminUsername = "admin",
  [string]$AdminPassword = "admin123",
  [string]$AgentUsername = "agent",
  [string]$AgentPassword = "agent123"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendDir = Join-Path $repoRoot "backend"
$tenantDir = Join-Path $repoRoot "data\tenants\$TenantId"
$fixturesDir = Join-Path $PSScriptRoot "fixtures\tenant-001-baseline"
$countersFile = Join-Path $tenantDir "counters.json"
$ticketsFile = Join-Path $tenantDir "tickets.json"
$backupDir = Join-Path ([System.IO.Path]::GetTempPath()) ("multitrack-queue-backup-" + [guid]::NewGuid().ToString())
$stdoutLog = Join-Path $backupDir "backend.stdout.log"
$stderrLog = Join-Path $backupDir "backend.stderr.log"
$backendProcess = $null
$failures = [System.Collections.Generic.List[string]]::new()

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message"
}

function Add-Failure {
  param([string]$Message)
  $failures.Add($Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Add-Pass {
  param([string]$Message)
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Assert-Equal {
  param(
    $Actual,
    $Expected,
    [string]$Label
  )

  if ($Actual -eq $Expected) {
    Add-Pass "$Label (expected: $Expected)"
  } else {
    Add-Failure("$Label (expected: $Expected, actual: $Actual)")
  }
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Label
  )

  if ($Condition) {
    Add-Pass $Label
  } else {
    Add-Failure $Label
  }
}

function Invoke-CurlJson {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  $responseFile = New-TemporaryFile

  try {
    $args = @(
      "-sS",
      "-o", $responseFile.FullName,
      "-w", "%{http_code}",
      "-X", $Method
    )

    foreach ($headerName in $Headers.Keys) {
      $args += @("-H", "$headerName: $($Headers[$headerName])")
    }

    if ($null -ne $Body) {
      $jsonBody = $Body | ConvertTo-Json -Compress -Depth 20
      if (-not $Headers.ContainsKey("Content-Type")) {
        $args += @("-H", "Content-Type: application/json")
      }
      $args += @("--data-raw", $jsonBody)
    }

    $args += "$BaseUrl$Path"

    $statusText = & curl.exe @args
    $content = Get-Content $responseFile.FullName -Raw
    $json = $null

    if ($content) {
      try {
        $json = $content | ConvertFrom-Json -Depth 100
      } catch {
        $json = $null
      }
    }

    return [pscustomobject]@{
      StatusCode = [int]$statusText
      Json = $json
      Raw = $content
    }
  } finally {
    Remove-Item $responseFile.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Get-JwtPayload {
  param([string]$Token)

  if ([string]::IsNullOrWhiteSpace($Token)) {
    return $null
  }

  $segments = $Token.Split(".")
  if ($segments.Length -lt 2) {
    return $null
  }

  $payload = $segments[1].Replace("-", "+").Replace("_", "/")
  $padding = (4 - ($payload.Length % 4)) % 4
  if ($padding -gt 0) {
    $payload += ("=" * $padding)
  }

  $bytes = [System.Convert]::FromBase64String($payload)
  $json = [System.Text.Encoding]::UTF8.GetString($bytes)
  return $json | ConvertFrom-Json -Depth 20
}

function Wait-For-Backend {
  param([int]$TimeoutSeconds = 20)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-CurlJson -Method "GET" -Path "/api/health"
      if ($health.StatusCode -eq 200 -and $health.Json.success -eq $true) {
        return
      }
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Backend did not become healthy within $TimeoutSeconds seconds."
}

function Test-BackendRunning {
  try {
    $health = Invoke-CurlJson -Method "GET" -Path "/api/health"
    return ($health.StatusCode -eq 200 -and $health.Json.success -eq $true)
  } catch {
    return $false
  }
}

function Restore-State {
  if (Test-Path (Join-Path $backupDir "counters.json")) {
    Copy-Item (Join-Path $backupDir "counters.json") $countersFile -Force
  }

  if (Test-Path (Join-Path $backupDir "tickets.json")) {
    Copy-Item (Join-Path $backupDir "tickets.json") $ticketsFile -Force
  }
}

try {
  if (Test-BackendRunning) {
    throw "A backend is already running on $BaseUrl. Stop it first so this script can reset tenant files and start a fresh process with clean in-memory cache."
  }

  New-Item -ItemType Directory -Force $backupDir | Out-Null
  Copy-Item $countersFile (Join-Path $backupDir "counters.json") -Force
  Copy-Item $ticketsFile (Join-Path $backupDir "tickets.json") -Force
  Copy-Item (Join-Path $fixturesDir "counters.json") $countersFile -Force
  Copy-Item (Join-Path $fixturesDir "tickets.json") $ticketsFile -Force

  Write-Step "Starting backend from a clean tenant fixture"
  $backendProcess = Start-Process `
    -FilePath "node" `
    -ArgumentList "src/server.js" `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru `
    -WindowStyle Hidden

  Wait-For-Backend
  Add-Pass "Backend is healthy at $BaseUrl"

  Write-Step "Health check"
  $health = Invoke-CurlJson -Method "GET" -Path "/api/health"
  Assert-Equal $health.StatusCode 200 "Health endpoint status"
  Assert-True ($health.Json.success -eq $true) "Health endpoint success flag"

  Write-Step "Admin login"
  $adminLogin = Invoke-CurlJson -Method "POST" -Path "/api/auth/login" -Body @{
    tenantId = $TenantId
    username = $AdminUsername
    password = $AdminPassword
  }
  Assert-Equal $adminLogin.StatusCode 200 "Admin login status"
  Assert-True ($adminLogin.Json.success -eq $true) "Admin login success flag"
  $adminToken = if ($adminLogin.Json) { [string]$adminLogin.Json.data.token } else { "" }
  $adminJwt = Get-JwtPayload $adminToken
  Assert-True (-not [string]::IsNullOrWhiteSpace($adminToken)) "Admin login returned a JWT token"
  Assert-Equal (($adminLogin.Json.data.user.allowedTracks -join ",")) "A" "Admin response allowedTracks"
  Assert-Equal (($adminJwt.allowedTracks -join ",")) "A" "Admin JWT allowedTracks"

  Write-Step "Agent login"
  $agentLogin = Invoke-CurlJson -Method "POST" -Path "/api/auth/login" -Body @{
    tenantId = $TenantId
    username = $AgentUsername
    password = $AgentPassword
  }
  Assert-Equal $agentLogin.StatusCode 200 "Agent login status"
  Assert-True ($agentLogin.Json.success -eq $true) "Agent login success flag"
  $agentToken = if ($agentLogin.Json) { [string]$agentLogin.Json.data.token } else { "" }
  $agentJwt = Get-JwtPayload $agentToken
  Assert-True (-not [string]::IsNullOrWhiteSpace($agentToken)) "Agent login returned a JWT token"
  Assert-Equal (($agentLogin.Json.data.user.allowedTracks -join ",")) "B,C" "Agent response allowedTracks"
  Assert-Equal (($agentJwt.allowedTracks -join ",")) "B,C" "Agent JWT allowedTracks"

  Write-Step "Create Track B ticket"
  $ticketBCreate = Invoke-CurlJson -Method "POST" -Path "/api/tickets" -Body @{
    tenantId = $TenantId
    serviceId = "track-B"
    track = "B"
    customerType = "medical"
  }
  Assert-Equal $ticketBCreate.StatusCode 201 "Track B create status"
  Assert-True ($ticketBCreate.Json.success -eq $true) "Track B create success flag"
  $ticketBId = if ($ticketBCreate.Json) { [string]$ticketBCreate.Json.data.id } else { "" }
  Assert-True ($ticketBCreate.Json.data.number -like "B-*") "Track B number uses B prefix"
  Assert-Equal $ticketBCreate.Json.data.track "B" "Track B create track"
  Assert-Equal $ticketBCreate.Json.data.status "waiting" "Track B create status field"

  Write-Step "Agent call-next without open counter"
  $agentCallWithoutCounter = Invoke-CurlJson -Method "POST" -Path "/api/tickets/call-next" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $agentCallWithoutCounter.StatusCode 400 "Agent call-next without open counter status"
  Assert-True ($agentCallWithoutCounter.Json.success -eq $false) "Agent call-next without open counter success flag"
  Assert-Equal $agentCallWithoutCounter.Json.message "You must open a counter first" "Agent call-next without open counter message"

  Write-Step "Open counters"
  $adminOpenCounter1 = Invoke-CurlJson -Method "POST" -Path "/api/counters/open" -Headers @{
    Authorization = "Bearer $adminToken"
  } -Body @{
    tenantId = $TenantId
    counterId = "counter-1"
  }
  Assert-Equal $adminOpenCounter1.StatusCode 200 "Admin open counter-1 status"
  Assert-True ($adminOpenCounter1.Json.success -eq $true) "Admin open counter-1 success flag"
  Assert-Equal $adminOpenCounter1.Json.data.id "counter-1" "Admin opened counter-1"
  Assert-Equal $adminOpenCounter1.Json.data.status "open" "Counter-1 open status"
  Assert-Equal (($adminOpenCounter1.Json.data.allowedTracks -join ",")) "A" "Counter-1 allowedTracks"

  $agentOpenCounter2 = Invoke-CurlJson -Method "POST" -Path "/api/counters/open" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
    counterId = "counter-2"
  }
  Assert-Equal $agentOpenCounter2.StatusCode 200 "Agent open counter-2 status"
  Assert-True ($agentOpenCounter2.Json.success -eq $true) "Agent open counter-2 success flag"
  Assert-Equal $agentOpenCounter2.Json.data.id "counter-2" "Agent opened counter-2"
  Assert-Equal $agentOpenCounter2.Json.data.status "open" "Counter-2 open status"
  Assert-Equal (($agentOpenCounter2.Json.data.allowedTracks -join ",")) "B,C" "Counter-2 allowedTracks"

  Write-Step "Forbidden counter access checks"
  $agentOpenCounter1 = Invoke-CurlJson -Method "POST" -Path "/api/counters/open" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
    counterId = "counter-1"
  }
  Assert-Equal $agentOpenCounter1.StatusCode 403 "Agent opening counter-1 status"
  Assert-True ($agentOpenCounter1.Json.success -eq $false) "Agent opening counter-1 success flag"

  $adminOpenCounter2 = Invoke-CurlJson -Method "POST" -Path "/api/counters/open" -Headers @{
    Authorization = "Bearer $adminToken"
  } -Body @{
    tenantId = $TenantId
    counterId = "counter-2"
  }
  Assert-Equal $adminOpenCounter2.StatusCode 403 "Admin opening counter-2 status"
  Assert-True ($adminOpenCounter2.Json.success -eq $false) "Admin opening counter-2 success flag"

  Write-Step "Create Track A and Track C tickets"
  $ticketACreate = Invoke-CurlJson -Method "POST" -Path "/api/tickets" -Body @{
    tenantId = $TenantId
    serviceId = "track-A"
    track = "A"
    customerType = "company"
    companyName = "Acme Corp"
  }
  Assert-Equal $ticketACreate.StatusCode 201 "Track A create status"
  Assert-True ($ticketACreate.Json.success -eq $true) "Track A create success flag"
  $ticketAId = if ($ticketACreate.Json) { [string]$ticketACreate.Json.data.id } else { "" }
  Assert-True ($ticketACreate.Json.data.number -like "A-*") "Track A number uses A prefix"
  Assert-Equal $ticketACreate.Json.data.track "A" "Track A create track"
  Assert-Equal $ticketACreate.Json.data.status "waiting" "Track A create status field"

  $ticketCCreate = Invoke-CurlJson -Method "POST" -Path "/api/tickets" -Body @{
    tenantId = $TenantId
    serviceId = "track-C"
    track = "C"
    customerType = "regular"
  }
  Assert-Equal $ticketCCreate.StatusCode 201 "Track C create status"
  Assert-True ($ticketCCreate.Json.success -eq $true) "Track C create success flag"
  $ticketCId = if ($ticketCCreate.Json) { [string]$ticketCCreate.Json.data.id } else { "" }
  Assert-True ($ticketCCreate.Json.data.number -like "C-*") "Track C number uses C prefix"
  Assert-Equal $ticketCCreate.Json.data.track "C" "Track C create track"
  Assert-Equal $ticketCCreate.Json.data.status "waiting" "Track C create status field"

  Write-Step "Queue snapshot after ticket creation"
  $queueAfterCreate = Invoke-CurlJson -Method "GET" -Path "/api/tickets?tenantId=$TenantId"
  Assert-Equal $queueAfterCreate.StatusCode 200 "Queue snapshot after create status"
  Assert-True ($queueAfterCreate.Json.success -eq $true) "Queue snapshot after create success flag"
  $waitingA = $queueAfterCreate.Json.data | Where-Object { $_.track -eq "A" -and $_.status -eq "waiting" } | Select-Object -First 1
  $waitingB = $queueAfterCreate.Json.data | Where-Object { $_.track -eq "B" -and $_.status -eq "waiting" } | Select-Object -First 1
  $waitingC = $queueAfterCreate.Json.data | Where-Object { $_.track -eq "C" -and $_.status -eq "waiting" } | Select-Object -First 1
  Assert-Equal $waitingA.id $ticketAId "Waiting Track A ticket id"
  Assert-Equal $waitingA.position 1 "Waiting Track A position"
  Assert-Equal $waitingA.estimatedWaitMinutes 5 "Waiting Track A estimated wait"
  Assert-Equal $waitingB.id $ticketBId "Waiting Track B ticket id"
  Assert-Equal $waitingB.position 1 "Waiting Track B position"
  Assert-Equal $waitingB.estimatedWaitMinutes 7 "Waiting Track B estimated wait"
  Assert-Equal $waitingC.id $ticketCId "Waiting Track C ticket id"
  Assert-Equal $waitingC.position 1 "Waiting Track C position"
  Assert-Equal $waitingC.estimatedWaitMinutes 10 "Waiting Track C estimated wait"

  Write-Step "Call next logic"
  $adminCallNext = Invoke-CurlJson -Method "POST" -Path "/api/tickets/call-next" -Headers @{
    Authorization = "Bearer $adminToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $adminCallNext.StatusCode 200 "Admin call-next status"
  Assert-True ($adminCallNext.Json.success -eq $true) "Admin call-next success flag"
  Assert-Equal $adminCallNext.Json.data.id $ticketAId "Admin receives Track A ticket"
  Assert-Equal $adminCallNext.Json.data.track "A" "Admin receives track A"
  Assert-Equal $adminCallNext.Json.data.status "called" "Admin call-next status field"

  $agentCallNextB = Invoke-CurlJson -Method "POST" -Path "/api/tickets/call-next" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $agentCallNextB.StatusCode 200 "Agent call-next for Track B status"
  Assert-True ($agentCallNextB.Json.success -eq $true) "Agent call-next for Track B success flag"
  Assert-Equal $agentCallNextB.Json.data.id $ticketBId "Agent receives Track B before Track C"
  Assert-Equal $agentCallNextB.Json.data.track "B" "Agent receives track B"
  Assert-Equal $agentCallNextB.Json.data.status "called" "Agent call-next Track B status field"

  Write-Step "Complete current agent ticket"
  $agentComplete = Invoke-CurlJson -Method "POST" -Path "/api/tickets/complete" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $agentComplete.StatusCode 200 "Agent complete current status"
  Assert-True ($agentComplete.Json.success -eq $true) "Agent complete current success flag"
  Assert-Equal $agentComplete.Json.data.id $ticketBId "Agent completed Track B ticket"
  Assert-Equal $agentComplete.Json.data.track "B" "Completed ticket stays on track B"
  Assert-Equal $agentComplete.Json.data.status "completed" "Completed ticket status field"

  $agentCallNextC = Invoke-CurlJson -Method "POST" -Path "/api/tickets/call-next" -Headers @{
    Authorization = "Bearer $agentToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $agentCallNextC.StatusCode 200 "Agent call-next for Track C status"
  Assert-True ($agentCallNextC.Json.success -eq $true) "Agent call-next for Track C success flag"
  Assert-Equal $agentCallNextC.Json.data.id $ticketCId "Agent receives Track C after Track B"
  Assert-Equal $agentCallNextC.Json.data.track "C" "Agent receives track C"
  Assert-Equal $agentCallNextC.Json.data.status "called" "Agent call-next Track C status field"

  Write-Step "Additional error cases"
  $adminCallNextTwice = Invoke-CurlJson -Method "POST" -Path "/api/tickets/call-next" -Headers @{
    Authorization = "Bearer $adminToken"
  } -Body @{
    tenantId = $TenantId
  }
  Assert-Equal $adminCallNextTwice.StatusCode 400 "Admin second call-next without completion status"
  Assert-True ($adminCallNextTwice.Json.success -eq $false) "Admin second call-next without completion success flag"
  Assert-Equal $adminCallNextTwice.Json.message "This counter already has a current ticket" "Admin second call-next message"

  $missingCounter = Invoke-CurlJson -Method "POST" -Path "/api/counters/open" -Headers @{
    Authorization = "Bearer $adminToken"
  } -Body @{
    tenantId = $TenantId
    counterId = "counter-404"
  }
  Assert-Equal $missingCounter.StatusCode 404 "Missing counter open status"
  Assert-True ($missingCounter.Json.success -eq $false) "Missing counter open success flag"
  Assert-Equal $missingCounter.Json.message "Counter not found" "Missing counter open message"

  Write-Step "Final queue snapshot"
  $finalQueue = Invoke-CurlJson -Method "GET" -Path "/api/tickets?tenantId=$TenantId"
  Assert-Equal $finalQueue.StatusCode 200 "Final queue snapshot status"
  Assert-True ($finalQueue.Json.success -eq $true) "Final queue snapshot success flag"
  $finalTicketA = $finalQueue.Json.data | Where-Object { $_.id -eq $ticketAId } | Select-Object -First 1
  $finalTicketB = $finalQueue.Json.data | Where-Object { $_.id -eq $ticketBId } | Select-Object -First 1
  $finalTicketC = $finalQueue.Json.data | Where-Object { $_.id -eq $ticketCId } | Select-Object -First 1
  Assert-Equal $finalTicketA.status "called" "Final Track A status"
  Assert-Equal $finalTicketB.status "completed" "Final Track B status"
  Assert-Equal $finalTicketC.status "called" "Final Track C status"
  $remainingWaiting = ($finalQueue.Json.data | Where-Object { $_.status -eq "waiting" }).Count
  Assert-Equal $remainingWaiting 0 "Final waiting ticket count"

  Write-Host ""
  if ($failures.Count -eq 0) {
    Write-Host "All multi-track queue assertions passed." -ForegroundColor Green
    exit 0
  }

  Write-Host "Completed with $($failures.Count) failing assertion(s)." -ForegroundColor Yellow
  $failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  exit 1
} finally {
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
  }

  Restore-State
}
