# Guía de Despliegue y Mantenimiento de Producción - Garza CRM

Esta guía contiene la documentación completa de la arquitectura de producción de **Garza CRM** en el VPS de Hostinger, los errores resueltos durante la puesta en marcha, y el manual paso a paso para realizar actualizaciones futuras de forma segura y rápida.

---

## 🗺️ 1. Arquitectura de Producción

El CRM está estructurado bajo una arquitectura de alto rendimiento y bajo consumo de recursos:
* **Frontend (React + Vite):** Compilado a archivos estáticos puros (HTML, JS, CSS) servidos de forma ultra rápida y directa por **Nginx**.
* **Backend (Node.js Express):** Corre de forma persistente en el puerto local `3000` administrado por **PM2**.
* **Base de Datos:** Conexión segura e instantánea a **Supabase Cloud**.
* **Proxy Inverso:** **Nginx** recibe el tráfico seguro HTTPS (`https://comgarza.com`) en el puerto 443. Si la petición es del frontend, la sirve directamente en el disco; si la petición empieza con `/api/`, la redirige internamente al puerto `3000` de Node.js.

---

## ❌ 2. Errores Encontrados y Cómo los Resolvimos

Durante el montaje del servidor nos enfrentamos a desafíos comunes de despliegue que solucionamos científicamente:

### A. Error 500 (Bucle de Redirecciones en Nginx)
* **Síntoma:** Al entrar a la web, Nginx mostraba *500 Internal Server Error*.
* **Causa:** La carpeta `/dist` del frontend estaba vacía y la regla `try_files $uri $uri/ /index.html;` de Nginx, al no encontrar los archivos ni el `index.html` de auxilio, caía en un bucle infinito de redirecciones.
* **Solución:** Creamos un `index.html` temporal en la ruta correcta para romper el bucle.

### B. Error 403 Forbidden (Exploración de Directorio Prohibida)
* **Síntoma:** La web mostraba *403 Forbidden*.
* **Causa:** Nginx estaba apuntando a `/frontend` en lugar de la subcarpeta `/frontend/dist`. Al no haber un archivo índice en la raíz, Nginx intentaba listar los archivos del directorio (lo cual está prohibido por seguridad). Además, el usuario de Nginx (`www-data`) no tenía permisos de ejecución (`+x`) en las carpetas superiores.
* **Solución:** Corregimos la ruta `root` en la configuración de Nginx agregándole `/dist` y dimos permisos de ejecución en las carpetas.

### C. Error de MIME Type ("text/html") en Scripts de Vite
* **Síntoma:** Pantalla en blanco con el error *Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"*.
* **Causa:** Subimos los archivos de `dist/assets/*` planos en la raíz de `dist/` debido a la expansión de comodines en PowerShell (`dist/*`). Al buscar `/assets/index.js`, Nginx no lo encontraba y devolvía el `index.html` (MIME `text/html`) como auxilio.
* **Solución:** Ajustamos el `vite.config.js` a `base: '/'`, recompilamos y subimos la carpeta `assets` estructurada. También actualizamos el `index.html` en el servidor.

### D. stat() failed (13: Permission denied)
* **Síntoma:** Nginx no cargaba las hojas de estilo ni scripts mostrando 403 en consola.
* **Causa:** Al subir los archivos por `scp` mediante el usuario `root`, los archivos quedaron protegidos. El usuario de Nginx (`www-data`) no tenía permisos de lectura sobre ellos.
* **Solución:** Reestablecimos la propiedad y permisos de manera recursiva:
  `sudo chown -R www-data:www-data /var/www/garza_crm_page`
  `sudo chmod -R 755 /var/www/garza_crm_page`

---

## 🚀 3. Guía de Actualizaciones Futuras (Paso a Paso)

Cuando hagas cambios en el código de tu computadora local y quieras subirlos a producción en el VPS, sigue estas instrucciones:

### 3.1. Actualizar el Frontend (La Página Visual)

1. **Compila el proyecto localmente:**
   En tu terminal local (`06-GarzaPage`), ejecuta:
   ```powershell
   npm run build
   ```

2. **Sube los archivos de Assets directamente a la subcarpeta del VPS:**
   ```powershell
   scp -r dist/assets/* root@2.25.149.51:/var/www/garza_crm_page/frontend/dist/assets/
   ```

3. **Sube el archivo `index.html` actualizado:**
   ```powershell
   scp dist/index.html root@2.25.149.51:/var/www/garza_crm_page/frontend/dist/index.html
   ```

4. **Reestablece los permisos en el VPS (Muy Importante):**
   Conéctate al VPS por SSH (`ssh root@2.25.149.51`) y ejecuta:
   ```bash
   sudo chown -R www-data:www-data /var/www/garza_crm_page/frontend/dist
   sudo chmod -R 755 /var/www/garza_crm_page/frontend/dist
   ```

---

### 3.2. Actualizar el Backend (La API y Lógica)

1. **Sube las carpetas de código modificadas desde tu terminal local:**
   En tu terminal local en la subcarpeta `\backend`, ejecuta:
   ```powershell
   scp -r config controllers middleware migrations routes services public server.js package.json .env root@2.25.149.51:/var/www/garza_crm_page/backend/
   ```

2. **Si agregaste nuevos paquetes de npm (nuevas dependencias en package.json):**
   Conéctate por SSH al VPS y ejecuta:
   ```bash
   cd /var/www/garza_crm_page/backend
   npm install --production
   ```

3. **Reinicia el servicio con PM2 para aplicar los cambios del backend:**
   ```bash
   pm2 restart garza-backend
   ```

4. **Reestablece permisos en el VPS:**
   ```bash
   sudo chown -R www-data:www-data /var/www/garza_crm_page/backend
   sudo chmod -R 755 /var/www/garza_crm_page/backend
   ```

---

## 🛠️ 4. Comandos Útiles de Administración en el VPS

Estando conectado por SSH en tu VPS, estos comandos te salvarán la vida para monitorear y reparar cosas:

* **Ver logs del backend en tiempo real (para ver errores o acciones de usuarios):**
  ```bash
  pm2 logs garza-backend
  ```
* **Ver el estado de memoria/CPU del backend:**
  ```bash
  pm2 status
  ```
* **Ver logs de error de Nginx:**
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```
* **Verificar la sintaxis de Nginx antes de reiniciar:**
  ```bash
  sudo nginx -t
  ```
* **Reiniciar Nginx por completo:**
  ```bash
  sudo systemctl restart nginx
  ```
* **Modificar variables de entorno del backend (.env) directamente en el servidor:**
  ```bash
  nano /var/www/garza_crm_page/backend/.env
  # Guardar con: Ctrl+O -> Enter. Salir con: Ctrl+X.
  # Luego de editar, siempre debes reiniciar el backend:
  pm2 restart garza-backend
  ```
