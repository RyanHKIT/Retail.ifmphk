-- Extend sample footfall one day so HK "today" (2026-09-16) widgets are not empty.
-- Same deterministic formula as 20260916000006.

WITH hours AS (
  SELECT
    d::date AS day,
    h AS hour,
    (
      (d::date + make_time(h, 0, 0)) AT TIME ZONE 'Asia/Hong_Kong'
    ) AS hour_start,
    CASE WHEN extract(dow FROM d) IN (0, 6) THEN 1.35 ELSE 1.0 END AS weekend,
    CASE WHEN coalesce(c.is_holiday, false) THEN 1.5 ELSE 1.0 END AS holiday,
    CASE
      WHEN h = 13 THEN 1.60
      WHEN h = 19 THEN 1.70
      WHEN h BETWEEN 12 AND 14 THEN 1.30
      WHEN h BETWEEN 18 AND 20 THEN 1.40
      ELSE 1.00
    END AS peak,
    1 + (((extract(doy FROM d)::int * 13 + h * 7) % 11) - 5) * 0.02 AS wobble
  FROM generate_series('2026-09-16'::date, '2026-09-16'::date, interval '1 day') AS d
  CROSS JOIN generate_series(10, 21, 1) AS h
  LEFT JOIN public.calendar_days c ON c.day = d::date
),
computed AS (
  SELECT
    hour_start,
    greatest(0, round(180 * weekend * holiday * peak * wobble))::int AS in_count
  FROM hours
)
INSERT INTO public.footfall_hourly (
  branch_id, hour_start, in_count, out_count, passersby_count, unique_visitors
)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  hour_start,
  in_count,
  round(in_count * 0.96)::int,
  round(in_count * 1.60)::int,
  round(in_count * 0.82)::int
FROM computed
ON CONFLICT (branch_id, hour_start) DO UPDATE SET
  in_count = EXCLUDED.in_count,
  out_count = EXCLUDED.out_count,
  passersby_count = EXCLUDED.passersby_count,
  unique_visitors = EXCLUDED.unique_visitors;

INSERT INTO public.footfall_daily (
  branch_id, day, in_count, out_count, passersby_count, unique_visitors
)
SELECT
  'a0000000-0000-4000-8000-000000000001'::uuid,
  (hour_start AT TIME ZONE 'Asia/Hong_Kong')::date,
  sum(in_count)::int,
  sum(out_count)::int,
  sum(passersby_count)::int,
  round(sum(unique_visitors) * 0.72)::int
FROM public.footfall_hourly
WHERE branch_id = 'a0000000-0000-4000-8000-000000000001'
  AND hour_start >= timestamptz '2026-09-16 00:00:00+08'
  AND hour_start < timestamptz '2026-09-17 00:00:00+08'
GROUP BY 1, 2
ON CONFLICT (branch_id, day) DO UPDATE SET
  in_count = EXCLUDED.in_count,
  out_count = EXCLUDED.out_count,
  passersby_count = EXCLUDED.passersby_count,
  unique_visitors = EXCLUDED.unique_visitors;

INSERT INTO public.entrance_hourly (entrance_id, hour_start, in_count, out_count)
SELECT
  e.id,
  h.hour_start,
  CASE WHEN e.sort_order = 0
    THEN round(h.in_count * 0.70)::int
    ELSE h.in_count - round(h.in_count * 0.70)::int
  END,
  CASE WHEN e.sort_order = 0
    THEN round(h.out_count * 0.70)::int
    ELSE h.out_count - round(h.out_count * 0.70)::int
  END
FROM public.footfall_hourly h
JOIN public.entrances e ON e.branch_id = h.branch_id
WHERE h.branch_id = 'a0000000-0000-4000-8000-000000000001'
  AND h.hour_start >= timestamptz '2026-09-16 00:00:00+08'
  AND h.hour_start < timestamptz '2026-09-17 00:00:00+08'
ON CONFLICT (entrance_id, hour_start) DO UPDATE SET
  in_count = EXCLUDED.in_count,
  out_count = EXCLUDED.out_count;

INSERT INTO public.audience_daily (branch_id, day, gender, age_group, visitor_count)
SELECT branch_id, day, gender, age_group, visitor_count
FROM public.footfall_daily d
CROSS JOIN LATERAL (
  VALUES
    ('male'::text, 'unknown'::text, round(d.unique_visitors * 0.45)::int),
    ('female', 'unknown', round(d.unique_visitors * 0.54)::int),
    ('unknown', 'unknown', d.unique_visitors
      - round(d.unique_visitors * 0.45)::int
      - round(d.unique_visitors * 0.54)::int),
    ('unknown', 'toddler', round(d.unique_visitors * 0.04)::int),
    ('unknown', 'teenager', round(d.unique_visitors * 0.08)::int),
    ('unknown', 'youth', round(d.unique_visitors * 0.42)::int),
    ('unknown', 'middle_aged', round(d.unique_visitors * 0.28)::int),
    ('unknown', 'elderly', round(d.unique_visitors * 0.12)::int)
) AS a(gender, age_group, visitor_count)
WHERE d.branch_id = 'a0000000-0000-4000-8000-000000000001'
  AND d.day = '2026-09-16'
ON CONFLICT (branch_id, day, gender, age_group) DO UPDATE SET
  visitor_count = EXCLUDED.visitor_count;
