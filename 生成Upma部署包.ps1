# 上码部署包：仅静态站文件；排除开发脚本与 Upma 会过滤的路径/文件名
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$zip = Join-Path $PSScriptRoot "upma-deploy-full.zip"
$tmpZip = Join-Path $env:TEMP "upma-git-archive.zip"
$tmpDir = Join-Path $env:TEMP "upma-deploy-extract"

if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }

git archive -o $tmpZip HEAD
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

# Upma 会跳过或无法使用的文件
$removePaths = @("firebase", ".git", ".vercel")
foreach ($name in $removePaths) {
    $p = Join-Path $tmpDir $name
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
Get-ChildItem $tmpDir -Recurse -Include "*.rules","*.bat","*.ps1" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $tmpDir -File -Filter "*firebase*" -ErrorAction SilentlyContinue | Remove-Item -Force

Compress-Archive -Path (Join-Path $tmpDir "*") -DestinationPath $zip -Force
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)
$hasConfig = ($z.Entries | Where-Object { $_.Name -eq "venus-config.js" }).Count -gt 0
$skipped = @("*.bat","*.ps1","firebase/","*firebase*.js(旧名)")
$z.Dispose()

Write-Host "已生成: $zip ($mb MB)"
Write-Host "venus-config.js 在包内: $hasConfig"
Write-Host "已排除（上码也会跳过）: $($skipped -join ', ')"
Write-Host "请上传后验证: https://token-ekyq.upma.site/venus-config.js"
