-- =============================================
-- IFMP Retail (Flow pilot) — roster core schema
-- Adapted from _reference/hk-roster-planner 00001 + 00004
-- Retail adaptation: stations 樓面 | 試衣 | 收銀
-- =============================================

-- ENUMS
CREATE TYPE public.user_role AS ENUM ('owner', 'branch_manager', 'staff');
CREATE TYPE public.roster_status AS ENUM ('draft', 'published');
CREATE TYPE public.swap_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'publish', 'approve_swap', 'reject_swap', 'copy_week');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- BRANCHES
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- EMPLOYEES (staff registry per branch) — retail stations
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name_zh text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  station text NOT NULL DEFAULT '樓面'
    CHECK (station IN ('樓面', '試衣', '收銀')),
  employment_type text NOT NULL DEFAULT 'full_time', -- full_time | part_time
  min_hours_per_week numeric(5,2) NOT NULL DEFAULT 0,
  max_hours_per_week numeric(5,2) NOT NULL DEFAULT 48,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- BRANCH MANAGER ASSIGNMENTS
CREATE TABLE public.branch_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, branch_id)
);
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;

-- SHIFT TEMPLATES
CREATE TABLE public.shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text NOT NULL DEFAULT '#B45309',
  station text NOT NULL DEFAULT '樓面'
    CHECK (station IN ('樓面', '試衣', '收銀')),
  headcount_target integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

-- ROSTER WEEKS
CREATE TABLE public.roster_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  year integer NOT NULL,
  week_number integer NOT NULL,
  week_start date NOT NULL,
  status roster_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id, year, week_number)
);
ALTER TABLE public.roster_weeks ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_week_id uuid NOT NULL REFERENCES public.roster_weeks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_template_id uuid NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- SWAP REQUESTS
CREATE TABLE public.swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requester_assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  target_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  target_assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  is_open_bid boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT '',
  status swap_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HOUR POLICIES (per employee overrides)
CREATE TABLE public.hour_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  min_hours_per_week numeric(5,2) NOT NULL DEFAULT 0,
  max_hours_per_week numeric(5,2) NOT NULL DEFAULT 48,
  hard_block_overtime boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hour_policies ENABLE ROW LEVEL SECURITY;

-- AVAILABILITY NOTES
CREATE TABLE public.availability_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start)
);
ALTER TABLE public.availability_notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AUTO-SYNC PROFILES ON SIGNUP
-- =============================================
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'staff'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- HELPERS (SECURITY DEFINER to avoid RLS recursion)
-- Pattern from MeDo 00001 + 00004
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.user_manages_branch(uid uuid, bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.branch_managers WHERE profile_id = uid AND branch_id = bid
  ) OR (SELECT role FROM public.profiles WHERE id = uid) = 'owner'::user_role;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_branch_id(profile_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.employees WHERE employees.profile_id = profile_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_branch_id(emp_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.employees WHERE id = emp_id;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Owner has full profiles access" ON public.profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));
CREATE POLICY "Branch managers can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'branch_manager');

-- BRANCHES
CREATE POLICY "Authenticated can view active branches" ON public.branches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage branches" ON public.branches
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

-- BRANCH_MANAGERS
CREATE POLICY "Owner can manage branch managers" ON public.branch_managers
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can view own assignments" ON public.branch_managers
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- EMPLOYEES
CREATE POLICY "Owner can manage all employees" ON public.employees
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can manage branch employees" ON public.employees
  FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id))
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));
CREATE POLICY "Staff can view branch employees" ON public.employees
  FOR SELECT TO authenticated USING (
    is_active = true AND (
      branch_id = get_profile_branch_id(auth.uid())
      OR profile_id = auth.uid()
    )
  );

-- SHIFT_TEMPLATES
CREATE POLICY "Owner can manage all shift templates" ON public.shift_templates
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can manage branch shift templates" ON public.shift_templates
  FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id))
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));
CREATE POLICY "Staff can view branch shift templates" ON public.shift_templates
  FOR SELECT TO authenticated USING (true);

-- ROSTER_WEEKS
CREATE POLICY "Owner can manage all roster weeks" ON public.roster_weeks
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can manage branch roster weeks" ON public.roster_weeks
  FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), branch_id))
  WITH CHECK (user_manages_branch(auth.uid(), branch_id));
CREATE POLICY "Staff can view published roster weeks" ON public.roster_weeks
  FOR SELECT TO authenticated USING (status = 'published'::roster_status);

-- ASSIGNMENTS
CREATE POLICY "Owner can manage all assignments" ON public.assignments
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can manage branch assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roster_weeks rw
      WHERE rw.id = roster_week_id
      AND user_manages_branch(auth.uid(), rw.branch_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roster_weeks rw
      WHERE rw.id = roster_week_id
      AND user_manages_branch(auth.uid(), rw.branch_id)
    )
  );
CREATE POLICY "Staff can view published branch assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roster_weeks rw
      WHERE rw.id = assignments.roster_week_id
      AND rw.status = 'published'::roster_status
      AND rw.branch_id = get_profile_branch_id(auth.uid())
    )
  );

-- SWAP_REQUESTS
CREATE POLICY "Owner can manage all swap requests" ON public.swap_requests
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can view and review swap requests" ON public.swap_requests
  FOR ALL TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('owner'::user_role, 'branch_manager'::user_role)
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('owner'::user_role, 'branch_manager'::user_role)
  );
CREATE POLICY "Staff can view own swap requests" ON public.swap_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees e WHERE e.id = target_employee_id AND e.profile_id = auth.uid()
    )
  );
CREATE POLICY "Staff can insert own swap requests" ON public.swap_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e WHERE e.id = requester_employee_id AND e.profile_id = auth.uid()
    )
  );

-- AUDIT_LOGS — manager SELECT only; no client INSERT (write path is server-side / triggers later)
CREATE POLICY "Owner can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'branch_manager'::user_role);

-- HOUR_POLICIES
CREATE POLICY "Owner can manage all hour policies" ON public.hour_policies
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can manage branch hour policies" ON public.hour_policies
  FOR ALL TO authenticated
  USING (user_manages_branch(auth.uid(), get_employee_branch_id(employee_id)))
  WITH CHECK (user_manages_branch(auth.uid(), get_employee_branch_id(employee_id)));
CREATE POLICY "Staff can view own hour policy" ON public.hour_policies
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.profile_id = auth.uid()));

-- AVAILABILITY_NOTES
CREATE POLICY "Owner can view all availability notes" ON public.availability_notes
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);
CREATE POLICY "Branch managers can view branch availability notes" ON public.availability_notes
  FOR SELECT TO authenticated
  USING (user_manages_branch(auth.uid(), get_employee_branch_id(employee_id)));
CREATE POLICY "Staff can manage own availability" ON public.availability_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.profile_id = auth.uid()));
