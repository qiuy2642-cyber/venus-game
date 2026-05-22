# 上码部署包：正斜杠路径 + 仅含上码支持的文件类型
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$AllowedExt = @{
    ".html"=1; ".htm"=1; ".js"=1; ".css"=1; ".json"=1
    ".png"=1; ".jpg"=1; ".jpeg"=1; ".gif"=1; ".webp"=1; ".svg"=1; ".ico"=1
    ".wav"=1; ".mp3"=1; ".woff"=1; ".woff2"=1; ".ttf"=1; ".wasm"=1
}

function Test-UpmaInclude([string]$relPath) {
    $name = Split-Path $relPath -Leaf
    if ($name.StartsWith(".")) { return $false }
    if ($relPath -match '\\') { return $false }
    if ($relPath -match '^\.\./|^/') { return $false }
    if ($relPath -like "firebase/*") { return $false }
    if ($name -match "firebase") { return $false }
    $ext = [System.IO.Path]::GetExtension($name).ToLowerInvariant()
    return $AllowedExt.ContainsKey($ext)
}

$zip = Join-Path $PSScriptRoot "upma-deploy-full.zip"
$tmpZip = Join-Path $env:TEMP "upma-git-archive.zip"
$tmpDir = Join-Path $env:TEMP "upma-deploy-extract"

if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

git archive -o $tmpZip HEAD
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

foreach ($name in @("firebase", ".git", ".vercel")) {
    $p = Join-Path $tmpDir $name
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

Get-ChildItem $tmpDir -Recurse -Filter "*.html" -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $len = $bytes.Length - 3
        $out = New-Object byte[] $len
        [Array]::Copy($bytes, 3, $out, 0, $len)
        [System.IO.File]::WriteAllBytes($_.FullName, $out)
    }
}

$sourceDir = (Resolve-Path $tmpDir).Path.TrimEnd('\')
$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
$skipped = @()
try {
    Get-ChildItem $sourceDir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($sourceDir.Length + 1).Replace("\", "/")
        if (-not (Test-UpmaInclude $rel)) {
            $skipped += $rel
            return
        }
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
        $count++
    }
} finally {
    $archive.Dispose()
}

Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "OK: $zip  ${mb}MB  files=$count"
if ($skipped.Count -gt 0) {
    Write-Host "Skipped:" ($skipped | Select-Object -First 8 | ForEach-Object { $_ }) -Separator ", "
}
Write-Host "Check: https://token-ekyq.upma.site/venus-config.js"
