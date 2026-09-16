-- =============================================
-- IFMP Retail (Flow pilot) — AI insights and usage
--
-- Two tables, written only by the edge functions under the service role:
--
--   ai_insights  cached analysis prose, keyed by branch + tab + day + locale
--                + prompt version. Readable by the branch's managers.
--   ai_usage     one row per model call, for cost attribution and for the
--                per-user hourly rate limit (which counts rows in a window
--                rather than maintaining a separate counter table).
--
-- No row here contains tenant measurement data. ai_insights holds generated
-- prose; ai_usage holds token counts and model names.
-- =============================================

-- =============================================
-- AI INSIGHTS (cache)
-- =============================================
CREATE TABLE public.ai_insights (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  tab_key        text NOT NULL,
  day            date NOT NULL,
  locale         text NOT NULL,
  prompt_version integer NOT NULL DEFAULT 1,
  -- Hash of the aggregate payload the prose was derived from. When the numbers
  -- move, this changes, so a stale summary is regenerated instead of served.
  input_digest   text NOT NULL,
  -- The validated Insight object. jsonb so the shape can gain fields without
  -- a migration; the shape itself is enforced in the edge function.
  body           jsonb NOT NULL,
  model          text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- The cache key. A second generation for the same day is an upsert, not a row.
CREATE UNIQUE INDEX ai_insights_cache_key
  ON public.ai_insights (branch_id, tab_key, day, locale, prompt_version);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Managers read their own branch's cached prose. Writes come from the service
-- role, which bypasses RLS, so no INSERT/UPDATE policy is granted to clients:
-- a browser must not be able to author an insight.
--
-- Helpers are schema-qualified: `private` is not on the default search_path
-- ("$user", public, extensions), so an unqualified call fails to resolve.
CREATE POLICY "Owner can view all ai insights" ON public.ai_insights
  FOR SELECT TO authenticated
  USING (private.get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Branch managers can view branch ai insights" ON public.ai_insights
  FOR SELECT TO authenticated
  USING (private.user_manages_branch(auth.uid(), branch_id));

-- =============================================
-- AI USAGE (cost + rate limit)
-- =============================================
CREATE TABLE public.ai_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  -- 'insight' | 'ask'. Kept as text with a check rather than an enum so adding
  -- a surface later is a one-line change, not a type migration.
  kind          text NOT NULL CHECK (kind IN ('insight', 'ask')),
  tab_key       text,
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  duration_ms   integer NOT NULL DEFAULT 0,
  -- 'ok' | 'cached' | 'error'. Cached hits are recorded too, so the ratio of
  -- paid calls to views stays visible.
  outcome       text NOT NULL DEFAULT 'ok',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Serves the hourly rate-limit window count.
CREATE INDEX ai_usage_user_window
  ON public.ai_usage (user_id, kind, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Owner only. Individual managers do not need to see their own usage, and
-- exposing other users' rows would leak activity patterns.
CREATE POLICY "Owner can view all ai usage" ON public.ai_usage
  FOR SELECT TO authenticated
  USING (private.get_user_role(auth.uid()) = 'owner'::user_role);

-- =============================================
-- RATE LIMIT HELPER
-- =============================================
-- Counts this user's calls of one kind inside the trailing window. SECURITY
-- DEFINER so it can read ai_usage rows the caller cannot select; exposed in
-- `private` for the same reason as the other helpers, keeping it off the
-- PostgREST /rest/v1/rpc/* surface.
CREATE OR REPLACE FUNCTION private.ai_calls_in_window(
  uid uuid,
  p_kind text,
  p_window interval
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.ai_usage
  WHERE user_id = uid
    AND kind = p_kind
    AND created_at > now() - p_window;
$$;

REVOKE ALL ON FUNCTION private.ai_calls_in_window(uuid, text, interval)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.ai_calls_in_window(uuid, text, interval)
  TO authenticated;
