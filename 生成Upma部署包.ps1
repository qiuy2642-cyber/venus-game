# 从当前 git 提交生成 upma-deploy-full.zip（含 firebase/、admin.html）
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$zip = Join-Path $PSScriptRoot "upma-deploy-full.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
git archive -o $zip HEAD
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "已生成: $zip ($mb MB)"
Write-Host "上码项目: https://www.upma.cn/project/924ab3d3-cdc7-4e26-a6ac-1d13b1bbd17a"
Write-Host "上传后验证: https://token-ekyq.upma.site/firebase/firebase-config.js"
