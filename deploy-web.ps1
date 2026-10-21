# deploy-web.ps1
# Despliegue EXCLUSIVO para la Página Comercial (comgarza.com)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Desplegando PAGINA WEB COMERCIAL          " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compilar
Write-Host "`n[1/2] Compilando frontend_page..." -ForegroundColor Yellow
Push-Location frontend_page
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Subir al VPS
Write-Host "`n[2/2] Subiendo frontend_page/dist al VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p /var/www/garza_crm_page/frontend_page/dist && rm -rf /var/www/garza_crm_page/frontend_page/dist/*"
scp -r frontend_page/dist/* "${ServerDest}:/var/www/garza_crm_page/frontend_page/dist/"
ssh $ServerDest "chown -R www-data:www-data /var/www/garza_crm_page/frontend_page && chmod -R 755 /var/www/garza_crm_page/frontend_page"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Página web actualizada con éxito!          " -ForegroundColor Green
Write-Host " URL: https://comgarza.com                   " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
