# Runs the IFMP Retail static server as a background service, with logging and
# supervision.
#
# Why this exists instead of running node directly from the task:
#
# 1. Task Scheduler discards a process's stdout, so a crash leaves no trace.
#    Everything is appended to a log outside the repository instead.
# 2. Task Scheduler's restart-on-failure proved unreliable for this case. It was
#    configured, and then tested by killing the server: the task ended in the
#    Ready state with result 0xC000013A and was never restarted, leaving the
#    public URL dead. The loop below is therefore the real recovery mechanism.
#    It is also faster, because Task Scheduler's minimum restart interval is a
#    full minute.
#
# It is invoked by the "IFMP Flow Server" scheduled task at logon. Run it by
# hand the same way, or use the task:
#
#   Start-ScheduledTask -TaskName 'IFMP Flow Server'
#
# Every path is resolved to an absolute path on purpose. Task Scheduler runs with
# a working directory of System32, so a relative path to the script or to dist
# would resolve somewhere else and the server would fail to find its files.
#
# The log lives under %LOCALAPPDATA% so it can never dirty the working tree or be
# committed by accident.

[CmdletBinding()]
param(
  # Repository root. Empty means "this script's parent directory", resolved in
  # the body. It cannot be computed here: Windows PowerShell 5.1 has not yet
  # populated $PSScriptRoot while parameter defaults are being evaluated, and
  # Split-Path would receive an empty string.
  [string]$RepoRoot = '',

  # Log directory. Empty means %LOCALAPPDATA%\ifmp-flow, outside the repository.
  [string]$LogDir = '',

  [int]$Port = 4174,

  # Not named $Host, which is a read-only automatic variable in PowerShell and
  # would be silently ignored as a parameter name.
  [string]$BindHost = '127.0.0.1',

  # Absolute path to Node. A scheduled task may not have the same PATH the
  # interactive shell has, so this is not resolved through PATH by default.
  [string]$NodePath = 'C:\Program Files\nodejs\node.exe'
)

$ErrorActionPreference = 'Stop'

# The script's own directory, by two routes. $PSScriptRoot is the normal one;
# $PSCommandPath covers the case where it is unset, which is why this is not done
# in the parameter block above.
if (-not $RepoRoot) {
  $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $PSCommandPath }
  $RepoRoot = Split-Path -Parent $scriptDir
}

if (-not $LogDir) {
  $LogDir = Join-Path $env:LOCALAPPDATA 'ifmp-flow'
}

# The log directory is created before anything can fail, so that a fatal
# configuration error still has somewhere to be written. A silent failure is the
# exact problem this script exists to prevent.
if (-not (Test-Path -LiteralPath $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$log = Join-Path $LogDir 'serve-flow.log'

function Write-Log {
  param([string]$Message)
  $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ssK')
  Add-Content -LiteralPath $log -Encoding utf8 -Value "[$stamp] $Message"
}

# Decode the child process's stdout as UTF-8. Without this, PowerShell decodes it
# with the console's OEM codepage and the repository path (which contains
# non-ASCII characters) is written to the log as mojibake. Guarded because
# [Console]::OutputEncoding throws when there is no attached console, which
# happens if the task is ever run as a non-interactive session.
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
  Write-Log "could not set console encoding to UTF-8: $($_.Exception.Message)"
}

function Assert-Path {
  param([string]$Path, [string]$What)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$What not found: $Path"
  }
}

try {
  Assert-Path -Path $NodePath -What 'Node executable'

  $script = Join-Path $RepoRoot 'scripts\serve-flow.mjs'
  Assert-Path -Path $script -What 'Server script'

  $dist = Join-Path $RepoRoot 'apps\web\dist'
  Assert-Path -Path $dist -What 'Build output directory'

  # serve-flow.mjs refuses to start without this. Failing here gives a clearer
  # message than letting it exit and be retried by the loop below.
  Assert-Path -Path (Join-Path $dist 'index.html') -What 'Built index.html (run: cd apps/web; npm run build)'

  Write-Log "supervisor started: node=$NodePath script=$script dist=$dist port=$Port host=$BindHost"

  # Supervision loop.
  #
  # A run that lasted at least a minute counts as healthy, and the backoff
  # resets. That matters for a server left up for hours: after a genuine crash it
  # comes back in seconds rather than waiting out an escalated delay. The backoff
  # only grows for a process that keeps dying immediately, which is what a fast
  # retry loop would otherwise turn into an unreadable log.
  $attempt = 0
  while ($true) {
    $attempt++
    $started = Get-Date
    Write-Log "starting (attempt $attempt): $NodePath $script --dir $dist --port $Port --host $BindHost"

    # Merges stdout and stderr into the log, and blocks until the server exits.
    #
    # This is a pipeline into Add-Content rather than the shorter `*>> $log`
    # because Windows PowerShell 5.1 writes redirected output as UTF-16. That puts
    # a null byte between every character, which renders as "I F M P" in an editor
    # and garbles any non-ASCII path. Add-Content -Encoding utf8 writes UTF-8.
    #
    # ErrorActionPreference is relaxed for the call. With `Stop`, a redirected
    # native stderr line arrives as an ErrorRecord and terminates the supervisor,
    # so a single warning from the server would end supervision permanently. That
    # was observed: the child's stderr produced "FATAL" and no retry followed.
    # Restoring it afterwards keeps every other failure loud.
    $ErrorActionPreference = 'Continue'
    & $NodePath $script --dir $dist --port $Port --host $BindHost 2>&1 |
      ForEach-Object { Add-Content -LiteralPath $log -Encoding utf8 -Value ([string]$_) }
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $ranFor = [int]((New-TimeSpan -Start $started -End (Get-Date)).TotalSeconds)

    if ($ranFor -ge 60) {
      $attempt = 0
      $delay = 3
      Write-Log "exited with code $code after ${ranFor}s (healthy run, backoff reset)"
    } else {
      # Capped at 5 doublings before the 30s ceiling, so the exponent cannot
      # overflow an Int32 on a long outage.
      $delay = [int][Math]::Min(30, [Math]::Pow(2, [Math]::Min($attempt, 5)))
      Write-Log "exited with code $code after ${ranFor}s"
    }

    Write-Log "restarting in ${delay}s"
    Start-Sleep -Seconds $delay
  }
} catch {
  Write-Log "FATAL: $($_.Exception.Message)"
  throw
}
