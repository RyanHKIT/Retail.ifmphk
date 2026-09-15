-- =============================================
-- IFMP Retail (Flow pilot) — footfall / 主控台 core schema
-- Data strategy: ETL-only writes (service role / SQL);
-- browser clients are SELECT-only via RLS.
-- Display tenant: I.T. Causeway Bay (numbers from 北京优衣库-period traffic, relabeled — never show 优衣库 in UI)
-- =============================================

-- ENTRANCES (出入口)
CREATE TABLE public.entrances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name_zh text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entrances ENABLE ROW LEVEL SECURITY;

-- HOURLY FOOTFALL (當日分時 + building blocks)
CREATE TABLE public.footfall_hourly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  hour_start timestamptz NOT NULL,
  in_count int NOT NULL DEFAULT 0,
  out_count int NOT NULL DEFAULT 0,
  passersby_count int NOT NULL DEFAULT 0,
  unique_visitors int NOT NULL DEFAULT 0, -- hourly deduped detections
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, hour_start)
);
ALTER TABLE public.footfall_hourly ENABLE ROW LEVEL SECURITY;

-- DAILY FOOTFALL (當月每日 / 同期對比 base)
CREATE TABLE public.footfall_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  day date NOT NULL,
  in_count int NOT NULL DEFAULT 0,
  out_count int NOT NULL DEFAULT 0,
  passersby_count int NOT NULL DEFAULT 0,
  unique_visitors int NOT NULL DEFAULT 0, -- 今日去重客流 = unique visitors (NOT 回頭客)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, day)
);
ALTER TABLE public.footfall_daily ENABLE ROW LEVEL SECURITY;

-- ENTRANCE HOURLY (出入口客流 per gate)
CREATE TABLE public.entrance_hourly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrance_id uuid NOT NULL REFERENCES public.entrances(id) ON DELETE CASCADE,
  hour_start timestamptz NOT NULL,
  in_count int NOT NULL DEFAULT 0,
  out_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entrance_id, hour_start)
);
ALTER TABLE public.entrance_hourly ENABLE ROW LEVEL SECURITY;

-- AUDIENCE DAILY (客群畫像: gender × age group)
CREATE TABLE public.audience_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  day date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'unknown')),
  age_group text NOT NULL CHECK (age_group IN ('0-17', '18-24', '25-34', '35-44', '45-54', '55+')),
  visitor_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, day, gender, age_group)
);
ALTER TABLE public.audience_daily ENABLE ROW LEVEL SECURITY;

-- CALENDAR DAYS (節假日客流分析 — HK holidays)
CREATE TABLE public.calendar_days (
  day date PRIMARY KEY,
  is_holiday boolean NOT NULL DEFAULT false,
  name_zh text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT ''
);
ALTER TABLE public.calendar_days ENABLE ROW LEVEL SECURITY;

-- ZONES (動線熱力 geometry)
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  zone_key text NOT NULL,
  name_zh text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  zone_type text NOT NULL DEFAULT 'shelf', -- entrance | shelf | fitting_room | cashier
  anchor_x numeric NOT NULL,               -- % of floorplan width
  anchor_y numeric NOT NULL,               -- % of floorplan height
  anchor_r numeric NOT NULL DEFAULT 10,    -- kernel radius %
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, zone_key)
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- HEATMAP DAILY (zone intensity per day)
CREATE TABLE public.heatmap_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  day date NOT NULL,
  visit_count int NOT NULL DEFAULT 0,
  avg_dwell_sec numeric NOT NULL DEFAULT 0,
  intensity numeric NOT NULL DEFAULT 0 CHECK (intensity >= 0 AND intensity <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, day)
);
ALTER TABLE public.heatmap_daily ENABLE ROW LEVEL SECURITY;

-- DEVICES (設備 stub)
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'degraded')),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- ALERTS (主控台 exceptions)
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title_zh text NOT NULL,
  title_en text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Floorplan fields on branches (new AI floorplan later; not legacy fake JSON)
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS floor_plan_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_plan_label_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor_plan_label_en text NOT NULL DEFAULT '';

-- =============================================
-- RLS POLICIES
-- Manager: SELECT via branch assignment (user_manages_branch helper from 00001).
-- Writes: NO client INSERT/UPDATE/DELETE policies — ETL-only (service role bypasses RLS).
-- =============================================

-- ENTRANCES
CREATE POLICY "Managers can view branch entrances" ON public.entrances
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- FOOTFALL_HOURLY
CREATE POLICY "Managers can view branch hourly footfall" ON public.footfall_hourly
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- FOOTFALL_DAILY
CREATE POLICY "Managers can view branch daily footfall" ON public.footfall_daily
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- ENTRANCE_HOURLY
CREATE POLICY "Managers can view branch entrance hourly" ON public.entrance_hourly
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.entrances e
      WHERE e.id = entrance_id
      AND user_manages_branch(auth.uid(), e.branch_id)
    )
  );

-- AUDIENCE_DAILY
CREATE POLICY "Managers can view branch audience" ON public.audience_daily
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- CALENDAR_DAYS
CREATE POLICY "Managers can view calendar" ON public.calendar_days
  FOR SELECT TO authenticated USING (true);

-- ZONES
CREATE POLICY "Managers can view branch zones" ON public.zones
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- HEATMAP_DAILY
CREATE POLICY "Managers can view branch heatmap" ON public.heatmap_daily
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = zone_id
      AND user_manages_branch(auth.uid(), z.branch_id)
    )
  );

-- DEVICES
CREATE POLICY "Managers can view branch devices" ON public.devices
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));

-- ALERTS
CREATE POLICY "Managers can view branch alerts" ON public.alerts
  FOR SELECT TO authenticated USING (user_manages_branch(auth.uid(), branch_id));
