param(
  [Parameter(Mandatory)][string]$Candidate,
  [Parameter(Mandatory)][string]$Version
)

$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or !$env:RUNNER_TEMP) {
  throw 'This test installs ORBIT in a disposable GitHub Actions Windows account.'
}

function Get-InstalledVersion([string]$Path) {
  $info = [Diagnostics.FileVersionInfo]::GetVersionInfo($Path)
  return "$($info.FileMajorPart).$($info.FileMinorPart).$($info.FileBuildPart)"
}

function Assert-InstallerSucceeded($Process) {
  if (!$Process.WaitForExit(60000)) { throw 'The test installer did not finish.' }
  if ($Process.ExitCode -ne 0) { throw "The test installer failed with exit code $($Process.ExitCode)." }
}

$parent = (Resolve-Path -LiteralPath $env:RUNNER_TEMP).Path.TrimEnd('\')
$root = Join-Path $parent ('orbit-transition-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $root
$installed = Join-Path $root 'installed'
$program = Join-Path $installed 'orbit-desktop.exe'
$beforeSetup = $oldApp = $updateSetup = $newApp = $null
try {
  $repo = 'JoaquinDiazM/ORBIT'
  $baseline = 'v1.2.3'
  $assetName = 'orbit-windows-x64-setup.exe'
  $expectedDigest = gh release view $baseline --repo $repo --json assets --jq '.assets[] | select(.name == "orbit-windows-x64-setup.exe") | .digest'
  if ($LASTEXITCODE -ne 0 -or $expectedDigest -cnotmatch '^sha256:[a-f0-9]{64}$') { throw 'The baseline installer is missing its digest.' }
  gh release download $baseline --repo $repo --pattern $assetName --dir $root
  if ($LASTEXITCODE -ne 0) { throw 'Could not download the baseline installer.' }
  $before = Join-Path $root $assetName
  $actualDigest = (Get-FileHash -LiteralPath $before -Algorithm SHA256).Hash.ToLowerInvariant()
  if ("sha256:$actualDigest" -cne $expectedDigest) { throw 'The baseline installer digest does not match.' }

  $beforeSetup = Start-Process -FilePath $before -ArgumentList "/S /D=$installed" -WindowStyle Hidden -PassThru
  Assert-InstallerSucceeded $beforeSetup
  if ((Get-InstalledVersion $program) -ne '1.2.3') { throw 'The baseline application was not installed.' }

  $settings = Join-Path $env:APPDATA 'io.github.joaquindiazm.orbit'
  $serverFile = Join-Path $settings 'server-url'
  if (Test-Path -LiteralPath $serverFile) { throw 'The runner already has ORBIT settings.' }
  $null = New-Item -ItemType Directory -Path $settings -Force
  $demoServer = 'https://orbit-update-test.example/'
  Set-Content -LiteralPath $serverFile -Value $demoServer -NoNewline -Encoding utf8NoBOM

  $oldApp = Start-Process -FilePath $program -WindowStyle Hidden -PassThru
  $boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
  Start-Sleep -Milliseconds 500
  if ($oldApp.HasExited) { throw 'The baseline application did not remain running.' }
  $updateSetup = Start-Process -FilePath $Candidate -ArgumentList '/P /UPDATE /R' -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 3
  if ($updateSetup.HasExited) { throw 'The update stopped before the old process closed.' }
  if (!$oldApp.HasExited) {
    # Release only the ORBIT process that this test started in the runner.
    $oldApp.Kill()
    $oldApp.WaitForExit()
  }
  Assert-InstallerSucceeded $updateSetup

  $timer = [Diagnostics.Stopwatch]::StartNew()
  do {
    $newApp = Get-Process -Name 'orbit-desktop' -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -eq $program -and $_.Id -ne $oldApp.Id } | Select-Object -First 1
    if (!$newApp) { Start-Sleep -Milliseconds 250 }
  } until ($newApp -or $timer.ElapsedMilliseconds -ge 15000)
  if (!$newApp -or (Get-InstalledVersion $program) -ne $Version -or
      (Get-Content -LiteralPath $serverFile -Raw) -cne $demoServer -or
      (Get-CimInstance Win32_OperatingSystem).LastBootUpTime -ne $boot) {
    throw 'The updated application did not reopen with the expected version and settings.'
  }
  Write-Output "ORBIT upgraded from 1.2.3 to $Version, reopened and kept the saved server without rebooting Windows."
} finally {
  foreach ($process in @($oldApp, $newApp, $beforeSetup, $updateSetup)) {
    if ($process -and !$process.HasExited) { $process.Kill(); $process.WaitForExit() }
    if ($process) { $process.Dispose() }
  }
  $resolved = (Resolve-Path -LiteralPath $root).Path
  if ($resolved -eq $root -and (Split-Path -Parent $resolved) -eq $parent) {
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
