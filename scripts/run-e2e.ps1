$ErrorActionPreference = "Stop"

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:E2E_SHELL_TEST = "1"
$env:E2E_BASE_URL = "http://127.0.0.1:3100"
$nodePath = (Get-Command node).Source
$serverArguments = @(
  "node_modules/next/dist/bin/next",
  "start",
  "--hostname", "127.0.0.1",
  "--port", "3100"
)
$server = Start-Process -FilePath $nodePath -ArgumentList $serverArguments -PassThru -WindowStyle Hidden

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $env:E2E_BASE_URL -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 250
    }
  }

  if (-not $ready) { throw "The E2E server did not become ready." }
  npx playwright test
  $testExitCode = $LASTEXITCODE
} finally {
  if (-not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
    $server.WaitForExit()
  }
}

exit $testExitCode

