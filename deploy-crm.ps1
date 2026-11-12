# deploy-crm.ps1
# Script de despliegue exclusivo para el CRM Frontend (crm.comgarza.com)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"
$RemoteDist = "/var/www/garza_crm_page/crm/dist"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Compilando y Desplegando CRM Frontend        " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Build local
Write-Host "`n[1/2] Compilando CRM (crm)..." -ForegroundColor Yellow
Push-Location crm
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Subir al VPS
Write-Host "`n[2/2] Subiendo crm/dist al VPS ($RemoteDist)..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p $RemoteDist && rm -rf $RemoteDist/*"
scp -r crm/dist/* "${ServerDest}:${RemoteDist}/"
ssh $ServerDest "chown -R www-data:www-data $RemoteDist && chmod -R 755 $RemoteDist"

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host " ¡CRM Frontend desplegado exitosamente!          " -ForegroundColor Green
Write-Host " Visita: https://crm.comgarza.com                " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
