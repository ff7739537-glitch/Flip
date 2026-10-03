-- Fix: Auto-create profile + wallet when a new user signs up
-- This trigger fires on auth.users INSERT (i.e., when a user registers)

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
  user_email text;
BEGIN
  user_email := NEW.email;
  
  -- Check if this email is in the admin list
  IF user_email IN (
    'fransiscomanongi@gmail.com',
    'frankadamu123@gmail.com',
    'adamufrank55@gmail.com'
  ) THEN
    is_admin := true;
  END IF;
  
  -- Insert profile row
  INSERT INTO public.profiles (id, display_name, email, role, coins)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'),
    user_email,
    CASE WHEN is_admin THEN 'admin' ELSE 'user' END,
    100
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert wallet row
  INSERT INTO public.wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 100, 100, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert signup bonus transaction
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (NEW.id, 'reward', 100, 'Signup bonus');
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing admin email users if they already exist
UPDATE public.profiles
SET role = 'admin'
WHERE email IN (
  'fransiscomanongi@gmail.com',
  'frankadamu123@gmail.com',
  'adamufrank55@gmail.com'
);

-- Insert system settings if they don't exist
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES ('coin_circulation', '1000000')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;
