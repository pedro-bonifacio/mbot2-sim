-- ★★★ challenges (decision 0019): a third star per level. Stars are only ever added.
ALTER TABLE stars ADD COLUMN three INTEGER NOT NULL DEFAULT 0;
