@echo off
for %%i in ("%cd%") do set "dir=%%~ni"

if "%dir%"=="tidyscripts" (
    .\bin\tsnode.bat .\bin\repl.ts
) else (
    .\tsnode.bat repl.ts
)