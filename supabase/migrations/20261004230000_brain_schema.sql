-- Brain → Supabase → Spark (MCP) → Connect
-- Phase 1: Brain-Schema (Obsidian-Vault) 
-- Idempotent: erlaubt Mehrfachausführung.

-- ===================================================================
-- Folders (Vault-Struktur)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  parent_path text,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);
CREATE INDEX IF NOT EXISTS brain_folders_user_idx ON public.brain_folders(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_folders TO authenticated;
GRANT ALL ON public.brain_folders TO service_role;
ALTER TABLE public.brain_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_folders" ON public.brain_folders;
CREATE POLICY "own brain_folders" ON public.brain_folders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brain_folders_touch ON public.brain_folders;
CREATE TRIGGER brain_folders_touch BEFORE UPDATE ON public.brain_folders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================================================================
-- Notes (Obsidian-Markdown)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.brain_folders(id) ON DELETE SET NULL,
  path text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  content text NOT NULL DEFAULT '',
  frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  mtime_ms bigint NOT NULL DEFAULT 0,
  drive_file_id text,
  is_starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);
CREATE INDEX IF NOT EXISTS brain_notes_user_idx ON public.brain_notes(user_id);
CREATE INDEX IF NOT EXISTS brain_notes_title_idx ON public.brain_notes(user_id, title);
CREATE INDEX IF NOT EXISTS brain_notes_folder_idx ON public.brain_notes(folder_id);
-- Volltextsuche über Titel und Inhalt
CREATE INDEX IF NOT EXISTS brain_notes_fts_idx ON public.brain_notes
  USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_notes TO authenticated;
GRANT ALL ON public.brain_notes TO service_role;
ALTER TABLE public.brain_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_notes" ON public.brain_notes;
CREATE POLICY "own brain_notes" ON public.brain_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brain_notes_touch ON public.brain_notes;
CREATE TRIGGER brain_notes_touch BEFORE UPDATE ON public.brain_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================================================================
-- Note links (Wikilinks → Backlinks / Knowledge Graph)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id uuid NOT NULL REFERENCES public.brain_notes(id) ON DELETE CASCADE,
  target_path text NOT NULL,
  target_note_id uuid REFERENCES public.brain_notes(id) ON DELETE SET NULL,
  link_text text NOT NULL DEFAULT '',
  raw_target text NOT NULL,
  is_embedded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_note_id, raw_target)
);
CREATE INDEX IF NOT EXISTS brain_note_links_source_idx ON public.brain_note_links(source_note_id);
CREATE INDEX IF NOT EXISTS brain_note_links_target_idx ON public.brain_note_links(target_note_id);
CREATE INDEX IF NOT EXISTS brain_note_links_target_path_idx ON public.brain_note_links(user_id, target_path);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_note_links TO authenticated;
GRANT ALL ON public.brain_note_links TO service_role;
ALTER TABLE public.brain_note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_note_links" ON public.brain_note_links;
CREATE POLICY "own brain_note_links" ON public.brain_note_links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===================================================================
-- Files (Medien in Google Drive, nur ID in Supabase)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.brain_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  drive_file_id text,
  sha256 text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);
CREATE INDEX IF NOT EXISTS brain_files_user_idx ON public.brain_files(user_id);
CREATE INDEX IF NOT EXISTS brain_files_note_idx ON public.brain_files(note_id);
CREATE INDEX IF NOT EXISTS brain_files_drive_idx ON public.brain_files(user_id, drive_file_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_files TO authenticated;
GRANT ALL ON public.brain_files TO service_role;
ALTER TABLE public.brain_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_files" ON public.brain_files;
CREATE POLICY "own brain_files" ON public.brain_files
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===================================================================
-- Tasks (Checkboxes aus Notizen)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.brain_notes(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  is_done_today boolean NOT NULL DEFAULT false,
  due_date date,
  tags text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brain_tasks_user_idx ON public.brain_tasks(user_id);
CREATE INDEX IF NOT EXISTS brain_tasks_due_idx ON public.brain_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS brain_tasks_done_idx ON public.brain_tasks(user_id, is_done);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_tasks TO authenticated;
GRANT ALL ON public.brain_tasks TO service_role;
ALTER TABLE public.brain_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_tasks" ON public.brain_tasks;
CREATE POLICY "own brain_tasks" ON public.brain_tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brain_tasks_touch ON public.brain_tasks;
CREATE TRIGGER brain_tasks_touch BEFORE UPDATE ON public.brain_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================================================================
-- Mood entries (Stimmung)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  value smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  label text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
CREATE INDEX IF NOT EXISTS brain_mood_entries_user_idx ON public.brain_mood_entries(user_id, entry_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_mood_entries TO authenticated;
GRANT ALL ON public.brain_mood_entries TO service_role;
ALTER TABLE public.brain_mood_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_mood_entries" ON public.brain_mood_entries;
CREATE POLICY "own brain_mood_entries" ON public.brain_mood_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brain_mood_entries_touch ON public.brain_mood_entries;
CREATE TRIGGER brain_mood_entries_touch BEFORE UPDATE ON public.brain_mood_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================================================================
-- Work sessions (Arbeitszeit)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  minutes integer,
  label text,
  note_id uuid REFERENCES public.brain_notes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brain_work_sessions_user_idx ON public.brain_work_sessions(user_id, started_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_work_sessions TO authenticated;
GRANT ALL ON public.brain_work_sessions TO service_role;
ALTER TABLE public.brain_work_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_work_sessions" ON public.brain_work_sessions;
CREATE POLICY "own brain_work_sessions" ON public.brain_work_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS brain_work_sessions_touch ON public.brain_work_sessions;
CREATE TRIGGER brain_work_sessions_touch BEFORE UPDATE ON public.brain_work_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================================================================
-- Import-Journal: verhindert doppelte Vault-Imports
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.brain_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'obsidian',
  source_path text,
  run_id text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_dry_run boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brain_import_log_user_idx ON public.brain_import_log(user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_import_log TO authenticated;
GRANT ALL ON public.brain_import_log TO service_role;
ALTER TABLE public.brain_import_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brain_import_log" ON public.brain_import_log;
CREATE POLICY "own brain_import_log" ON public.brain_import_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
