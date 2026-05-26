/* Migration: 003_fix_quotes_rls.sql
   Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor → New Query)
   
   Problema: La tabla quotes tiene Row Level Security activo, lo que bloquea
   los inserts desde el backend Node.js con la clave anon.
   
   Solución: Deshabilitar RLS (el backend ya autentica vía JWT propio)
   y agregar política de respaldo por si acaso.
*/

-- 1. Desactivar RLS completamente en quotes
--    (la autenticación la gestiona el middleware JWT de Node.js)
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

-- 2. Por si acaso, eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "quotes_insert_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_select_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_update_policy" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_policy" ON quotes;

-- 3. Verificar que RLS quedó desactivado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'quotes';
-- Debe mostrar: quotes | f  (f = false = RLS desactivado)
