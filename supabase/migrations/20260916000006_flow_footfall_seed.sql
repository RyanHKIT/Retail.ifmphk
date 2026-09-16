-- Deterministic 16-month sample footfall for I.T. Causeway Bay.
-- Magnitudes Uniqlo-plausible; no RNG. Honesty: sample traffic, not live I.T. sensors.
-- Range: 2025-05-01 .. 2026-09-15. Hours 10–21 HK. Weekend ×1.35. HK holiday ×1.5.

INSERT INTO public.calendar_days (day, is_holiday, name_zh, name_en)
VALUES
  ('2025-05-01', true, '勞動節', 'Labour Day'),
  ('2025-05-05', true, '佛誕', 'Buddha''s Birthday'),
  ('2025-05-31', true, '端午節', 'Tuen Ng Festival'),
  ('2025-07-01', true, '香港特別行政區成立紀念日', 'HKSAR Establishment Day'),
  ('2025-10-01', true, '國慶日', 'National Day'),
  ('2025-10-07', true, '中秋節翌日', 'Day after Mid-Autumn'),
  ('2025-10-29', true, '重陽節', 'Chung Yeung Festival'),
  ('2025-12-25', true, '聖誕節', 'Christmas Day'),
  ('2025-12-26', true, '聖誕節後第一個周日', 'First weekday after Christmas')
ON CONFLICT (day) DO NOTHING;

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
  FROM generate_series('2025-05-01'::date, '2026-09-15'::date, interval '1 day') AS d
  CROSS JOIN generate_series(10, 21, 1) AS h
  LEFT JOIN public.calendar_days c ON c.day = d::date
),
computed AS (
  SELECT
    hour_start,
    day,
    hour,
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
  AND hour_start >= timestamptz '2025-05-01 00:00:00+08'
  AND hour_start < timestamptz '2026-09-16 00:00:00+08'
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
JOIN public.entrances e
  ON e.branch_id = h.branch_id
WHERE h.branch_id = 'a0000000-0000-4000-8000-000000000001'
  AND h.hour_start >= timestamptz '2025-05-01 00:00:00+08'
  AND h.hour_start < timestamptz '2026-09-16 00:00:00+08'
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
  AND d.day BETWEEN '2025-05-01' AND '2026-09-15'
ON CONFLICT (branch_id, day, gender, age_group) DO UPDATE SET
  visitor_count = EXCLUDED.visitor_count;

INSERT INTO public.devices (branch_id, name, status, last_seen_at)
SELECT v.branch_id, v.name, v.status, v.last_seen_at
FROM (
  VALUES
    (
      'a0000000-0000-4000-8000-000000000001'::uuid,
      'Cam Main'::text,
      'online'::text,
      timestamptz '2026-09-15 12:00:00+08'
    ),
    (
      'a0000000-0000-4000-8000-000000000001'::uuid,
      'Cam Side',
      'online',
      timestamptz '2026-09-15 12:01:00+08'
    ),
    (
      'a0000000-0000-4000-8000-000000000001'::uuid,
      'Cam Stockroom',
      'offline',
      NULL
    )
) AS v(branch_id, name, status, last_seen_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.devices d
  WHERE d.branch_id = v.branch_id AND d.name = v.name
);
