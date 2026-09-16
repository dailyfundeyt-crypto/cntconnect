-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Spaces
CREATE TABLE public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'My Space',
  icon text NOT NULL DEFAULT 'sparkles',
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT ALL ON public.spaces TO service_role;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own spaces" ON public.spaces FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER spaces_touch BEFORE UPDATE ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Documents (nested pages)
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  icon text NOT NULL DEFAULT 'file-text',
  content text NOT NULL DEFAULT '',
  is_favorite boolean NOT NULL DEFAULT false,
  is_trashed boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX documents_space_idx ON public.documents(space_id);
CREATE INDEX documents_parent_idx ON public.documents(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Collections (database tables)
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled table',
  icon text NOT NULL DEFAULT 'table',
  is_trashed boolean NOT NULL DEFAULT false,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own collections" ON public.collections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER collections_touch BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Fields
CREATE TABLE public.collection_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Field',
  type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collection_fields_collection_idx ON public.collection_fields(collection_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_fields TO authenticated;
GRANT ALL ON public.collection_fields TO service_role;
ALTER TABLE public.collection_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fields" ON public.collection_fields FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rows
CREATE TABLE public.collection_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collection_rows_collection_idx ON public.collection_rows(collection_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_rows TO authenticated;
GRANT ALL ON public.collection_rows TO service_role;
ALTER TABLE public.collection_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rows" ON public.collection_rows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER collection_rows_touch BEFORE UPDATE ON public.collection_rows FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Views
CREATE TABLE public.collection_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Table',
  kind text NOT NULL DEFAULT 'table',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collection_views_collection_idx ON public.collection_views(collection_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_views TO authenticated;
GRANT ALL ON public.collection_views TO service_role;
ALTER TABLE public.collection_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own views" ON public.collection_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);