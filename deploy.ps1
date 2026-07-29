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
# Subir directorios del backend
scp -r backend/config backend/controllers backend/middleware backend/migrations backend/public backend/routes backend/scripts backend/services backend/utils "${ServerDest}:/var/www/garza_crm_page/backend/"
# Subir archivos raíz del backend
scp backend/server.js backend/supabaseClient.js backend/ecosystem.config.cjs backend/package.json backend/package-lock.json "${ServerDest}:/var/www/garza_crm_page/backend/"

# Subir variables de entorno del backend (CRÍTICO: incluye credenciales SAE GDL, MTY, JWT, etc.)
Write-Host "   Subiendo backend/.env al servidor..." -ForegroundColor Yellow
scp backend/.env "${ServerDest}:/var/www/garza_crm_page/backend/.env"
Write-Host "   [OK] backend/.env actualizado en produccion" -ForegroundColor Green

# 4. Instalar nuevas dependencias en el servidor
Write-Host "`n[4/5] Instalando dependencias nuevas en el Backend..." -ForegroundColor Yellow
ssh $ServerDest "cd /var/www/garza_crm_page/backend && npm install"

# 5. Recargar el clúster de PM2 con las nuevas variables de entorno y restablecer permisos
Write-Host "`n[5/5] Recargando clúster de PM2 (con --update-env) y restableciendo permisos..." -ForegroundColor Yellow
ssh $ServerDest "pm2 reload garza-backend --update-env && chown -R www-data:www-data /var/www/garza_crm_page && chmod -R 755 /var/www/garza_crm_page"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Despliegue finalizado con exito! (Zero-Downtime) " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green