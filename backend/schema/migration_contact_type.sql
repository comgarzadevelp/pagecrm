-- Agrega la columna contact_type a la tabla contacts
ALTER TABLE public.contacts ADD COLUMN contact_type VARCHAR(50) DEFAULT 'oficina';

-- Actualiza los contactos existentes para que tengan un tipo predeterminado
UPDATE public.contacts SET contact_type = 'oficina' WHERE contact_type IS NULL;
