<#
PowerShell runner for delete-flow psql scripts.
Requires environment variables: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
Usage (PowerShell):
$env:PGHOST='host'; $env:PGUSER='user'; $env:PGPASSWORD='pw'; .\run_delete_flow_tests.ps1
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

$scripts = @(
  'provider_cascade.sql',
  'place_cascade.sql',
  'review_set_null.sql'
)

function Run-SqlScript($file) {
  Write-Host "\n==== Running: $file ====" -ForegroundColor Cyan
  $psqlArgs = @()
  if ($env:PGHOST) { $psqlArgs += "-h"; $psqlArgs += $env:PGHOST }
  if ($env:PGPORT) { $psqlArgs += "-p"; $psqlArgs += $env:PGPORT }
  if ($env:PGUSER) { $psqlArgs += "-U"; $psqlArgs += $env:PGUSER }
  if ($env:PGDATABASE) { $targetDb = $env:PGDATABASE } else { Write-Error 'PGDATABASE not set'; return }

  $psqlArgs += "-f"; $psqlArgs += $file

  # Use psql in the PATH. PGPASSWORD env var will be used by psql for password auth.
  & psql @psqlArgs $targetDb
  if ($LASTEXITCODE -ne 0) {
    Write-Error "psql returned exit code $LASTEXITCODE for $file"
    exit $LASTEXITCODE
  }
}

foreach ($s in $scripts) {
  if (-Not (Test-Path $s)) { Write-Warning "$s not found, skipping"; continue }
  Run-SqlScript $s
}

Write-Host "\nAll scripts completed." -ForegroundColor Green
