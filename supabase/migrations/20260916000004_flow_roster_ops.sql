-- =============================================
-- IFMP Retail (Flow pilot) — roster ops: server-side audit + publish/copy/swap RPCs
-- Spec: docs/superpowers/specs/2026-09-16-ifmp-flow-roster-design.md §4
-- All functions in `private` (not exposed to PostgREST); RPC surface = 4 grants.
-- =============================================

-- Additive column (MeDo 00008 parity; staff entry UI deferred)
ALTER TABLE public.availability_notes
  ADD COLUMN IF NOT EXISTS unavailable_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =============================================
-- 1. AUDIT TRIGGER (populates old_data/new_data — MeDo gap fix)
-- =============================================
CREATE OR REPLACE FUNCTION private.flow_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_rec uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD); -- ETL / service-role writes: no audit row
  END IF;
  IF current_setting('flow.skip_audit', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD); -- caller writes its own semantic row (publish/copy/swap)
  END IF;
  v_old := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_rec := (to_jsonb(COALESCE(NEW, OLD)) ->> 'id')::uuid;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END::public.audit_action,
    TG_TABLE_NAME,
    v_rec,
    v_old,
    v_new
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS flow_audit_assignments ON public.assignments;
CREATE TRIGGER flow_audit_assignments AFTER INSERT OR UPDATE OR DELETE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();
DROP TRIGGER IF EXISTS flow_audit_roster_weeks ON public.roster_weeks;
CREATE TRIGGER flow_audit_roster_weeks AFTER INSERT OR UPDATE OR DELETE ON public.roster_weeks
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();
DROP TRIGGER IF EXISTS flow_audit_employees ON public.employees;
CREATE TRIGGER flow_audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();
DROP TRIGGER IF EXISTS flow_audit_shift_templates ON public.shift_templates;
CREATE TRIGGER flow_audit_shift_templates AFTER INSERT OR UPDATE OR DELETE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();
DROP TRIGGER IF EXISTS flow_audit_swap_requests ON public.swap_requests;
CREATE TRIGGER flow_audit_swap_requests AFTER INSERT OR UPDATE OR DELETE ON public.swap_requests
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();
DROP TRIGGER IF EXISTS flow_audit_hour_policies ON public.hour_policies;
CREATE TRIGGER flow_audit_hour_policies AFTER INSERT OR UPDATE OR DELETE ON public.hour_policies
  FOR EACH ROW EXECUTE FUNCTION private.flow_audit();

