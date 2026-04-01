CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scam_scans (
  scan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  input_type VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  prediction VARCHAR(32) NOT NULL,
  spam_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  threshold DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scam_scans_user_id ON scam_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scam_scans_created_at ON scam_scans(created_at DESC);

CREATE TABLE IF NOT EXISTS scams (
  scam_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source_scan_id UUID REFERENCES scam_scans(scan_id) ON DELETE SET NULL,
  type VARCHAR(64) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  content TEXT NOT NULL,
  prediction VARCHAR(32) NOT NULL DEFAULT 'spam',
  spam_probability DOUBLE PRECISION,
  threshold DOUBLE PRECISION,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  location_label VARCHAR(255),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scams_reporter_user_id ON scams(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_scams_type ON scams(type);
CREATE INDEX IF NOT EXISTS idx_scams_created_at ON scams(created_at DESC);

CREATE TABLE IF NOT EXISTS scam_votes (
  vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scam_id UUID NOT NULL REFERENCES scams(scam_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  vote_type VARCHAR(16) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_scam_vote_per_user UNIQUE (scam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scam_votes_user_id ON scam_votes(user_id);
