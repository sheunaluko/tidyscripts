@echo off
cd packages\ts_common
npm run build
if errorlevel 1 exit /b 1

cd ..\ts_node
npm run build
if errorlevel 1 exit /b 1

cd ..\ts_web
npm run build
if errorlevel 1 exit /b 1

cd ..\ts_web_umd
npm run build
if errorlevel 1 exit /b 1

cd ..\..\apps\docs
npm run build
if errorlevel 1 exit /b 1

cd ..\ts_next_app
npm run build
if errorlevel 1 exit /b 1

echo Done