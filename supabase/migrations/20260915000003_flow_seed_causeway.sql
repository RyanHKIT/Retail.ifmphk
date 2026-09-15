-- =============================================
-- IFMP Retail (Flow pilot) — seed I.T. Causeway Bay
-- Fixed UUIDs so app config / docs can reference deterministically.
-- Auth users are NOT seeded here (created via Dashboard; see scripts/flow-seed-manager.md).
-- =============================================

-- Branch: I.T. Causeway Bay / I.T. 銅鑼灣
INSERT INTO public.branches (id, name_zh, name_en, address, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'I.T. 銅鑼灣',
  'I.T. Causeway Bay',
  'Hong Kong',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Entrances (出入口) — two gates for the pilot floor
INSERT INTO public.entrances (branch_id, name_zh, name_en, sort_order)
VALUES
  ('a0000000-0000-4000-8000-000000000001', '正門', 'Main Entrance', 0),
  ('a0000000-0000-4000-8000-000000000002', '側門', 'Side Entrance', 1)
ON CONFLICT DO NOTHING;

-- Zones (動線熱力) — pilot set, matches Journey zone model (entrance/shelf/fitting/cashier)
INSERT INTO public.zones (branch_id, zone_key, name_zh, name_en, zone_type, anchor_x, anchor_y, anchor_r)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'entrance',     '入口',    'Entrance',    'entrance',     50, 92, 12),
  ('a0000000-0000-4000-8000-000000000001', 'shelf_a',      '貨架 A',  'Shelves A',   'shelf',        18, 48, 16),
  ('a0000000-0000-4000-8000-000000000001', 'shelf_b',      '貨架 B',  'Shelves B',   'shelf',        55, 40, 14),
  ('a0000000-0000-4000-8000-000000000001', 'fitting_room', '試衣間',  'Fitting Room','fitting_room', 85, 55, 10),
  ('a0000000-0000-4000-8000-000000000001', 'cashier',      '收銀台',  'Cashier',     'cashier',      70, 85, 9)
ON CONFLICT (branch_id, zone_key) DO NOTHING;

-- HK holidays for the current + next year (name bilingual)
INSERT INTO public.calendar_days (day, is_holiday, name_zh, name_en)
VALUES
  ('2026-01-01', true, '元旦',        'New Year''s Day'),
  ('2026-02-17', true, '農曆新年',    'Lunar New Year'),
  ('2026-02-18', true, '農曆新年翌日','Lunar New Year (day 2)'),
  ('2026-02-19', true, '農曆新年第三日','Lunar New Year (day 3)'),
  ('2026-04-03', true, '耶穌受難節',  'Good Friday'),
  ('2026-04-04', true, '耶穌受難節翌日','Holy Saturday'),
  ('2026-04-06', true, '復活節星期一','Easter Monday'),
  ('2026-04-07', true, '清明節',      'Ching Ming Festival'),
  ('2026-05-01', true, '勞動節',      'Labour Day'),
  ('2026-05-31', true, '佛誕',        'Buddha''s Birthday'),
  ('2026-06-19', true, '端午節',      'Tuen Ng Festival'),
  ('2026-07-01', true, '香港特別行政區成立紀念日','HKSAR Establishment Day'),
  ('2026-09-25', true, '中秋節翌日',  'Day after Mid-Autumn'),
  ('2026-10-01', true, '國慶日',      'National Day'),
  ('2026-10-19', true, '重陽節',      'Chung Yeung Festival'),
  ('2026-12-25', true, '聖誕節',      'Christmas Day'),
  ('2026-12-26', true, '聖誕節後第一個周日','First weekday after Christmas')
ON CONFLICT (day) DO NOTHING;
