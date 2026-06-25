# deploy.ps1
# Script de despliegue automatizado para Garza CRM (Zero-Downtime)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Iniciando despliegue de Garza CRM         " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Compilar Frontend localmente
Write-Host "`n[1/4] Compilando Frontend..." -ForegroundColor Yellow
npm run build

# 2. Desplegar Frontend al VPS
Write-Host "`n[2/4] Subiendo Frontend (dist/) al VPS..." -ForegroundColor Yellow
# Limpiar todo el dist anterior para evitar acumulación de archivos basura de builds viejas
ssh $ServerDest "rm -rf /var/www/garza_crm_page/frontend/dist/*"

# Subir carpeta dist/ completa en UN SOLO COMANDO para evitar que pida contraseña por cada archivo
$distFiles = Get-ChildItem -Path dist | Select-Object -ExpandProperty FullName
scp -r $distFiles "${ServerDest}:/var/www/garza_crm_page/frontend/dist/"

Write-Host "   Verificando assets en servidor..." -ForegroundColor Gray
$assetCount = ssh $ServerDest "ls /var/www/garza_crm_page/frontend/dist/assets/*.js 2>/dev/null | wc -l"
Write-Host "   Assets JS encontrados en servidor: $assetCount" -ForegroundColor Gray

# 3. Desplegar Backend al VPS
Write-Host "`n[3/4] Subiendo Backend al VPS..." -ForegroundColor Yellow
# Subir directorios del backend (AHORA INCLUYE backend/utils que faltaba)
scp -r backend/config backend/controllers backend/middleware backend/migrations backend/public backend/routes backend/scripts backend/services backend/utils "${ServerDest}:/var/www/garza_crm_page/backend/"
# Subir archivos raíz del backend (no se sobrescribe el .env de producción a menos que se requiera)
scp backend/server.js backend/supabaseClient.js backend/ecosystem.config.cjs backend/package.json backend/package-lock.json "${ServerDest}:/var/www/garza_crm_page/backend/"

# 4. Recargar el clúster de PM2 y restablecer permisos
Write-Host "`n[4/4] Recargando clúster de PM2 y restableciendo permisos en el servidor..." -ForegroundColor Yellow
ssh $ServerDest "pm2 reload garza-backend && chown -R www-data:www-data /var/www/garza_crm_page && chmod -R 755 /var/www/garza_crm_page"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Despliegue finalizado con éxito! (Zero-Downtime) " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
