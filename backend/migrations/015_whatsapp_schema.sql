-- Migration: 015_whatsapp_schema.sql
-- Description: Estructura de base de datos para la sincronización y mensajería de WhatsApp (open-wa)

-- 1. Tabla de Chats de WhatsApp
CREATE TABLE IF NOT EXISTS public.wa_chats (
    id TEXT PRIMARY KEY, -- WhatsApp JID (ej: '52181XXXXXXXX@c.us' o '120363XXXXXXXX@g.us')
    name TEXT,
    phone TEXT,
    unread_count INTEGER DEFAULT 0,
    is_bot_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS public.wa_messages (
    id TEXT PRIMARY KEY, -- ID único del mensaje de WhatsApp (ej: 'true_52181XXXXX_3EB0XXX')
    chat_id TEXT REFERENCES public.wa_chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL, -- Asesor que envió (si from_me = true)
    sender_name TEXT,
    body TEXT,
    type TEXT DEFAULT 'chat', -- 'chat' | 'image' | 'video' | 'document' | 'audio' | 'location'
    media_url TEXT,
    from_me BOOLEAN DEFAULT false,
    timestamp BIGINT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.wa_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS) para wa_chats
DROP POLICY IF EXISTS "wa_chats_select_isolation" ON public.wa_chats;
CREATE POLICY "wa_chats_select_isolation"
    ON public.wa_chats
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        wa_chats.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "wa_chats_write_isolation" ON public.wa_chats;
CREATE POLICY "wa_chats_write_isolation"
    ON public.wa_chats
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            wa_chats.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR wa_chats.assigned_to = auth.uid()
            )
        )
    );

-- 4. Políticas de Seguridad (RLS) para wa_messages
DROP POLICY IF EXISTS "wa_messages_select_isolation" ON public.wa_messages;
CREATE POLICY "wa_messages_select_isolation"
    ON public.wa_messages
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        wa_messages.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

DROP POLICY IF EXISTS "wa_messages_write_isolation" ON public.wa_messages;
CREATE POLICY "wa_messages_write_isolation"
    ON public.wa_messages
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        wa_messages.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- Índices para velocidad de búsquedas
CREATE INDEX IF NOT EXISTS idx_wa_chats_company_id ON public.wa_chats(company_id);
CREATE INDEX IF NOT EXISTS idx_wa_chats_assigned_to ON public.wa_chats(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_id ON public.wa_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_company_id ON public.wa_messages(company_id);
