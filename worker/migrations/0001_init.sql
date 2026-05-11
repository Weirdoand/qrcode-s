CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS codes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'image',
  target TEXT NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_codes_user_id ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_slug ON codes(slug);
