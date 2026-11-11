-- Removes the Memoir feature's storage (added in 0003_memoir.sql, column
-- renamed in 0004_rename_openrouter_key.sql). The app no longer reads or
-- writes either. This permanently deletes every saved memoir chapter and
-- the stored (encrypted) OpenRouter key, so take a backup first if you
-- want to keep them. Run once, after 0004.

BEGIN;

DROP TABLE IF EXISTS memoir_entries;
ALTER TABLE user_settings DROP COLUMN IF EXISTS openrouter_api_key;

COMMIT;
