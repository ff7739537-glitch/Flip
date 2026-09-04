CREATE TABLE IF NOT EXISTS local_auth_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE local_auth_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "local_auth_overrides_select_admin" ON local_auth_overrides;
CREATE POLICY "local_auth_overrides_select_admin" ON local_auth_overrides FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "local_auth_overrides_insert_admin" ON local_auth_overrides;
CREATE POLICY "local_auth_overrides_insert_admin" ON local_auth_overrides FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "local_auth_overrides_update_admin" ON local_auth_overrides;
CREATE POLICY "local_auth_overrides_update_admin" ON local_auth_overrides FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "local_auth_overrides_delete_admin" ON local_auth_overrides;
CREATE POLICY "local_auth_overrides_delete_admin" ON local_auth_overrides FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

GRANT ALL ON local_auth_overrides TO authenticated;
