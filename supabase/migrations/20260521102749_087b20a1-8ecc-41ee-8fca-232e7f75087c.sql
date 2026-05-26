
CREATE TABLE public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  signup_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT admin_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view settings" ON public.admin_settings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update settings" ON public.admin_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.admin_settings (id, signup_code) VALUES (1, 'PRIMA-ADMIN-2026-X7K9')
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_admin_signup_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_settings WHERE id = 1 AND signup_code = _code)
$$;
