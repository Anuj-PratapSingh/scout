-- Migration 002: add email_frequency to preferences, new AI keys to user_keys

-- Email frequency preference (1–5 emails per day, equal intervals)
ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS email_frequency integer NOT NULL DEFAULT 1
    CHECK (email_frequency >= 1 AND email_frequency <= 5);

-- AI provider keys for BYOK AI detection
ALTER TABLE user_keys
  ADD COLUMN IF NOT EXISTS gemini_api_key   text,
  ADD COLUMN IF NOT EXISTS together_api_key text,
  ADD COLUMN IF NOT EXISTS openai_api_key   text,
  ADD COLUMN IF NOT EXISTS anthropic_api_key text;
