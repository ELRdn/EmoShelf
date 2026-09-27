param(
  [Parameter(Mandatory)][string]$Installer,
  [Parameter(Mandatory)][string]$InstallRoot,
  # Launch the installed app and require the rendered shelf page instead of WebDriver E2E.
  [switch]$LaunchCheck
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
  if ($LaunchCheck) {
    # Requires the WebView2 debug-port policy set by the workflow; the port is read from its user data.
    $portFile = Join-Path $env:LOCALAPPDATA 'com.emoshelf.app\EBWebView\DevToolsActivePort'
    $app = Start-Process -FilePath $appBinary -PassThru
    $deadline = (Get-Date).AddSeconds(60)
    $rendered = $false
    while (-not $rendered -and (Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 1
      if ($app.HasExited) { throw 'Installed application exited during launch check.' }
      if (-not (Test-Path -LiteralPath $portFile)) { continue }
      $port = (Get-Content -LiteralPath $portFile -TotalCount 1).Trim()
      $pages = try { Invoke-RestMethod "http://127.0.0.1:$port/json/list" -TimeoutSec 5 } catch { @() }
      $rendered = [bool]($pages | Where-Object { $_.type -eq 'page' -and $_.url -like 'http://tauri.localhost/*' -and $_.title -eq 'EmoShelf' })
    }
    if (-not $rendered) { throw 'Installed application did not render the shelf page.' }
    Write-Output 'Installed application launched and rendered the shelf page.'
  } else {
    $env:EMOSHELF_E2E_BINARY = $appBinary
    $env:EMOSHELF_E2E_SKIP_BUILD = '1'
    pnpm test:e2e
    if ($LASTEXITCODE -ne 0) { throw 'Installed application E2E failed.' }
  }
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
Write-Output "Unsigned installer, installed $(if ($LaunchCheck) { 'launch check' } else { 'E2E' }), and uninstall passed."
