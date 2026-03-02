-- 009: Skills Platform (Phase 6)
-- Adds permission and npm fields to user_extensions table

ALTER TABLE user_extensions ADD COLUMN IF NOT EXISTS npm_package TEXT;
ALTER TABLE user_extensions ADD COLUMN IF NOT EXISTS npm_version TEXT;
ALTER TABLE user_extensions ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{"required":[],"optional":[]}';
ALTER TABLE user_extensions ADD COLUMN IF NOT EXISTS granted_permissions JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_extensions_npm ON user_extensions(npm_package) WHERE npm_package IS NOT NULL;
