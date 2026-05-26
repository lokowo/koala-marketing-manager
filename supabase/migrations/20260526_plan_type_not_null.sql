-- Backfill null plan_types and prevent future nulls
UPDATE user_profiles SET plan_type = 'free' WHERE plan_type IS NULL;
ALTER TABLE user_profiles ALTER COLUMN plan_type SET NOT NULL;

-- Update trigger to explicitly set plan_type for safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, plan_type, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'free',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
