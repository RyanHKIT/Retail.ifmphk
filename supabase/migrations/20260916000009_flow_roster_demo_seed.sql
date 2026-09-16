-- 20260916000009_flow_roster_demo_seed.sql
-- Demo roster for I.T. Causeway Bay. Not real HRIS. Never 优衣库.
-- Branch: a0000000-0000-4000-8000-000000000001
-- UUID prefix: b0000000-0000-4000-8000-

-- ----- employees (8) -----
INSERT INTO public.employees (
  id, profile_id, branch_id, name_zh, name_en, phone,
  station, employment_type, min_hours_per_week, max_hours_per_week, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000001', NULL, 'a0000000-0000-4000-8000-000000000001',
   '陳嘉欣', 'Karen Chan', '51230001', '樓面', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000002', NULL, 'a0000000-0000-4000-8000-000000000001',
   '林子軒', 'Jason Lam', '51230002', '樓面', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000003', NULL, 'a0000000-0000-4000-8000-000000000001',
   '黃詩琪', 'Suki Wong', '51230003', '樓面', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000004', NULL, 'a0000000-0000-4000-8000-000000000001',
   '周浩然', 'Howard Chow', '51230004', '樓面', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000005', NULL, 'a0000000-0000-4000-8000-000000000001',
   '吳詠琳', 'Wing Wu', '51230005', '試衣', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000006', NULL, 'a0000000-0000-4000-8000-000000000001',
   '鄭曉彤', 'Hiu Cheng', '51230006', '試衣', 'part_time', 12, 24, true),
  ('b0000000-0000-4000-8000-000000000007', NULL, 'a0000000-0000-4000-8000-000000000001',
   '馬偉明', 'Wai Ma', '51230007', '收銀', 'full_time', 40, 48, true),
  ('b0000000-0000-4000-8000-000000000008', NULL, 'a0000000-0000-4000-8000-000000000001',
   '李芷晴', 'Chi Lee', '51230008', '收銀', 'part_time', 12, 24, true)
ON CONFLICT (id) DO NOTHING;

-- ----- templates (6): store 10:00–21:00 -----
INSERT INTO public.shift_templates (
  id, branch_id, name, start_time, end_time, color, station, headcount_target, is_active
) VALUES
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001',
   '樓面日間', '10:00', '18:00', '#3b82f6', '樓面', 2, true),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001',
   '樓面晚間', '18:00', '21:00', '#1d4ed8', '樓面', 2, true),
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001',
   '試衣日間', '10:00', '18:00', '#7c3aed', '試衣', 1, true),
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001',
   '試衣晚間', '18:00', '21:00', '#6d28d9', '試衣', 1, true),
  ('b0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001',
   '收銀日間', '10:00', '18:00', '#0f766e', '收銀', 1, true),
  ('b0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001',
   '收銀晚間', '18:00', '21:00', '#115e59', '收銀', 1, true)
ON CONFLICT (id) DO NOTHING;

-- ----- weeks: ISO 37 published, ISO 38 draft -----
INSERT INTO public.roster_weeks (
  id, branch_id, year, week_number, week_start, status, published_at, published_by
) VALUES
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001',
   2026, 37, '2026-09-07', 'published', '2026-09-13T21:00:00+08:00', NULL),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001',
   2026, 38, '2026-09-14', 'draft', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----- hour policies -----
INSERT INTO public.hour_policies (
  id, employee_id, min_hours_per_week, max_hours_per_week, hard_block_overtime
) VALUES
  ('b0000000-0000-4000-8000-000000000041', 'b0000000-0000-4000-8000-000000000001',
   40, 40, false),
  ('b0000000-0000-4000-8000-000000000042', 'b0000000-0000-4000-8000-000000000002',
   40, 48, true)
ON CONFLICT (id) DO NOTHING;

