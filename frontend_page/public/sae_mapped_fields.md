# Campos Mapeados de Aspel SAE 9.0 a Garza CRM

Este documento detalla la relación exacta entre las columnas de la tabla espejo de clientes en la base de datos (**`clie03`** de Aspel SAE 9.0) y su representación visual e interactiva en la interfaz de **Ficha de Cliente** e **Información Comercial** del CRM de Garza.

---

## 🏢 1. Datos Maestros y de Facturación

| Campo en DB SAE (`clie03`) | Tipo de Dato | Representación en CRM | Propósito en Garza CRM |
| :--- | :--- | :--- | :--- |
| **`rfc`** | `TEXT` | **RFC / Identificación Fiscal** | Identificación fiscal obligatoria para facturación comercial. |
| **`uso_cfdi`** | `TEXT` | **Uso de CFDI** | Especificación del uso de CFDI fiscal (por defecto: *G03 - Gastos en general*). |
| **`calle`** | `TEXT` | **Dirección Fiscal (Calle y Número)** | Parte de la dirección fiscal registrada del cliente. |
| **`colonia`** | `TEXT` | **Dirección Fiscal (Colonia)** | Asentamiento fiscal del cliente en SAE. |
| **`codigo`** | `TEXT` | **Dirección Fiscal (Código Postal)** | Código postal de facturación. |
| **`municipio`** | `TEXT` | **Dirección Fiscal (Municipio / Ciudad)**| Municipio fiscal del cliente en SAE. |
| **`estado`** | `TEXT` | **Dirección Fiscal (Estado)** | Estado fiscal federativo. |
| **`nombre`** | `TEXT` | **Nombre / Razón Social** | Razón social comercial del cliente. |
| **`pag_web`** | `TEXT` | **Sitio Web** | Sitio web registrado en Aspel SAE. |

---

## 💰 2. Métricas, Saldos e Información Comercial

| Campo en DB SAE (`clie03`) | Tipo de Dato | Representación en CRM | Propósito en Garza CRM |
| :--- | :--- | :--- | :--- |
| **`limcred`** | `DOUBLE` | **Límite de Crédito** | Límite comercial autorizado para compras a crédito en pesos (`MXN`). |
| **`saldo`** | `DOUBLE` | **Saldo Pendiente (Deuda)** | Cartera vencida o saldo pendiente de pago por cobrar en pesos (`MXN`). |
| **`lista_prec`** | `INTEGER` | **Lista de Precios Asignada** | Determina la tarifa especial. Traducido automáticamente a **"Público en General"** (si es `1`), **"Convenio"** (si coincide con convenios comerciales) o **"Tarifa Lote X"**. |
| **`ventas`** | `DOUBLE` | **Ventas Acumuladas Históricas**| Facturación total acumulada del cliente en Garza. |
| **`created_at`** | `DATETIME` | **Fecha de Registro / Sincronización**| Fecha de última importación o creación del cliente. |

---

> [!IMPORTANT]
> **Políticas de Integridad de Datos Garza:**
> * Todos los datos importados directamente desde Aspel SAE en esta lista son de **solo lectura (bloqueados)** en el CRM para evitar discrepancias administrativas.
> * Las correcciones en estos campos deben solicitarse formalmente a través del botón **Solicitar Cambio a TI** que enviará una solicitud al panel de administración para su validación centralizada.
