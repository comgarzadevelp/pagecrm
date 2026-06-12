-- Migration: 013_calendar_enrichment.sql
-- Description: Adds location, client_name and company_google_event_id to appointments, and google_calendar_id to enterprise companies for master sync.

-- 1. Enriquecer la tabla de citas locales
ALTER TABLE public.crm_appointments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.crm_appointments ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.crm_appointments ADD COLUMN IF NOT EXISTS company_google_event_id TEXT;

-- 2. Enriquecer la tabla de empresas para almacenar el ID del Google Calendar máster corporativo
ALTER TABLE public.enterprise_companies ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
