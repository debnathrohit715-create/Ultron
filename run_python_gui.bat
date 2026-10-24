@echo off
title JARVIS Python GUI Launcher
echo ==============================================================================
echo [STARK INDUSTRIES] Launching JARVIS CustomTkinter Pure Python Desktop App...
echo ==============================================================================

cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" app_customtkinter.py
) else (
    python app_customtkinter.py
)
pause
