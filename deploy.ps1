# deploy.ps1
# Script de despliegue automatizado para Garza CRM & Garza Page (Zero-Downtime)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Iniciando despliegue de Garza CRM & Web   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compilar y subir Página Comercial (frontend_page -> comgarza.com)
Write-Host "`n[1/4] Compilando Frontend Comercial (frontend_page)..." -ForegroundColor Yellow
Push-Location frontend_page
try {
    npm run build
} finally {
    Pop-Location
}

Write-Host "   Subiendo frontend_page/dist al VPS..." -ForegroundColor Yellow
ssh $ServerDest "rm -rf /var/www/garza_crm_page/frontend_page/dist/*"
scp -r frontend_page/dist/* "${ServerDest}:/var/www/garza_crm_page/frontend_page/dist/"

# 2. Compilar y subir CRM (crm -> crm.comgarza.com)
Write-Host "`n[2/4] Compilando CRM (crm)..." -ForegroundColor Yellow
Push-Location crm
try {
    npm run build
} finally {
    Pop-Location
}

Write-Host "   Subiendo crm/dist al VPS..." -ForegroundColor Yellow
ssh $ServerDest "rm -rf /var/www/garza_crm_page/crm/dist/*"
scp -r crm/dist/* "${ServerDest}:/var/www/garza_crm_page/crm/dist/"

# 3. Desplegar Backend al VPS
Write-Host "`n[3/4] Subiendo Backend al VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p /var/www/garza_crm_page/backend"
scp -r backend/config backend/controllers backend/middleware backend/migrations backend/public backend/routes backend/scripts backend/services backend/utils "${ServerDest}:/var/www/garza_crm_page/backend/"
scp backend/server.js backend/supabaseClient.js backend/ecosystem.config.cjs backend/package.json backend/package-lock.json "${ServerDest}:/var/www/garza_crm_page/backend/"

Write-Host "   Subiendo backend/.env al servidor..." -ForegroundColor Yellow
scp backend/.env "${ServerDest}:/var/www/garza_crm_page/backend/.env"

# 4. Instalar dependencias del Backend, arrancar/recargar PM2 y ajustar permisos
Write-Host "`n[4/4] Configurando Backend en VPS (npm install, PM2 y permisos)..." -ForegroundColor Yellow
ssh $ServerDest "cd /var/www/garza_crm_page/backend && npm install && (pm2 reload garza-backend --update-env || pm2 start ecosystem.config.cjs) && pm2 save && chown -R www-data:www-data /var/www/garza_crm_page && chmod -R 755 /var/www/garza_crm_page"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Despliegue finalizado con exito!           " -ForegroundColor Green
Write-Host " - Web Principal: https://comgarza.com       " -ForegroundColor Green
Write-Host " - CRM:           https://crm.comgarza.com   " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green