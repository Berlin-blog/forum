ALTER TABLE users
  DROP CHECK chk_users_role,
  ADD CONSTRAINT chk_users_role CHECK (user_role IN ('member', 'admin', 'bot'));
