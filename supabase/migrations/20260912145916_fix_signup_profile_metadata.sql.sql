-- Fix: handle_new_user should populate display_name, username, phone, bio, avatar_url from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_admin boolean := false;
  user_email text;
BEGIN
  user_email := NEW.email;
  IF user_email IN ('fransiscomanongi@gmail.com','frankadamu123@gmail.com','adamufrank55@gmail.com') THEN
    is_admin := true;
  END IF;
  INSERT INTO public.profiles (id, display_name, username, email, phone, bio, avatar_url, coins, role, status, onboarding_complete)
  VALUES (
    NEW.id,
    left(COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'display_name'), ''), 'New User'), 50),
    NULLIF(left(regexp_replace(lower(COALESCE(NEW.raw_user_meta_data->>'display_name', '')), '[^a-z0-9_]+', '_', 'g'), 50), ''),
    user_email,
    left(COALESCE(NEW.raw_user_meta_data->>'phone', ''), 30),
    left(COALESCE(NEW.raw_user_meta_data->>'bio', ''), 500),
    NULLIF(left(COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), 2048), ''),
    100,
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END,
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    onboarding_complete = true,
    updated_at = now();
  INSERT INTO public.wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 100, 100, 0) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.transactions (user_id, type, amount, description)
  SELECT NEW.id, 'reward', 100, 'Signup bonus'
  WHERE NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = NEW.id AND type = 'reward' AND description = 'Signup bonus');
  RETURN NEW;
END;
$$;