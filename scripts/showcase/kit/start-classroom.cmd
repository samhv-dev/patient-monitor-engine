@echo off
rem Start Classroom (Windows) - double-click this file in File Explorer. UNTESTED ON WINDOWS at this release: the
rem owner's checklist is in "READ ME FIRST.txt", section WINDOWS.
rem It starts the simulator's classroom relay on this computer's network address: the simulator opens in the default
rem browser, and learners' phones on the same Wi-Fi (or this PC's Mobile hotspot) follow the case. It needs Node.js 22
rem or later (nodejs.org, the LTS). The steps are in server\launch.mjs (the same as "Start Classroom.command" on a Mac);
rem this file only finds Node.js. It writes nothing into its own folder.
rem Knobs for the kit's own tests (a presenter never needs them), set without quotes:
rem   PME_NO_OPEN=1   do not open the browser
rem   PME_PORT=8650   first port to try (the next 9 are tried if it is busy)
rem   PME_NODE=path   use only this node.exe (the Node 22 check's own test)
setlocal EnableExtensions DisableDelayedExpansion
title Patient monitor simulator - Classroom

rem Started from inside the .zip, Explorer extracted this file alone: say so (launch.mjs is not there to say it)
if not exist "%~dp0server\launch.mjs" goto nokit
set "NODE="
if defined PME_NODE set "NODE=%PME_NODE%"
if not defined NODE for /f "delims=" %%n in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%n"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE goto nonode
if not exist "%NODE%" goto nonode
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" >nul 2>&1
rem not "if errorlevel 1": a node.exe that crashes on start exits with a negative code
if not "%ERRORLEVEL%"=="0" goto oldnode

"%NODE%" "%~dp0server\launch.mjs" classroom
set "RC=%ERRORLEVEL%"
echo.
pause
exit /b %RC%

:nokit
echo.
echo   This file was started from inside the .zip. Right-click the .zip, choose "Extract All",
echo   then double-click "Start Classroom" in the extracted folder.
echo.
pause
exit /b 1

:nonode
echo.
echo   ======================================================================
echo   THE CLASSROOM COULD NOT START
echo   Classroom mode needs Node.js 22 or later, and this computer has none.
echo   ======================================================================
goto getnode

:oldnode
echo.
echo   ======================================================================
echo   THE CLASSROOM COULD NOT START
echo   Classroom mode needs Node.js 22 or later; this computer has an older one:
echo   ======================================================================
echo.
"%NODE%" -v
echo   (at "%NODE%")

:getnode
echo.
echo   Install Node.js from nodejs.org: the LTS, version 22 or later, the "Windows Installer (.msi)"
echo   (fnm or nvm users: install the .msi too; a double-click does not see a terminal-only Node.js).
echo   Then double-click "Start Classroom" again.
echo.
echo   Nothing on this computer has been changed.
echo.
pause
exit /b 1
