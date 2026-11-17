-- Güvenlik ve işletim sertleştirmesi (inceleme raporu 2026-11-17)

-- Çift gönderim koruması: aynı mezun aynı anketin aynı sıra numarasını iki kez gönderemez.
-- Gönderim transaction'ı sıra numarasını kilitli satır üzerinden hesapladığı için paralel istekte ikincisi burada durur.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_responses_submitted_number
  ON responses (survey_id, graduate_id, submission_number)
  WHERE status = 'submitted';

-- OTP isteklerinde IP başına sınır
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS ip TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_otp_ip_created ON otp_codes (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_created ON otp_codes (created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts (created_at);
-- Uygulama e-postaları hep küçük harfle yazar; düz index sorgularla eşleşir
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_plain ON login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_email_plain ON otp_codes (email, created_at DESC);
UPDATE otp_codes SET email = LOWER(email) WHERE email <> LOWER(email);
UPDATE login_attempts SET email = LOWER(email) WHERE email <> LOWER(email);

-- Oturum iptali: sürüm artınca eski çerezler geçersiz olur
ALTER TABLE admins ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE graduates ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

-- KVKK: kimlik bilgisi silinmiş (anonimleştirilmiş) mezun
ALTER TABLE graduates ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Yönetici denetim kaydı
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_graduate ON reminder_logs (graduate_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_consents_graduate ON consents (graduate_id, accepted_at DESC);

-- Var olan IP ipuçlarını maskele (son oktet / son 4 grup)
UPDATE consents
SET ip_hint = CASE
  WHEN ip_hint ~ '^\d+\.\d+\.\d+\.\d+$' THEN regexp_replace(ip_hint, '\.\d+$', '.0')
  WHEN ip_hint LIKE '%:%' THEN array_to_string((string_to_array(ip_hint, ':'))[1:4], ':') || '::'
  ELSE ip_hint
END
WHERE ip_hint IS NOT NULL;
