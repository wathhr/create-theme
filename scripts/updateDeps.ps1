Push-Location;

$TemplatesFolder = Join-Path $PSScriptRoot "../templates";
$Folders = Get-ChildItem -LiteralPath $TemplatesFolder -Directory -Depth 1;

$PackageManager;
$PackageManagers = @(
  "bun",
  "yarn",
  "pnpm",
  "npm"
);

ForEach ($PM in $PackageManagers) {
  If (Get-Command $PM -errorAction SilentlyContinue) {
    $PackageManager = $PM;
    break;
  }
}

Write-Host "Updating root";
Set-Location (Join-Path $PSScriptRoot "..");
Invoke-Expression "$PackageManager update *";

ForEach ($Folder in $Folders) {
  Set-Location $Folder;
  If (Test-Path "package.json") {
    If ($null -eq (Select-String -Path "package.json" -Pattern "dependencies")) {
      continue;
    }
    Write-Host "Updating $Folder";
    Invoke-Expression "$PackageManager update *";
  }
}

Pop-Location;
