-- Migration: harden 3 SECURITY DEFINER RPC functions against lateral privilege escalation
-- Problem: any authenticated user could call these via /rest/v1/rpc/ and read other users' data
-- Fix: (1) in-function auth guards (2) REVOKE EXECUTE FROM authenticated (3) SET search_path

----------------------------------------------------------------------
-- 1. get_sales_funnel
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sales_funnel(p_sales_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  result JSONB;
  survey_leads BIGINT;
  jwt_role TEXT;
  caller_role TEXT;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- Allow service_role and direct postgres (NULL = no PostgREST)
  IF jwt_role IS NOT DISTINCT FROM 'service_role' OR jwt_role IS NULL THEN
    NULL; -- pass
  ELSE
    SELECT ur.role INTO caller_role
    FROM user_roles ur
    WHERE ur.user_id = auth.uid();

    IF caller_role IS NULL THEN
      RAISE EXCEPTION 'Access denied: no role assigned';
    END IF;

    IF caller_role NOT IN ('super_admin', 'admin') AND auth.uid() != p_sales_user_id THEN
      RAISE EXCEPTION 'Access denied: cannot view another user''s sales funnel';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'registered_lead', COUNT(*) FILTER (WHERE stage = 'lead'),
    'contacted', COUNT(*) FILTER (WHERE stage = 'contacted'),
    'interested', COUNT(*) FILTER (WHERE stage = 'interested'),
    'trial', COUNT(*) FILTER (WHERE stage = 'trial'),
    'converted', COUNT(*) FILTER (WHERE stage = 'converted'),
    'lost', COUNT(*) FILTER (WHERE stage = 'lost'),
    'total_registered', COUNT(*)
  ) INTO result
  FROM sales_customers
  WHERE sales_user_id = p_sales_user_id;

  SELECT COUNT(*) INTO survey_leads
  FROM survey_responses sr
  WHERE sr.sales_user_id = p_sales_user_id
    AND sr.status = 'completed'
    AND sr.registered_user_id IS NULL;

  result = result || jsonb_build_object(
    'unregistered_leads', survey_leads,
    'total_leads', COALESCE((result->>'registered_lead')::int, 0)
                 + COALESCE((result->>'contacted')::int, 0)
                 + COALESCE((result->>'interested')::int, 0)
                 + COALESCE((result->>'trial')::int, 0)
                 + COALESCE((result->>'converted')::int, 0)
                 + survey_leads,
    'conversion_rate', CASE
      WHEN (COALESCE((result->>'registered_lead')::int,0) + survey_leads) > 0
      THEN ROUND(
        COALESCE((result->>'converted')::int,0)::numeric /
        (COALESCE((result->>'registered_lead')::int,0) + survey_leads)::numeric * 100, 1
      )
      ELSE 0 END
  );

  RETURN result;
END;
$function$;

----------------------------------------------------------------------
-- 2. get_survey_analytics_aggregate
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_survey_analytics_aggregate(p_survey_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  result JSONB;
  jwt_role TEXT;
  caller_role TEXT;
  survey_owner UUID;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role IS NOT DISTINCT FROM 'service_role' OR jwt_role IS NULL THEN
    NULL; -- pass
  ELSE
    SELECT ur.role INTO caller_role
    FROM user_roles ur
    WHERE ur.user_id = auth.uid();

    IF caller_role IS NULL THEN
      RAISE EXCEPTION 'Access denied: no role assigned';
    END IF;

    IF caller_role NOT IN ('super_admin', 'admin') THEN
      SELECT s.created_by INTO survey_owner
      FROM surveys s
      WHERE s.id = p_survey_id;

      IF survey_owner IS NULL OR survey_owner != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: not the owner of this survey';
      END IF;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'total_responses', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'abandoned', COUNT(*) FILTER (WHERE status = 'abandoned'),
    'completion_rate', CASE WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100, 1)
      ELSE 0 END,
    'registered_count', COUNT(*) FILTER (WHERE registered_user_id IS NOT NULL),
    'registration_rate', CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
      THEN ROUND(COUNT(*) FILTER (WHERE registered_user_id IS NOT NULL)::numeric / COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100, 1)
      ELSE 0 END,
    'avg_time_seconds', ROUND(AVG(time_spent_seconds) FILTER (WHERE status = 'completed')),
    'education_distribution', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(respondent_education, '未填写'), cnt), '{}'::jsonb)
      FROM (SELECT respondent_education, COUNT(*) as cnt FROM survey_responses
            WHERE survey_id = p_survey_id AND status = 'completed'
            GROUP BY respondent_education) sub
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (SELECT DATE(completed_at) as d, COUNT(*) as c FROM survey_responses
            WHERE survey_id = p_survey_id AND status = 'completed'
            GROUP BY DATE(completed_at)) sub
    ),
    'follow_up_stats', jsonb_build_object(
      'pending', COUNT(*) FILTER (WHERE follow_up_status = 'pending' AND status = 'completed'),
      'contacted', COUNT(*) FILTER (WHERE follow_up_status = 'contacted'),
      'converted', COUNT(*) FILTER (WHERE follow_up_status = 'converted'),
      'lost', COUNT(*) FILTER (WHERE follow_up_status = 'lost')
    )
  ) INTO result
  FROM survey_responses
  WHERE survey_id = p_survey_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;

----------------------------------------------------------------------
-- 3. get_survey_analytics_full
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_survey_analytics_full(p_survey_id uuid, p_sales_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  result JSONB;
  agg JSONB;
  jwt_role TEXT;
  caller_role TEXT;
  survey_owner UUID;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);

  IF jwt_role IS NOT DISTINCT FROM 'service_role' OR jwt_role IS NULL THEN
    NULL; -- pass
  ELSE
    SELECT ur.role INTO caller_role
    FROM user_roles ur
    WHERE ur.user_id = auth.uid();

    IF caller_role IS NULL THEN
      RAISE EXCEPTION 'Access denied: no role assigned';
    END IF;

    IF caller_role NOT IN ('super_admin', 'admin') THEN
      SELECT s.created_by INTO survey_owner
      FROM surveys s
      WHERE s.id = p_survey_id;

      IF survey_owner IS NULL OR survey_owner != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: not the owner of this survey';
      END IF;
    END IF;
  END IF;

  SELECT get_survey_analytics_aggregate(p_survey_id) INTO agg;

  SELECT agg || jsonb_build_object(
    'sales_breakdown', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'sales_user_id', sr.sales_user_id,
        'sales_name', COALESCE(up.full_name, up.email),
        'total_responses', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE sr.status = 'completed'),
        'registered', COUNT(*) FILTER (WHERE sr.registered_user_id IS NOT NULL),
        'conversion_rate', CASE WHEN COUNT(*) FILTER (WHERE sr.status = 'completed') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE sr.registered_user_id IS NOT NULL)::numeric / COUNT(*) FILTER (WHERE sr.status = 'completed')::numeric * 100, 1)
          ELSE 0 END
      )), '[]'::jsonb)
      FROM survey_responses sr
      LEFT JOIN user_profiles up ON sr.sales_user_id = up.id
      WHERE sr.survey_id = p_survey_id
      AND sr.sales_user_id IS NOT NULL
      AND (p_sales_user_id IS NULL OR sr.sales_user_id = p_sales_user_id)
      GROUP BY sr.sales_user_id, up.full_name, up.email
    )
  ) INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;

----------------------------------------------------------------------
-- 4. REVOKE EXECUTE FROM authenticated (double insurance)
--    All 3 functions are called only via service_role from API routes.
----------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION get_sales_funnel(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION get_sales_funnel(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_sales_funnel(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) TO postgres;
