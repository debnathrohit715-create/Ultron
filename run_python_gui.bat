@echo off
title NOVA Python GUI Launcher
echo ==============================================================================
echo [NOVA] Launching Nova Work & Developer Desktop App...
echo ==============================================================================

cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" app_customtkinter.py
) else (
    python app_customtkinter.py
)
pause
