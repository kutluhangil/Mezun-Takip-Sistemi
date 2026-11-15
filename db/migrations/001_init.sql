-- İlk ve Acil Yardım Mezun Takip Sistemi — PostgreSQL Şeması
-- Kural: Gönderilen hiçbir yanıt silinmez veya üzerine yazılmaz.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mezun listesi + doğrulama beyaz listesi
CREATE TABLE IF NOT EXISTS graduates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  student_number TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER,
  graduation_term TEXT CHECK (graduation_term IN ('guz', 'bahar', 'yaz') OR graduation_term IS NULL),
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graduates_email_lower ON graduates (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_graduates_student_number ON graduates (student_number);

-- Öğretmen / Yönetici hesapları (owner = Program Başkanı, viewer = salt görüntüleyici)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'viewer')),
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anket tanımları (ileride yeni anket metinleri eklenebilir)
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_tr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  definition JSONB NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  repeat_mode TEXT NOT NULL DEFAULT 'period' CHECK (repeat_mode IN ('period', 'cooldown_days', 'once')),
  active_period TEXT NOT NULL DEFAULT '2026-Guz',
  cooldown_days INTEGER NOT NULL DEFAULT 180,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-posta OTP doğrulama kodları (6 haneli kod SHA-256 hash olarak saklanır)
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  pending_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email_created ON otp_codes (LOWER(email), created_at DESC);

-- KVKK açık rıza kayıtları
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graduate_id UUID NOT NULL REFERENCES graduates(id) ON DELETE RESTRICT,
  text_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hint TEXT
);

-- Yanıtlar: submitted kayıtlar eklemelidir (append-only); her mezun başına en fazla 1 aktif draft
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE RESTRICT,
  graduate_id UUID NOT NULL REFERENCES graduates(id) ON DELETE RESTRICT,
  period_key TEXT NOT NULL,
  submission_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_responses_active_draft
  ON responses (survey_id, graduate_id)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_responses_survey_status
  ON responses (survey_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_graduate
  ON responses (graduate_id, submitted_at DESC);

-- Soru bazlı yanıtlar
CREATE TABLE IF NOT EXISTS answers (
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (response_id, question_id)
);

-- Hatırlatma e-posta kayıtları (Soru 39)
CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE RESTRICT,
  graduate_id UUID NOT NULL REFERENCES graduates(id) ON DELETE RESTRICT,
  sent_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  period_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yönetici girişi başarısız deneme kayıtları (kaba kuvvet koruması)
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (LOWER(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, created_at DESC);

-- Varsayılan uygulama ayarları (KVKK ve whitelist placeholder olarak başlar)
INSERT INTO app_settings (key, value)
VALUES
  ('whitelist_required', '{"enabled": false, "note": "Mezun Excel listesi yüklenince true yapın"}'::jsonb),
  ('kvkk_notice', '{"version": "v0-placeholder", "tr": "", "en": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
