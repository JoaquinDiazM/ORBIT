param([Parameter(Mandatory)][string]$Makensis)

$ErrorActionPreference = 'Stop'
$compiler = (Resolve-Path -LiteralPath $Makensis).Path
$hook = (Resolve-Path -LiteralPath "$PSScriptRoot/../src-tauri/windows/update-hooks.nsh").Path
$parent = (Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).Path.TrimEnd('\')
$root = Join-Path $parent ('orbit-update-hook-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $root
$root = (Resolve-Path -LiteralPath $root).Path
if ((Split-Path -Parent $root) -ne $parent -or (Split-Path -Leaf $root) -notmatch '^orbit-update-hook-[a-f0-9]{32}$') {
  throw 'Unexpected temporary directory.'
}

try {
  $installed = Join-Path $root 'installed'
  $null = New-Item -ItemType Directory -Path $installed
  $program = Join-Path $installed 'orbit-test.exe'
  $ready = Join-Path $root 'process-ready.txt'
  $marker = Join-Path $root 'installer-passed.txt'
  $probe = Join-Path $root 'probe.exe'
  $source = Join-Path $root 'holder.cs'
  @'
using System;
using System.IO;
using System.Threading;

class FileHolder {
    static void Main(string[] args) {
        File.WriteAllText(args[0], "ready");
        Thread.Sleep(Int32.Parse(args[1]));
    }
}
'@ | Set-Content -LiteralPath $source -Encoding utf8NoBOM
  & "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe" /nologo "/out:$program" $source
  if ($LASTEXITCODE -ne 0) { throw 'Failed to build the test executable.' }

  $script = Join-Path $root 'probe.nsi'
  @'
Unicode true
Name "ORBIT update hook test"
OutFile "${PROBE}"
InstallDir "${INSTALLED}"
RequestExecutionLevel user
SilentInstall silent
!include "LogicLib.nsh"
!include "Win\RestartManager.nsh"
!include "${HOOK}"
LoadLanguageFile "${NSISDIR}\Contrib\Language files\English.nlf"
LoadLanguageFile "${NSISDIR}\Contrib\Language files\Spanish.nlf"
!define MAINBINARYNAME "orbit-test"
Var UpdateMode
Section
  StrCpy $UpdateMode 1
  !insertmacro NSIS_HOOK_PREINSTALL
  FileOpen $0 "${MARKER}" w
  FileWrite $0 "passed"
  FileClose $0
SectionEnd
'@ | Set-Content -LiteralPath $script -Encoding utf8NoBOM
  & $compiler -INPUTCHARSET UTF8 -V2 "-DPROBE=$probe" "-DINSTALLED=$installed" "-DHOOK=$hook" "-DMARKER=$marker" $script
  if ($LASTEXITCODE -ne 0) { throw 'Failed to compile the NSIS hook.' }

  function Invoke-Probe([int]$ExpectedExit, [bool]$ExpectedMarker) {
    if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker }
    $process = Start-Process -FilePath $probe -WindowStyle Hidden -PassThru
    try {
      if (!$process.WaitForExit(55000)) { throw 'The installer probe timed out.' }
      if ($process.ExitCode -ne $ExpectedExit -or (Test-Path -LiteralPath $marker) -ne $ExpectedMarker) {
        throw "Unexpected installer result: $($process.ExitCode), expected $ExpectedExit."
      }
    } finally {
      if (!$process.HasExited) { $process.Kill(); $process.WaitForExit() }
      $process.Dispose()
    }
  }

  function Invoke-WhileRunning([int]$Milliseconds, [int]$ExpectedExit, [bool]$ExpectedMarker) {
    if (Test-Path -LiteralPath $ready) { Remove-Item -LiteralPath $ready }
    $start = [Diagnostics.ProcessStartInfo]::new($program)
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.ArgumentList.Add($ready)
    $start.ArgumentList.Add([string]$Milliseconds)
    $holder = [Diagnostics.Process]::Start($start)
    try {
      $deadline = [Diagnostics.Stopwatch]::StartNew()
      while (!(Test-Path -LiteralPath $ready) -and !$holder.HasExited -and $deadline.ElapsedMilliseconds -lt 5000) {
        Start-Sleep -Milliseconds 25
      }
      if (!(Test-Path -LiteralPath $ready) -or $holder.HasExited) { throw 'The test process failed to start.' }
      Invoke-Probe $ExpectedExit $ExpectedMarker
      if ($ExpectedExit -eq 0 -and !$holder.HasExited) { throw 'The installer continued while the executable was in use.' }
      if ($ExpectedExit -ne 0 -and $holder.HasExited) { throw 'The installer probe stopped the running process.' }
    } finally {
      if (!$holder.HasExited) { $holder.Kill(); $holder.WaitForExit() }
      $holder.Dispose()
    }
  }

  Invoke-Probe 0 $true
  Invoke-WhileRunning 4000 0 $true
  Invoke-WhileRunning 60000 1 $false
  Invoke-Probe 0 $true
  Write-Output 'Windows update hook: immediate close, delayed close, persistent lock and retry passed.'
} finally {
  if ((Resolve-Path -LiteralPath $root).Path -eq $root -and (Split-Path -Parent $root) -eq $parent) {
    Remove-Item -LiteralPath $root -Recurse -Force
  }
}
