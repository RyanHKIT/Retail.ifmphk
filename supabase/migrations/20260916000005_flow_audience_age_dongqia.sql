-- Align audience_daily.age_group with DongQia life-stage buckets.
-- Vendor has no year ranges; UI labels 幼兒/兒童/青年/中年/長者/未知.

ALTER TABLE public.audience_daily
  DROP CONSTRAINT audience_daily_age_group_check;

ALTER TABLE public.audience_daily
  ADD CONSTRAINT audience_daily_age_group_check
  CHECK (age_group = ANY (ARRAY[
    'toddler'::text,
    'teenager'::text,
    'youth'::text,
    'middle_aged'::text,
    'elderly'::text,
    'unknown'::text
  ]));
