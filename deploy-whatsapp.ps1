# deploy-whatsapp.ps1
# Script de despliegue exclusivo para el Microservicio de WhatsApp (Puerto 5002)

$ErrorActionPreference = "Stop"
$ServerIP = "2.25.149.51"
$ServerUser = "root"
$ServerDest = "$ServerUser@$ServerIP"
$RemoteDir = "/var/www/garza_crm_page/whatsapp-service"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Despliegue de Garza WhatsApp Microservice    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Crear directorios remotos
Write-Host "`n[1/3] Creando estructura de carpetas en el VPS..." -ForegroundColor Yellow
ssh $ServerDest "mkdir -p $RemoteDir/controllers $RemoteDir/services"

# 2. Subir archivos fuente del microservicio (excluyendo node_modules y caches)
Write-Host "`n[2/3] Subiendo archivos fuente a $RemoteDir..." -ForegroundColor Yellow
scp whatsapp-service/package.json whatsapp-service/package-lock.json whatsapp-service/index.js whatsapp-service/.env "${ServerDest}:${RemoteDir}/"
scp whatsapp-service/controllers/* "${ServerDest}:${RemoteDir}/controllers/"
scp whatsapp-service/services/* "${ServerDest}:${RemoteDir}/services/"

# 3. Instalar dependencias en el VPS y arrancar en PM2 (Modo Fork, 1 instancia)
Write-Host "`n[3/3] Instalando dependencias en VPS y arrancando en PM2..." -ForegroundColor Yellow
ssh $ServerDest "cd $RemoteDir && npm install && (pm2 restart garza-whatsapp || pm2 start index.js --name 'garza-whatsapp' --time) && pm2 save"

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host " ¡Microservicio de WhatsApp desplegado en PM2!    " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
