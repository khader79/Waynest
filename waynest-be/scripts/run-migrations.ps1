<#
Runs TypeORM migrations using the project's npm script.

Usage (PowerShell):
  ./scripts/run-migrations.ps1

Ensure the required DB environment variables are set in the environment before running.
This script does not embed credentials.
#>
Write-Host "Running TypeORM migrations (npm run migration:run)..."
npm run migration:run
