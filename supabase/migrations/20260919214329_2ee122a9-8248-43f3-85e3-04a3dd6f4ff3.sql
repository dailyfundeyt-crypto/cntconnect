CREATE TABLE public.slack_bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_team_id text NOT NULL,
  slack_user_id text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (slack_team_id, slack_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_bot_settings TO authenticated;
GRANT ALL ON public.slack_bot_settings TO service_role;

ALTER TABLE public.slack_bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own Slack bot settings"
ON public.slack_bot_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_slack_bot_settings_updated_at
BEFORE UPDATE ON public.slack_bot_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();