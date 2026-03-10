@echo off
setlocal
if "%~1"=="" (
  echo Usage: apply_hitbox_config.bat ^<hitbox_config.json^>
  exit /b 1
)
set "CONFIG=%~f1"
cd /d "%~dp0"
python apply_hitbox_config.py "%CONFIG%"

