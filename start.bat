@echo off
title Discord Bot - KHOI DONG
chcp 65001 > nul
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
set "PATH=%APPDATA%\npm;%PATH%"

echo ===================================================
echo       DISCORD BOT - KHOI DONG VOI PM2
echo ===================================================

REM Dung bot cu neu dang chay
pm2 delete discord-bot 2>nul

REM Khoi dong bot voi PM2 (chay nen, khong bi tat khi dong cua so)
pm2 start ecosystem.config.js

REM Luu trang thai de tu dong khoi dong khi may tinh khoi dong lai
pm2 save

echo.
echo [OK] Bot da duoc khoi dong thanh cong!
echo [OK] Bot se tiep tuc chay ngay ca khi ban dong cua so nay.
echo.
echo --- CAC LENH QUAN LY ---
echo   pm2 status          - Xem trang thai bot
echo   pm2 logs            - Xem log bot
echo   pm2 restart discord-bot - Restart bot
echo   pm2 stop discord-bot    - Dung bot
echo.
pause
