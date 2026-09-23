@echo off
title Discord Bot - LOG
chcp 65001 > nul
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "PATH=%APPDATA%\npm;%PATH%"
echo ===================================================
echo       DISCORD BOT - XEM LOG TRUC TIEP
echo ===================================================
echo (Nhan Ctrl+C de thoat xem log, bot van chay binh thuong)
echo.
pm2 logs discord-bot
