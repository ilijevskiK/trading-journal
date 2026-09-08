-- Renames the memoir feature's LLM API key column after switching
-- providers (Anthropic -> OpenRouter, see lib/openRouterClient.js).
-- 0003_memoir.sql was already applied with the old anthropic_api_key
-- name before this switch — already-applied migrations aren't edited
-- retroactively, so this is a follow-up rename rather than a change to
-- 0003 itself (0003 in this repo now reflects the column name a fresh
-- install would get directly).

ALTER TABLE user_settings RENAME COLUMN anthropic_api_key TO openrouter_api_key;
