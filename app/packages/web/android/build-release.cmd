@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
call gradlew.bat assembleRelease --console=plain > build-release.log 2>&1
echo EXITCODE=%ERRORLEVEL% >> build-release.log