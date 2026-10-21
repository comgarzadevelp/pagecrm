# deploy-crm.ps1
# Despliegue EXCLUSIVO para el CRM (crm.comgarza.com)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Desplegando GARZA CRM                     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compilar
Write-Host "`n[1/2] Compilando crm..." -ForegroundColor Yellow
Push-Location crm
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Subir al VPS
Write-Host "`n[2/2] Subiendo crm/dist al VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p /var/www/garza_crm_page/crm/dist && rm -rf /var/www/garza_crm_page/crm/dist/*"
scp -r crm/dist/* "${ServerDest}:/var/www/garza_crm_page/crm/dist/"
ssh $ServerDest "chown -R www-data:www-data /var/www/garza_crm_page/crm && chmod -R 755 /var/www/garza_crm_page/crm"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡CRM actualizado con éxito!                 " -ForegroundColor Green
Write-Host " URL: https://crm.comgarza.com               " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
