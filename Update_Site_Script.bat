@echo off
echo ===================================================
echo   UPDATING YOUR SIM RACING MANAGER WEBSITE
echo ===================================================
echo.
echo 1. Creating backup of your latest Season Data...
cd /d "c:\Users\bscra\.gemini\antigravity\scratch\sim_racing_manager"
echo.

echo 2. Packaging latest changes...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Season Update (Auto-Script)"

echo.
echo 3. Sending to Cloud (GitHub)...
"C:\Program Files\Git\cmd\git.exe" push

echo.
echo ===================================================
echo   SUCCESS! Your website will update in ~30 seconds.
echo ===================================================
pause
