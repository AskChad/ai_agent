-- Migration: 009_create_user_profiles.sql
-- Description: Create user_profiles table for role-based access control
-- Created: 2025-11-22

-- User Profiles table for storing user roles
-- Roles: 'user' (default), 'platform_admin' (can configure GHL OAuth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'platform_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: Platform admins can read all profiles
CREATE POLICY "Platform admins can read all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'platform_admin'
        )
    );

-- Policy: Platform admins can update profiles
CREATE POLICY "Platform admins can update profiles"
    ON user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'platform_admin'
        )
    );

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (new.id, new.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comments
COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN user_profiles.role IS 'User role: user (default) or platform_admin';
