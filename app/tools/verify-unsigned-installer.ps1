param(
  [Parameter(Mandatory)][string]$Installer,
  [Parameter(Mandatory)][string]$InstallRoot
)
$ErrorActionPreference = 'Stop'
# Production identifiers are safe only on a disposable CI runner.
if ($env:CI -ne 'true' -or -not $env:RUNNER_TEMP) {
  throw 'Run installer qualification on a disposable CI runner only.'
}
$Installer = (Resolve-Path -LiteralPath $Installer).Path
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$runnerRoot = [IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\') + '\'
if (-not $InstallRoot.StartsWith($runnerRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Installation must remain inside RUNNER_TEMP.'
}
if (Test-Path -LiteralPath $InstallRoot) { throw 'Use a fresh install directory.' }
if ((Get-AuthenticodeSignature -LiteralPath $Installer).Status -ne 'NotSigned') {
  throw 'Expected an explicitly unsigned installer.'
}
$msi = [IO.Path]::GetExtension($Installer) -eq '.msi'
if (-not $msi -and [IO.Path]::GetExtension($Installer) -ne '.exe') { throw 'Unsupported installer.' }
$appBinary = $null
Push-Location -LiteralPath (Join-Path $PSScriptRoot '..')
try {
  if ($msi) {
    $install = Start-Process msiexec.exe -ArgumentList "/i `"$Installer`" INSTALLDIR=`"$InstallRoot`" /qn /norestart" -WindowStyle Hidden -PassThru -Wait
  } else {
    $install = Start-Process -FilePath $Installer -ArgumentList '/S', "/D=$InstallRoot" -WindowStyle Hidden -PassThru -Wait
  }
  if ($install.ExitCode -ne 0) { throw "Install failed: $($install.ExitCode)" }
  $executables = @(Get-ChildItem -LiteralPath $InstallRoot -Recurse -Filter emoshelf.exe)
  if ($executables.Count -ne 1) { throw 'Expected exactly one installed application.' }
  $appBinary = $executables[0].FullName
  if ((Get-AuthenticodeSignature -LiteralPath $appBinary).Status -ne 'NotSigned') {
    throw 'Unexpected installed application signature status.'
  }
  $env:EMOSHELF_E2E_BINARY = $appBinary
  $env:EMOSHELF_E2E_SKIP_BUILD = '1'
  pnpm test:e2e
  if ($LASTEXITCODE -ne 0) { throw 'Installed application E2E failed.' }
} finally {
  if ($appBinary) {
    Get-Process -Name emoshelf -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -eq $appBinary } | Stop-Process -Force
  }
  if ($msi) {
    $uninstall = Start-Process msiexec.exe -ArgumentList "/x `"$Installer`" /qn /norestart" -WindowStyle Hidden -PassThru -Wait
  } elseif (Test-Path -LiteralPath (Join-Path $InstallRoot 'uninstall.exe')) {
    $uninstall = Start-Process -FilePath (Join-Path $InstallRoot 'uninstall.exe') -ArgumentList '/S' -WindowStyle Hidden -PassThru -Wait
  }
  Pop-Location
  if ($uninstall -and $uninstall.ExitCode -notin @(0, 1605)) { throw "Uninstall failed: $($uninstall.ExitCode)" }
}
if ($appBinary -and (Test-Path -LiteralPath $appBinary)) { throw 'Application remained after uninstall.' }
Write-Output 'Unsigned installer, installed E2E, and uninstall passed.'
