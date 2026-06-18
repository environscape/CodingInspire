@echo off
chcp 65001 >nul
echo.
echo ================================
echo  Coding Inspire Website Server
echo ================================
echo.
echo 正在启动本地服务器...
echo 服务器地址: http://localhost:8000
echo.
echo 按 Ctrl+C 停止服务器
echo.

start "" "http://localhost:8000"
python -m http.server 8000