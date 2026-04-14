@echo off
title Eurodent 2.0 Copia — Parando...
color 0C
cls

echo ============================================
echo   EURODENT 2.0 COPIA — Parada aislada
echo ============================================
echo.

echo Cerrando backend y frontend...
taskkill /FI "WINDOWTITLE eq Eurodent Copia Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Eurodent Copia Frontend*" /F >nul 2>&1

echo Parando base de datos...
cd /d "%~dp0"
docker compose stop postgres >nul 2>&1

echo.
echo   Copia parada correctamente.
echo.
pause
