# 上码部署包：zip 内路径必须为 assets/xxx（正斜杠），不能用 Windows 反斜杠
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = Join-Path $PSScriptRoot "upma-deploy-full.zip"
$tmpZip = Join-Path $env:TEMP "upma-git-archive.zip"
$tmpDir = Join-Path $env:TEMP "upma-deploy-extract"

if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

git archive -o $tmpZip HEAD
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

$removePaths = @("firebase", ".git", ".vercel")
foreach ($name in $removePaths) {
    $p = Join-Path $tmpDir $name
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
Get-ChildItem $tmpDir -Recurse -Include "*.rules", "*.bat", "*.ps1" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $tmpDir -File -Filter "*firebase*" -ErrorAction SilentlyContinue | Remove-Item -Force

function Add-ZipWithForwardSlashes($zipPath, $sourceDir) {
    $sourceDir = (Resolve-Path $sourceDir).Path.TrimEnd('\')
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    $archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem $sourceDir -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($sourceDir.Length + 1).Replace("\", "/")
            if ($rel -match '^\.\./' -or $rel.StartsWith("/")) {
                throw "非法路径: $rel"
            }
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
        }
    } finally {
        $archive.Dispose()
    }
}

Add-ZipWithForwardSlashes $zip $tmpDir
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)
$sample = ($z.Entries | Select-Object -First 5 | ForEach-Object { $_.FullName }) -join ", "
$hasConfig = ($z.Entries | Where-Object { $_.FullName -eq "venus-config.js" }).Count -gt 0
$badSlash = ($z.Entries | Where-Object { $_.FullName -match '\\' }).Count
$z.Dispose()

Write-Host "已生成: $zip ($mb MB)"
Write-Host "示例路径: $sample"
Write-Host "venus-config.js: $hasConfig | 含反斜杠条目: $badSlash (应为 0)"
Write-Host "上码 → 更新项目 → 上传此 zip"
Write-Host "验证: https://token-ekyq.upma.site/venus-config.js"
