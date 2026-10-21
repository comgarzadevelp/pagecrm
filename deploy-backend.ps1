# deploy-backend.ps1
# Despliegue EXCLUSIVO para el Backend Node.js

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Desplegando BACKEND API                   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Subir directorios y código
Write-Host "`n[1/3] Subiendo directorios del backend..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p /var/www/garza_crm_page/backend"
scp -r backend/config backend/controllers backend/middleware backend/migrations backend/public backend/routes backend/scripts backend/services backend/utils "${ServerDest}:/var/www/garza_crm_page/backend/"
scp backend/server.js backend/supabaseClient.js backend/ecosystem.config.cjs backend/package.json backend/package-lock.json "${ServerDest}:/var/www/garza_crm_page/backend/"

# 2. Subir .env
Write-Host "`n[2/3] Subiendo variables de entorno (.env)..." -ForegroundColor Yellow
scp backend/.env "${ServerDest}:/var/www/garza_crm_page/backend/.env"

# 3. Recargar PM2
Write-Host "`n[3/3] Instalando dependencias y recargando PM2..." -ForegroundColor Yellow
ssh $ServerDest "cd /var/www/garza_crm_page/backend && npm install && (pm2 reload garza-backend --update-env || pm2 start ecosystem.config.cjs) && pm2 save && chown -R www-data:www-data /var/www/garza_crm_page/backend && chmod -R 755 /var/www/garza_crm_page/backend"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Backend actualizado con éxito!             " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
