-- ============================================================
-- MIGRACIÓN 015: User Presence & Session Tracking
-- ============================================================

-- 1. Columnas de presencia en crm_users
ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_count  INTEGER DEFAULT 0;

-- Índice para queries de presencia frecuentes
CREATE INDEX IF NOT EXISTS idx_crm_users_last_seen_at
  ON crm_users(last_seen_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_crm_users_last_login_at
  ON crm_users(last_login_at DESC NULLS LAST);

-- 2. Tabla de eventos de sesión (append-only log)
CREATE TABLE IF NOT EXISTS user_session_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL CHECK (event_type IN (
                              'login', 'logout', 'heartbeat',
                              'session_expired', 'focus_restored'
                            )),
  client_ip     INET,
  user_agent    TEXT,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para analytics queries eficientes
CREATE INDEX IF NOT EXISTS idx_session_events_user_id
  ON user_session_events(user_id);

CREATE INDEX IF NOT EXISTS idx_session_events_created_at
  ON user_session_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_events_event_type
  ON user_session_events(event_type);

CREATE INDEX IF NOT EXISTS idx_session_events_user_event_time
  ON user_session_events(user_id, event_type, created_at DESC);

-- 3. RLS: Solo el service_role puede escribir eventos
ALTER TABLE user_session_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'user_session_events'
    ) THEN
        CREATE POLICY "service_role_all" ON user_session_events USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 4. VISTA: user_adoption_metrics
CREATE OR REPLACE VIEW user_adoption_metrics AS
SELECT
  u.id                                          AS user_id,
  u.name,
  u.role,
  u.last_seen_at,
  u.last_login_at,
  u.last_logout_at,
  u.session_count,

  -- Días activos en últimos 30 días
  COUNT(DISTINCT DATE(e.created_at))
    FILTER (WHERE e.event_type = 'login'
              AND e.created_at >= NOW() - INTERVAL '30 days')
                                                AS active_days_30d,

  -- Total de logins en últimos 30 días
  COUNT(e.id)
    FILTER (WHERE e.event_type = 'login'
              AND e.created_at >= NOW() - INTERVAL '30 days')
                                                AS login_count_30d,

  -- Promedio de heartbeats por día (proxy de tiempo en app)
  ROUND(
    COUNT(e.id)
      FILTER (WHERE e.event_type = 'heartbeat'
                AND e.created_at >= NOW() - INTERVAL '30 days')::NUMERIC
    / NULLIF(
        COUNT(DISTINCT DATE(e.created_at))
          FILTER (WHERE e.created_at >= NOW() - INTERVAL '30 days'),
        0
      ),
    1
  )                                             AS avg_heartbeats_per_active_day,

  -- Tiempo estimado en plataforma (heartbeats × 60s, en minutos)
  ROUND(
    COUNT(e.id)
      FILTER (WHERE e.event_type = 'heartbeat'
                AND e.created_at >= NOW() - INTERVAL '30 days')
    * 60.0 / 60.0,
    0
  )                                             AS estimated_minutes_30d

FROM crm_users u
LEFT JOIN user_session_events e ON e.user_id = u.id
GROUP BY u.id, u.name, u.role, u.last_seen_at,
         u.last_login_at, u.last_logout_at, u.session_count;
