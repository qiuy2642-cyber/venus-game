@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo [神秘占卜] 正在本文件夹启动网页服务...
echo 文件夹: %cd%
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo 未找到 Python。请先安装 Python 3 并勾选 "Add to PATH"。
    echo 下载: https://www.python.org/downloads/
    pause
    exit /b 1
)

set PORT=8080
netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo 端口 %PORT% 已被占用，改用 8765 ...
    set PORT=8765
)

echo 请在浏览器打开:
echo   http://127.0.0.1:%PORT%/
echo.
echo 在页面列表中点击「神秘占卜网页（5-16）.html」即可。
echo 若 CDN 超时，请先运行同目录「下载离线依赖.ps1」再刷新。
echo 不要关闭本窗口，关闭后网页会断线。
echo.

start "" "http://127.0.0.1:%PORT%/"

python -m http.server %PORT%

pause
