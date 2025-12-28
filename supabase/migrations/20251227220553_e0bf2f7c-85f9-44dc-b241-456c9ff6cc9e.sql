-- FAZA 2 & 3: Kreiranje tabela i RLS pravila

-- Enum za role korisnika
CREATE TYPE public.user_role AS ENUM ('worker', 'admin');

-- Enum za status smene/izostanka
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Enum za tip smene (1, 2, 3)
CREATE TYPE public.shift_type AS ENUM ('1', '2', '3');

-- Tabela users (profile table)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela shifts (smene)
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type shift_type NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Tabela absences (izostanci)
CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  replacement_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Helper function: Get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ========== USERS RLS ==========
-- Everyone can read all users (needed for replacement dropdown)
CREATE POLICY "Users are viewable by authenticated users"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Admin can update any user
CREATE POLICY "Admins can update any user"
ON public.users FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Insert handled by trigger

-- ========== SHIFTS RLS ==========
-- Workers can only see their own shifts
CREATE POLICY "Workers see own shifts"
ON public.shifts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_admin()
);

-- Workers can insert shifts only for themselves
CREATE POLICY "Workers insert own shifts"
ON public.shifts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Workers can update only pending shifts
CREATE POLICY "Workers update own pending shifts"
ON public.shifts FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND status = 'pending'
);

-- Workers can delete only pending shifts
CREATE POLICY "Workers delete own pending shifts"
ON public.shifts FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() AND status = 'pending'
);

-- Admin can do everything with shifts
CREATE POLICY "Admins full access shifts"
ON public.shifts FOR ALL
TO authenticated
USING (public.is_admin());

-- ========== ABSENCES RLS ==========
-- Workers see absences for their own shifts, admin sees all
CREATE POLICY "Workers see own absences"
ON public.absences FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = shift_id AND s.user_id = auth.uid()
  ) OR public.is_admin()
);

-- Workers can create absence for their own approved shifts
CREATE POLICY "Workers create own absences"
ON public.absences FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = shift_id AND s.user_id = auth.uid() AND s.status = 'approved'
  )
);

-- Workers can update only pending absences
CREATE POLICY "Workers update own pending absences"
ON public.absences FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = shift_id AND s.user_id = auth.uid()
  ) AND status = 'pending'
);

-- Admin full access to absences
CREATE POLICY "Admins full access absences"
ON public.absences FOR ALL
TO authenticated
USING (public.is_admin());

-- ========== TRIGGER: Auto-create user profile ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'worker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();