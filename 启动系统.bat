@echo off
chcp 65001 >nul
title ERPPlus 企业管理系统

echo.
echo  ████████╗██████╗ ██████╗     ██████╗ ██╗     ██╗   ██╗███████╗
echo  ██╔════╝██╔══██╗██╔══██╗    ██╔══██╗██║     ██║   ██║██╔════╝
echo  █████╗  ██████╔╝██████╔╝    ██████╔╝██║     ██║   ██║███████╗
echo  ██╔══╝  ██╔══██╗██╔═══╝     ██╔═══╝ ██║     ██║   ██║╚════██║
echo  ███████╗██║  ██║██║         ██║     ███████╗╚██████╔╝███████║
echo  ╚══════╝╚═╝  ╚═╝╚═╝         ╚═╝     ╚══════╝ ╚═════╝ ╚══════╝
echo.
echo  企业资源规划管理系统 v1.0
echo  ============================================
echo.

set NODE_PATH=C:\Users\lcl13\.workbuddy\binaries\node\versions\20.18.0.installing.5052.__extract_temp__\node-v20.18.0-win-x64
set PATH=%NODE_PATH%;%PATH%

echo [1/2] 启动后端服务 (端口 3001)...
start "ERPPlus-后端" cmd /k "set PATH=%NODE_PATH%;%PATH% && cd /d e:\ERPPlus\server && node src/index.js"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务 (端口 5173)...
start "ERPPlus-前端" cmd /k "set PATH=%NODE_PATH%;%PATH% && cd /d e:\ERPPlus\client && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ✅ 系统启动完成！
echo.
echo  访问地址: http://localhost:5173
echo  管理员账号: admin
echo  默认密码: Admin@123
echo.
echo  按任意键打开浏览器...
pause >nul
start http://localhost:5173
