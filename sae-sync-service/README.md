# Servicio de Sincronización Aspel SAE ➔ Supabase

Este es un microservicio autónomo en Node.js diseñado para realizar una **sincronización incremental y espejo** de los datos del inventario de Aspel SAE 9.0 hacia la base de datos de la aplicación web en Supabase. 

El script está optimizado para ejecutarse localmente en el servidor cada minuto, consumiendo mínimos recursos mediante la comparación diferencial de registros en memoria antes de subirlos a la nube.

---

## 🛠️ Requisitos previos en el Servidor

1. **Instalar Node.js:** Versión LTS 20 o superior ([Descargar aquí](https://nodejs.org/)).
2. **Motor Firebird:** El servicio local de Firebird debe estar activo en el puerto estándar `3050`.

---

## 🔑 1. Configuración de Solo Lectura en Firebird

Por seguridad e integridad, se recomienda crear un usuario específico en Firebird con permisos exclusivos de lectura (`SELECT`) para evitar cualquier riesgo de escritura accidental.

Pueden conectarse al archivo `.FDB` usando **DBeaver** o la consola de comandos de Firebird `isql` y ejecutar la siguiente configuración:

```sql
/* 1. Crear el usuario para el sincronizador */
CREATE USER USER_WEB_SYNC PASSWORD 'contrasena_segura';

/* 2. Otorgar permisos únicamente de lectura (SELECT) */
GRANT SELECT ON INVE03 TO USER_WEB_SYNC;
GRANT SELECT ON PRECIO_X_PROD03 TO USER_WEB_SYNC;
GRANT SELECT ON CLIE03 TO USER_WEB_SYNC;
GRANT SELECT ON VEND03 TO USER_WEB_SYNC;

COMMIT;
```

---

## 🚀 2. Instalación y Despliegue del Servicio

1. Copie esta carpeta completa (`sae-sync-service`) en el disco duro del servidor de la empresa (ej. `C:\sae-sync-service`).
2. Duplique o renombre el archivo `.env.example` como **`.env`** y rellene los parámetros de configuración:
   * **`SAE_FDB_PATH`**: Ruta física absoluta al archivo `.FDB` de producción activo en el servidor.
   * **`SAE_DB_USER`** y **`SAE_DB_PASSWORD`**: Credenciales del usuario que acaban de crear.
   * **`SAE_SUPABASE_SERVICE_ROLE_KEY`**: Clave de servicio de Supabase (se encuentra en el archivo de variables del CRM).
3. Abra una terminal de comandos (CMD o PowerShell) en el directorio `C:\sae-sync-service` e instale los módulos requeridos:
   ```bash
   npm install
   ```
4. Realice una ejecución de prueba manual para validar que la conexión y sincronización sean exitosas:
   ```bash
   node index.js
   ```

---

## ⏱️ 3. Automatización en Segundo Plano (Ejecución cada 1 minuto)

Para asegurar que los inventarios permanezcan actualizados en tiempo real las 24 horas del día, el script debe automatizarse en el servidor:

### Opción A: Gestor de procesos PM2 (Recomendado)
PM2 administra el script como un servicio de fondo en Windows, asegurando reintentos automáticos y registros de logs ordenados:
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el proceso programado con un cron de 1 minuto
pm2 start index.js --name "sae-sync-service" --cron-restart="*/1 * * * *" --no-autorestart

# Guardar configuración para persistir en reinicios del servidor
pm2 save
```

### Opción B: Programador de Tareas de Windows
1. Cree una **Tarea Básica** en Windows.
2. Defina el desencadenador para que se ejecute **Diariamente**, y configúrelo para repetirse **"Cada 1 minuto"** indefinidamente.
3. En la Acción, seleccione **Iniciar un programa**:
   * **Programa o script:** `node`
   * **Agregar argumentos:** `index.js`
   * **Iniciar en (opcional):** `C:\sae-sync-service`
