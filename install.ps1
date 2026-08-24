# Symlinks the shared Claude Code config from this repo into %USERPROFILE%\.claude.
# Symlinks need Developer Mode (Settings > System > For developers) or an admin
# PowerShell; without either, files are copied instead (re-run after each git pull).
# Safe to re-run; existing real files are backed up with a timestamp suffix.
$ErrorActionPreference = "Stop"

$RepoDir = $PSScriptRoot
$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null

function Install-Item([string]$Name) {
    $src = Join-Path $RepoDir $Name
    $dst = Join-Path $ClaudeDir $Name

    $existing = Get-Item $dst -ErrorAction SilentlyContinue
    if ($existing -and -not $existing.LinkType) {
        Move-Item $dst "$dst.backup.$Stamp"
        Write-Host "backed up: $dst -> $dst.backup.$Stamp"
    } elseif ($existing) {
        Remove-Item $dst -Force -Recurse
    }

    try {
        New-Item -ItemType SymbolicLink -Path $dst -Target $src | Out-Null
        Write-Host "linked:    $dst -> $src"
    } catch {
        Copy-Item $src $dst -Recurse -Force
        Write-Host "copied:    $src -> $dst (symlink not permitted; re-run after git pull)"
    }
}

Install-Item "settings.json"
Install-Item "CLAUDE.md"
Install-Item "hooks"

# Machine-specific settings (absolute paths etc.) live in settings.local.json,
# which is NOT tracked in the repo. Create it with the statusline config if missing.
$Local = Join-Path $ClaudeDir "settings.local.json"
if (-not (Test-Path $Local)) {
    $statusline = (Join-Path $ClaudeDir "hooks\statusline.js") -replace '\\', '\\'
    @"
{
  "statusLine": {
    "type": "command",
    "command": "node \"$statusline\""
  },
  "subagentStatusLine": {
    "type": "command",
    "command": "node \"$statusline\" subagent"
  }
}
"@ | Set-Content -Path $Local -Encoding UTF8
    Write-Host "created:   $Local"
} else {
    Write-Host "kept:      $Local (make sure it contains the statusLine config, see README)"
}

Write-Host "Done."
