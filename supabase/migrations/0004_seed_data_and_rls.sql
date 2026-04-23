-- ============================================
-- VSIS Seed Data + Read-All RLS policies
-- Runs after 0003_industries_topics_ecosystems
-- ============================================
-- Placeholder — actual INSERT rows are produced by
-- scripts/build_seed_sql.py from inbox/files/*.json
-- and inserted via 0004_seed_inserts.sql (generated).
-- ============================================

ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystems ENABLE ROW LEVEL SECURITY;

-- Public read for anon + authenticated (these tables are public reference data)
DROP POLICY IF EXISTS "read_all_industries" ON industries;
CREATE POLICY "read_all_industries" ON industries FOR SELECT USING (true);

DROP POLICY IF EXISTS "read_all_topics" ON topics;
CREATE POLICY "read_all_topics" ON topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "read_all_ecosystems" ON ecosystems;
CREATE POLICY "read_all_ecosystems" ON ecosystems FOR SELECT USING (true);
