param(
  [ValidateSet('install', 'update', 'uninstall')]
  $Type = "update"
)

$Word = $Type -eq "install" `
  ? "Installing" `
  : $Type -eq "update" `
  ? "Updating" `
  : "Uninstalling";

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

Push-Location;

$TemplatesFolder = Join-Path $PSScriptRoot "../templates";
$Folders = Get-ChildItem -LiteralPath $TemplatesFolder -Directory -Depth 1; # TODO: Filter this
If ($Type -ne "uninstall") {
  $Folders = ,(Join-Path $PSScriptRoot "..") + $Folders;
}

Try {
  ForEach ($Folder in $Folders) {
    Set-Location $Folder;
    Write-Host "$Word $Folder's packages";

    Switch ($Type) {
      "install" {
        Invoke-Expression "$PackageManager install";
      }
      "update" {
        Invoke-Expression "$PackageManager update *";
      }
      "uninstall" {
        Try {
          Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop;
        } Catch {
          Write-Host "Failed to remove node_modules";
        }
      }
    }
  }
} Finally {
  Pop-Location;
}
