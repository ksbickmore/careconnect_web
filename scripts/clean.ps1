$ErrorActionPreference = 'Stop'

$workspaceRoot = [System.IO.Path]::GetFullPath(
    (Join-Path -Path $PSScriptRoot -ChildPath '..')
).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$workspacePrefix = $workspaceRoot + [System.IO.Path]::DirectorySeparatorChar

# Only disposable build, test, and tool outputs belong here. Dependencies,
# lockfiles, source assets, and review screenshots are intentionally preserved.
$generatedTargets = @(
    'dist',
    'coverage',
    '.vite',
    '.eslintcache',
    'tsconfig.tsbuildinfo',
    'vite.config.tsbuildinfo',
    'test-results',
    'playwright-report',
    'node_modules\.vite',
    'node_modules\.cache'
)

$removed = 0

foreach ($relativeTarget in $generatedTargets) {
    $targetPath = [System.IO.Path]::GetFullPath(
        (Join-Path -Path $workspaceRoot -ChildPath $relativeTarget)
    )

    if (-not $targetPath.StartsWith(
        $workspacePrefix,
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw "Refusing to remove a path outside the workspace: $targetPath"
    }

    if (Test-Path -LiteralPath $targetPath) {
        Remove-Item -LiteralPath $targetPath -Recurse -Force
        Write-Output "Removed $relativeTarget"
        $removed++
    }
}

if ($removed -eq 0) {
    Write-Output 'Already clean; no generated outputs were found.'
} else {
    Write-Output "Cleanup complete. Removed $removed generated target(s)."
}
