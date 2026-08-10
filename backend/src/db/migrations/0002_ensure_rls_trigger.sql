-- Migration 0001 enables RLS on the five tables that exist today. This one keeps that
-- property true for tables that do not exist yet.
--
-- An event trigger enables RLS on every new table in `public` as it is created, so a future
-- migration that adds a table cannot quietly ship it world-readable through PostgREST. The
-- reasoning is the same as 0001: the API is the real security boundary, but the anon key
-- reaches the same database, and "we forgot to add it to the RLS migration" is exactly the
-- kind of omission that survives review.
--
-- This already existed on the managed project, added out-of-band and untracked. Bringing it
-- here makes it reproducible: a fresh project now gets it from `npm run db:migrate` rather
-- than from whoever remembers to run it by hand.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
-- SECURITY DEFINER because the trigger must ALTER tables it does not own. `search_path` is
-- pinned to pg_catalog for the same reason: a definer function that resolves unqualified
-- names through the caller's search_path is a privilege escalation waiting to happen.
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
--> statement-breakpoint
-- A new function grants EXECUTE to PUBLIC by default, which would publish a SECURITY DEFINER
-- function at /rest/v1/rpc/rls_auto_enable for anyone holding the anon key. Revoking PUBLIC
-- is the part that matters — revoking anon and authenticated alone leaves the inherited
-- PUBLIC grant behind and changes nothing.
--
-- Nothing is lost: PostgreSQL checks EXECUTE when the event trigger is created, not when it
-- fires, so the trigger keeps working with no role able to call the function directly.
--
-- `anon` and `authenticated` are Supabase's roles and do not exist on a stock PostgreSQL,
-- so they are revoked only if present. The integration suite runs against whatever database
-- it is pointed at, and a migration that requires a vendor's roles to exist is a migration
-- that fails somewhere unhelpful.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END $$;
--> statement-breakpoint
DROP EVENT TRIGGER IF EXISTS ensure_rls;
--> statement-breakpoint
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();