-- ----- availability (soft): Suki, Saturday afternoon of the draft week -----
INSERT INTO public.availability_notes (
  id, employee_id, week_start, notes, unavailable_slots
) VALUES (
  'b0000000-0000-4000-8000-000000000051',
  'b0000000-0000-4000-8000-000000000003',
  '2026-09-14',
  '週六下午課程',
  '[{"dayOfWeek":5,"allDay":false,"startTime":"12:00","endTime":"18:00"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ----- assignments (both weeks) -----
-- Pattern:
--   Mon–Fri: e1+e2 樓面日間; e3+e4 樓面晚間; e5 試衣日間; e6 試衣晚間; e7 收銀日間; e8 收銀晚間
--   Sat: e1+e3 樓面日間 (e1 → soft overtime vs policy max 40); e5 試衣日間; e7 收銀日間; e4 樓面晚間
--   Sun: e2+e4 樓面日間 (e2 = 48h exact, not > max); e6 試衣日間; e8 收銀日間; e3 樓面晚間
-- Named IDs for the pending swap (draft week only):
--   e1 Mon 2026-09-14 樓面日間 = ...201
--   e2 Wed 2026-09-16 樓面日間 = ...202

WITH days AS (
  SELECT d::date AS work_date
  FROM generate_series('2026-09-07'::date, '2026-09-20'::date, interval '1 day') AS d
),
pattern AS (
  SELECT
    e.id AS employee_id,
    t.id AS shift_template_id,
    days.work_date,
    CASE WHEN days.work_date < DATE '2026-09-14'
         THEN 'b0000000-0000-4000-8000-000000000021'::uuid
         ELSE 'b0000000-0000-4000-8000-000000000022'::uuid
    END AS roster_week_id
  FROM days
  CROSS JOIN (VALUES
    -- weekday base (Mon=1 .. Fri=5)
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000014'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[1,2,3,4,5]),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000016'::uuid, ARRAY[1,2,3,4,5]),
    -- Saturday = 6
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[6]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[6]),
    -- Sunday = 7
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000011'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000013'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000015'::uuid, ARRAY[7]),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000012'::uuid, ARRAY[7])
  ) AS x(emp_id, tmpl_id, dows)
  JOIN public.employees e ON e.id = x.emp_id
  JOIN public.shift_templates t ON t.id = x.tmpl_id
  WHERE EXTRACT(ISODOW FROM days.work_date)::int = ANY (x.dows)
)
INSERT INTO public.assignments (
  id, roster_week_id, employee_id, shift_template_id, work_date, notes
)
SELECT
  CASE
    WHEN p.employee_id = 'b0000000-0000-4000-8000-000000000001'
     AND p.work_date = DATE '2026-09-14'
     AND p.shift_template_id = 'b0000000-0000-4000-8000-000000000011'
      THEN 'b0000000-0000-4000-8000-000000000201'::uuid
    WHEN p.employee_id = 'b0000000-0000-4000-8000-000000000002'
     AND p.work_date = DATE '2026-09-16'
     AND p.shift_template_id = 'b0000000-0000-4000-8000-000000000011'
      THEN 'b0000000-0000-4000-8000-000000000202'::uuid
    ELSE ('b0000000-0000-4000-8000-' || lpad((3000 + row_number() OVER (
      ORDER BY p.work_date, p.employee_id, p.shift_template_id
    ))::text, 12, '0'))::uuid
  END,
  p.roster_week_id,
  p.employee_id,
  p.shift_template_id,
  p.work_date,
  ''
FROM pattern p
ON CONFLICT (id) DO NOTHING;

-- ----- pending targeted swap on the draft week -----
INSERT INTO public.swap_requests (
  id, requester_employee_id, requester_assignment_id,
  target_employee_id, target_assignment_id,
  is_open_bid, reason, status, review_notes
) VALUES (
  'b0000000-0000-4000-8000-000000000031',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000201',
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000202',
  false,
  '週三家庭事務，請求對調周一',
  'pending',
  ''
)
ON CONFLICT (id) DO NOTHING;
