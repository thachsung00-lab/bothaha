@echo off
title Discord Bot - DUNG
chcp 65001 > nul
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "PATH=%APPDATA%\npm;%PATH%"
echo ===================================================
echo       DISCORD BOT - DUNG BOT
echo ===================================================
pm2 stop discord-bot
pm2 delete discord-bot
echo.
echo [OK] Bot da duoc dung hoan toan.
pause
