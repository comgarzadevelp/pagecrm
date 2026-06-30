-- Migration 008: Add additional_companies to crm_users

ALTER TABLE public.crm_users 
ADD COLUMN IF NOT EXISTS additional_companies UUID[] DEFAULT '{}';

-- Comentario: Permite que gerentes/supervisores puedan acceder a sucursales adicionales sin ser super_admin.
