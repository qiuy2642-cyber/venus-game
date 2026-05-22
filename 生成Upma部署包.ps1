# 上码部署包：根目录 Firebase .js，不含 firebase/ 子目录与 .rules
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

$firebaseDir = Join-Path $tmpDir "firebase"
if (Test-Path $firebaseDir) { Remove-Item $firebaseDir -Recurse -Force }
Get-ChildItem $tmpDir -Recurse -Filter "*.rules" -ErrorAction SilentlyContinue | Remove-Item -Force

Compress-Archive -Path (Join-Path $tmpDir "*") -DestinationPath $zip -Force
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)
$has = ($z.Entries | Where-Object { $_.Name -eq "venus-firebase-config.js" }).Count -gt 0
$noFb = ($z.Entries | Where-Object { $_.FullName -like "firebase/*" }).Count -eq 0
$z.Dispose()

Write-Host "已生成: $zip ($mb MB)"
Write-Host "venus-firebase-config.js 在包内: $has"
Write-Host "无 firebase/ 子目录: $noFb"
Write-Host "上码 → 页面 → 更新项目 → 上传此 zip"
Write-Host "主页请设为 index.html"
Write-Host "验证: https://token-ekyq.upma.site/venus-firebase-config.js"
