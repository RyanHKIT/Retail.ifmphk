-- 20260916000008_flow_heatmap_seed.sql
-- Intensity from footfall_daily.in_count. Deterministic. No RNG.

UPDATE public.branches
SET
  floor_plan_url = '/assets/floor-plans/it-cwb-demo.png',
  floor_plan_label_zh = '示範平面圖',
  floor_plan_label_en = 'Demo floor plan'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

-- Remap anchors onto the generated plan (percent of width/height).
-- Adjust numbers once after viewing the PNG if kernels miss labels.
UPDATE public.zones SET anchor_x = 50, anchor_y = 88, anchor_r = 12
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'entrance';
UPDATE public.zones SET anchor_x = 22, anchor_y = 48, anchor_r = 16
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'shelf_a';
UPDATE public.zones SET anchor_x = 52, anchor_y = 42, anchor_r = 14
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'shelf_b';
UPDATE public.zones SET anchor_x = 82, anchor_y = 50, anchor_r = 11
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'fitting_room';
UPDATE public.zones SET anchor_x = 72, anchor_y = 82, anchor_r = 10
  WHERE branch_id = 'a0000000-0000-4000-8000-000000000001' AND zone_key = 'cashier';

INSERT INTO public.heatmap_daily (zone_id, day, visit_count, avg_dwell_sec, intensity)
SELECT
  z.id,
  f.day,
  ROUND(f.in_count * s.share)::int,
  s.dwell,
  CASE
    WHEN MAX(ROUND(f.in_count * s.share)::int) OVER (PARTITION BY f.day) = 0 THEN 0
    ELSE ROUND(f.in_count * s.share)::numeric
         / MAX(ROUND(f.in_count * s.share)::int) OVER (PARTITION BY f.day)
  END
FROM public.footfall_daily f
JOIN public.zones z
  ON z.branch_id = f.branch_id
JOIN (VALUES
  ('entrance',     1.00, 20),
  ('shelf_a',      0.55, 95),
  ('shelf_b',      0.42, 80),
  ('fitting_room', 0.22, 210),
  ('cashier',      0.18, 40)
) AS s(zone_key, share, dwell)
  ON s.zone_key = z.zone_key
WHERE f.branch_id = 'a0000000-0000-4000-8000-000000000001'
ON CONFLICT (zone_id, day) DO UPDATE SET
  visit_count = EXCLUDED.visit_count,
  avg_dwell_sec = EXCLUDED.avg_dwell_sec,
  intensity = EXCLUDED.intensity;
