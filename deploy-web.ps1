# deploy-web.ps1
# Script de despliegue completo para la Página Web Pública (comgarza.com) + Backend completo

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"
$RemoteFrontendPageDist = "/var/www/garza_crm_page/frontend_page/dist"
$RemoteFrontendLegacyDist = "/var/www/garza_crm_page/frontend/dist"
$RemoteBackend = "/var/www/garza_crm_page/backend"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Compilando y Desplegando Web Pública + API    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Build local de frontend_page
Write-Host "`n[1/4] Compilando Frontend Público (frontend_page)..." -ForegroundColor Yellow
Push-Location frontend_page
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Subir toda la carpeta frontend_page/dist al VPS
Write-Host "`n[2/4] Subiendo carpeta completa frontend_page/dist al VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p $RemoteFrontendPageDist $RemoteFrontendLegacyDist && rm -rf $RemoteFrontendPageDist/* $RemoteFrontendLegacyDist/*"
scp -r frontend_page/dist/* "${ServerDest}:${RemoteFrontendPageDist}/"
scp -r frontend_page/dist/* "${ServerDest}:${RemoteFrontendLegacyDist}/"

# 3. Subir toda la carpeta del Backend al VPS
Write-Host "`n[3/4] Subiendo carpeta completa del Backend al VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p $RemoteBackend"
scp -r backend/config backend/controllers backend/middleware backend/migrations backend/public backend/routes backend/scripts backend/services backend/utils "${ServerDest}:${RemoteBackend}/"
scp backend/server.js backend/supabaseClient.js backend/ecosystem.config.cjs backend/package.json backend/package-lock.json "${ServerDest}:${RemoteBackend}/"

Write-Host "   Subiendo backend/.env al servidor..." -ForegroundColor Yellow
scp backend/.env "${ServerDest}:${RemoteBackend}/.env"

# 4. Instalar dependencias, recargar PM2 y restablecer permisos
Write-Host "`n[4/4] Instalando dependencias en Backend, recargando PM2 y aplicando permisos..." -ForegroundColor Yellow
ssh $ServerDest "cd $RemoteBackend && npm install && (pm2 reload garza-backend --update-env || pm2 start ecosystem.config.cjs) && pm2 save && chown -R www-data:www-data /var/www/garza_crm_page && chmod -R 755 /var/www/garza_crm_page"

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host " ¡Web Pública y Backend desplegados con éxito!   " -ForegroundColor Green
Write-Host " Visita: https://comgarza.com                    " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
