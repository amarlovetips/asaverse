-- Equipment admin system: independent design, animation, and effects storage.
-- Mirrors the character_designs conventions without touching character data.

CREATE TABLE public.equipment_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  design_name TEXT NOT NULL,
  category TEXT NOT NULL,
  canvas_width INTEGER NOT NULL DEFAULT 32,
  canvas_height INTEGER NOT NULL DEFAULT 32,
  pixel_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT equipment_designs_category_check CHECK (category IN ('head', 'clothing', 'relic'))
);

CREATE TABLE public.equipment_animations (
  equipment_design_id UUID PRIMARY KEY REFERENCES public.equipment_designs (id) ON DELETE CASCADE,
  frames JSONB NOT NULL DEFAULT '[]'::jsonb,
  frame_duration_ms INTEGER NOT NULL DEFAULT 420,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment_effects (
  equipment_design_id UUID PRIMARY KEY REFERENCES public.equipment_designs (id) ON DELETE CASCADE,
  rarity TEXT NOT NULL DEFAULT 'common',
  power INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  protection INTEGER NOT NULL DEFAULT 0,
  icon_pixel_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon_canvas_size INTEGER NOT NULL DEFAULT 16,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT equipment_effects_rarity_check CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

CREATE INDEX equipment_designs_category_idx ON public.equipment_designs (category);
CREATE INDEX equipment_designs_user_idx ON public.equipment_designs (user_id);

ALTER TABLE public.equipment_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage equipment designs" ON public.equipment_designs
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'admin' AND admin_users.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.role = 'admin' AND admin_users.is_active));

CREATE POLICY "Players can read published equipment designs" ON public.equipment_designs
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins manage equipment animations" ON public.equipment_animations
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin' AND admin.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin' AND admin.is_active));

CREATE POLICY "Players can read published equipment animations" ON public.equipment_animations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.equipment_designs d WHERE d.id = equipment_design_id AND d.is_published = true));

CREATE POLICY "Admins manage equipment effects" ON public.equipment_effects
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin' AND admin.is_active))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users admin WHERE admin.user_id = auth.uid() AND admin.role = 'admin' AND admin.is_active));

CREATE POLICY "Players can read published equipment effects" ON public.equipment_effects
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.equipment_designs d WHERE d.id = equipment_design_id AND d.is_published = true));
