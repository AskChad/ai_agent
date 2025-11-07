-- ===========================================
-- Install exec_sql Function
-- This must be run FIRST to enable API-based migrations
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mdccswzjwfyrzahbhduu/sql
-- ===========================================

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;

-- Test the function
SELECT public.exec_sql('SELECT 1 as test') as result;

-- Verify it exists
SELECT
  'exec_sql installed successfully!' as status,
  routine_name,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'exec_sql';
