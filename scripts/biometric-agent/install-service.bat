@echo off
:: ============================================================================
:: Idea-Fueled Attendance Agent - Windows Service Installer (via NSSM)
:: Run this file as Administrator
:: ============================================================================

echo ========================================================
echo Installing Idea-Fueled Attendance Sync Service...
echo ========================================================

set SERVICE_NAME=IdeaFueled-AttendanceService
set AGENT_DIR=%~dp0
set AGENT_DIR=%AGENT_DIR:~0,-1%

echo Directory: %AGENT_DIR%

:: Check for nssm.exe in current folder or system path
set NSSM=nssm.exe
if exist "%AGENT_DIR%\nssm.exe" (
    set NSSM="%AGENT_DIR%\nssm.exe"
)

:: Stop and remove old service if exists
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm >nul 2>&1

:: Install service using powershell
%NSSM% install %SERVICE_NAME% "powershell.exe" "-ExecutionPolicy Bypass -NoProfile -File \"%AGENT_DIR%\agent.ps1\""
%NSSM% set %SERVICE_NAME% AppDirectory "%AGENT_DIR%"
%NSSM% set %SERVICE_NAME% DisplayName "Idea-Fueled Biometric Attendance Service"
%NSSM% set %SERVICE_NAME% Description "Pulls real-time biometric attendance from office eSSL machine (192.168.10.57) and pushes to Idea-Fueled HRMS Cloud."
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppStdout "%AGENT_DIR%\service.log"
%NSSM% set %SERVICE_NAME% AppStderr "%AGENT_DIR%\service-error.log"

:: Start the service
%NSSM% start %SERVICE_NAME%

echo.
echo ========================================================
echo Service installed and started successfully!
echo You can check status anytime in services.msc
echo ========================================================
pause