-- =============================================
-- 2. CONFLICT ENGINE (SQL mirror of lib/roster/conflicts.ts)
--    Rules: double_booking(hard), overtime_hard(hard), overtime(soft),
--           below_min(soft), availability(soft). Effective limits:
--           hour_policies row when present else employees columns.
-- =============================================
CREATE OR REPLACE FUNCTION private.roster_conflicts(wid uuid)
RETURNS TABLE (employee_id uuid, work_date date, kind text, severity text, detail jsonb)
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  WITH week AS (
    SELECT id, week_start FROM public.roster_weeks WHERE id = wid
  ),
  wa AS (
    SELECT a.id AS assignment_id,
           a.employee_id,
           a.work_date,
           st.start_time::interval AS start_int,
           CASE WHEN st.end_time <= st.start_time
                THEN st.end_time::interval + interval '24 hours'
                ELSE st.end_time::interval END AS end_eff,
           CASE WHEN st.end_time <= st.start_time
                THEN (st.end_time::interval + interval '24 hours') - st.start_time::interval
                ELSE st.end_time::interval - st.start_time::interval END AS dur
    FROM public.assignments a
    JOIN public.shift_templates st ON st.id = a.shift_template_id
    JOIN week w ON w.id = a.roster_week_id
  ),
  eff AS (
    SELECT e.id AS employee_id,
           COALESCE(hp.min_hours_per_week, e.min_hours_per_week) AS min_h,
           COALESCE(hp.max_hours_per_week, e.max_hours_per_week) AS max_h,
           COALESCE(hp.hard_block_overtime, false) AS hard_block
    FROM public.employees e
    LEFT JOIN public.hour_policies hp ON hp.employee_id = e.id
  ),
  weekly AS (
    SELECT wa.employee_id,
           SUM(EXTRACT(EPOCH FROM wa.dur)) / 3600.0 AS hours,
           COUNT(*) AS shifts
    FROM wa
    GROUP BY wa.employee_id
  )
  -- double booking (hard)
  SELECT x.employee_id, x.work_date, 'double_booking', 'hard',
         jsonb_build_object('a', x.assignment_id, 'b', y.assignment_id)
  FROM wa x JOIN wa y
    ON x.employee_id = y.employee_id AND x.work_date = y.work_date AND x.assignment_id < y.assignment_id
   AND x.start_int < y.end_eff AND y.start_int < x.end_eff
  UNION ALL
  -- overtime hard / soft
  SELECT wq.employee_id, (SELECT week_start FROM week), 
         CASE WHEN ef.hard_block THEN 'overtime_hard' ELSE 'overtime' END,
         CASE WHEN ef.hard_block THEN 'hard' ELSE 'soft' END,
         jsonb_build_object('hours', round(wq.hours::numeric, 2), 'max', ef.max_h)
  FROM weekly wq JOIN eff ef ON ef.employee_id = wq.employee_id
  WHERE wq.hours > ef.max_h
  UNION ALL
  -- below min (soft)
  SELECT wq.employee_id, (SELECT week_start FROM week), 'below_min', 'soft',
         jsonb_build_object('hours', round(wq.hours::numeric, 2), 'min', ef.min_h)
  FROM weekly wq JOIN eff ef ON ef.employee_id = wq.employee_id
  WHERE wq.shifts > 0 AND wq.hours < ef.min_h
  UNION ALL
  -- availability overlap (soft)
  SELECT wa.employee_id, wa.work_date, 'availability', 'soft',
         jsonb_build_object('slot', s.slot)
  FROM wa
  JOIN public.availability_notes an
    ON an.employee_id = wa.employee_id
   AND an.week_start = (SELECT week_start FROM week)
  CROSS JOIN LATERAL jsonb_array_elements(an.unavailable_slots) AS s(slot)
  WHERE (EXTRACT(ISODOW FROM wa.work_date)::int - 1) = (s.slot ->> 'dayOfWeek')::int
    AND (
      COALESCE((s.slot ->> 'allDay')::boolean, false)
      OR (
        wa.start_int < CASE WHEN (s.slot ->> 'endTime')::time <= (s.slot ->> 'startTime')::time
                            THEN (s.slot ->> 'endTime')::time::interval + interval '24 hours'
                            ELSE (s.slot ->> 'endTime')::time::interval END
        AND (s.slot ->> 'startTime')::time::interval < wa.end_eff
      )
    );
$$;

-- =============================================
-- 3. PUBLISH (hard conflicts block; semantic audit row)
-- =============================================
CREATE OR REPLACE FUNCTION private.publish_roster_week(wid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_branch uuid;
  v_status public.roster_status;
  v_hard integer;
BEGIN
  SELECT branch_id, status INTO v_branch, v_status
  FROM public.roster_weeks WHERE id = wid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE 'NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF NOT private.user_manages_branch(auth.uid(), v_branch) THEN
    RAISE 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE 'NOT_DRAFT' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_hard
  FROM private.roster_conflicts(wid) c WHERE c.severity = 'hard';
  IF v_hard > 0 THEN
    RAISE 'HARD_CONFLICT' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('flow.skip_audit', 'on', true);
  UPDATE public.roster_weeks
  SET status = 'published', published_at = now(), published_by = auth.uid()
  WHERE id = wid;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, notes)
  VALUES (auth.uid(), 'publish', 'roster_weeks', wid, '');
END;
$$;

