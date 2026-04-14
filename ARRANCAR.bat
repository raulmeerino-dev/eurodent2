@echo off
title Eurodent 2.0 Copia — Arrancando...
color 0A
cls

echo ============================================
echo   EURODENT 2.0 COPIA — Arranque aislado
echo ============================================
echo.

:: 1. Base de datos (Docker)
echo [1/3] Levantando base de datos aislada...
cd /d "%~dp0"
docker compose up -d postgres >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Docker no esta corriendo. Abre Docker Desktop primero.
    pause
    exit /b 1
)
echo   OK — PostgreSQL arrancado.
echo.

:: Esperar a que la BD este lista
echo   Esperando a que la BD este lista...
timeout /t 3 /nobreak >nul

:: 2. Backend
echo [2/3] Arrancando backend (API)...
start "Eurodent Copia Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload"
timeout /t 3 /nobreak >nul
echo   OK — Backend en http://localhost:8010
echo.

:: 3. Frontend
echo [3/3] Arrancando frontend...
start "Eurodent Copia Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak >nul
echo   OK — Frontend en http://localhost:5183
echo.

:: 4. Abrir navegador
echo Abriendo navegador...
start "" "http://localhost:5183"

echo.
echo ============================================
echo   Copia arrancada correctamente.
echo   Todo queda aislado del eurodent2 original.
echo   Puedes cerrar esta ventana.
echo ============================================
echo.
pause
