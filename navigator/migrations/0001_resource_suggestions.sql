CREATE TABLE IF NOT EXISTS resource_suggestions (
 id TEXT PRIMARY KEY,
 fingerprint TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 submission_day TEXT NOT NULL,
 name TEXT NOT NULL,
 website TEXT NOT NULL,
 description TEXT NOT NULL,
 area_hint TEXT NOT NULL DEFAULT '',
 classification_json TEXT NOT NULL,
 sorting_mode TEXT NOT NULL CHECK(sorting_mode IN ('ai','rules')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','added','declined')),
 reviewed_at TEXT,
 review_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS suggestions_day ON resource_suggestions(submission_day);
CREATE INDEX IF NOT EXISTS suggestions_status ON resource_suggestions(status,created_at);
