@echo off
REM Modifie ce chemin pour pointer vers ton dossier de musique
set MUSIC_DIR=C:\Users\%USERNAME%\Music
cd /d "%~dp0"
node server.js "%MUSIC_DIR%"
pause