-- =============================================
-- 4. UNPUBLISH (back to draft; trigger writes 'update' row)
-- =============================================
CREATE OR REPLACE FUNCTION private.unpublish_roster_week(wid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_branch uuid;
BEGIN
  SELECT branch_id INTO v_branch FROM public.roster_weeks WHERE id = wid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE 'NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF NOT private.user_manages_branch(auth.uid(), v_branch) THEN
    RAISE 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.roster_weeks
  SET status = 'draft', published_at = NULL, published_by = NULL
  WHERE id = wid;
END;
$$;

-- =============================================
-- 5. COPY WEEK (bulk shift by week delta; one semantic audit row)
-- =============================================
CREATE OR REPLACE FUNCTION private.copy_roster_week(src uuid, dst uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_src_branch uuid; v_dst_branch uuid;
  v_src_start date; v_dst_start date;
  v_n integer;
BEGIN
  SELECT branch_id, week_start INTO v_src_branch, v_src_start
  FROM public.roster_weeks WHERE id = src FOR UPDATE;
  IF NOT FOUND THEN RAISE 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  SELECT branch_id, week_start INTO v_dst_branch, v_dst_start
  FROM public.roster_weeks WHERE id = dst FOR UPDATE;
  IF NOT FOUND THEN RAISE 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF NOT private.user_manages_branch(auth.uid(), v_dst_branch) THEN
    RAISE 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;
  IF v_src_branch <> v_dst_branch THEN
    RAISE 'CROSS_BRANCH' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('flow.skip_audit', 'on', true);
  INSERT INTO public.assignments (roster_week_id, employee_id, shift_template_id, work_date, notes, created_by)
  SELECT dst, a.employee_id, a.shift_template_id, a.work_date + (v_dst_start - v_src_start), a.notes, auth.uid()
  FROM public.assignments a WHERE a.roster_week_id = src;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, notes)
  VALUES (auth.uid(), 'copy_week', 'roster_weeks', dst, 'src=' || src::text || ' rows=' || v_n);
  RETURN v_n;
END;
$$;

-- =============================================
-- 6. SWAP REVIEW (approve targeted swap EXCHANGES assignments — MeDo PRD promise)
-- =============================================
CREATE OR REPLACE FUNCTION private.review_swap_request(sid uuid, approve boolean, notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_swap public.swap_requests;
  v_branch uuid;
  v_emp_a uuid; v_emp_b uuid;
BEGIN
  SELECT * INTO v_swap FROM public.swap_requests WHERE id = sid FOR UPDATE;
  IF NOT FOUND THEN RAISE 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF v_swap.status <> 'pending' THEN RAISE 'NOT_PENDING' USING ERRCODE = 'P0001'; END IF;
  SELECT branch_id INTO v_branch FROM public.employees WHERE id = v_swap.requester_employee_id;
  IF NOT private.user_manages_branch(auth.uid(), v_branch) THEN
    RAISE 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  IF approve AND NOT v_swap.is_open_bid AND v_swap.target_assignment_id IS NOT NULL THEN
    -- exchange employee_id between the two assignments, one transaction
    SELECT employee_id INTO v_emp_a FROM public.assignments WHERE id = v_swap.requester_assignment_id FOR UPDATE;
    SELECT employee_id INTO v_emp_b FROM public.assignments WHERE id = v_swap.target_assignment_id FOR UPDATE;
    PERFORM set_config('flow.skip_audit', 'on', true);
    UPDATE public.assignments SET employee_id = v_emp_b WHERE id = v_swap.requester_assignment_id;
    UPDATE public.assignments SET employee_id = v_emp_a WHERE id = v_swap.target_assignment_id;
  END IF;

  PERFORM set_config('flow.skip_audit', 'on', true);
  UPDATE public.swap_requests
  SET status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END::public.swap_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = COALESCE(notes, '')
  WHERE id = sid;
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, notes)
  VALUES (auth.uid(),
          CASE WHEN approve THEN 'approve_swap' ELSE 'reject_swap' END::public.audit_action,
          'swap_requests', sid, COALESCE(notes, ''));
END;
$$;

-- =============================================
-- 7. GRANTS — intended RPC surface only
-- =============================================
GRANT EXECUTE ON FUNCTION private.publish_roster_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.unpublish_roster_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.copy_roster_week(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.review_swap_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.flow_audit() TO authenticated;
