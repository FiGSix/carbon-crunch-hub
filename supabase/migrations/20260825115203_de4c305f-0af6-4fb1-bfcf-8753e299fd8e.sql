-- 1. Follow-up tracking columns
ALTER TABLE public.project_onboarding
  ADD COLUMN IF NOT EXISTS last_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_followup_by uuid,
  ADD COLUMN IF NOT EXISTS last_followup_recipients text[];

GRANT SELECT ON public.onboarding_activity_log TO authenticated;
GRANT INSERT ON public.onboarding_activity_log TO authenticated;
GRANT ALL ON public.onboarding_activity_log TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.onboarding_comments TO authenticated;
GRANT ALL ON public.onboarding_comments TO service_role;

-- 2. Activity logging: onboarding_fields per-column diff
CREATE OR REPLACE FUNCTION public.log_onboarding_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_col text;
  v_old text;
  v_new text;
  v_cols text[] := ARRAY[
    'system_name','ownership_type','system_address','system_gps_lat','system_gps_lng',
    'commissioning_date','connection_type','alternative_power_source','meter_type',
    'installer_id','installer_company_name','installer_email',
    'inverter_brand','inverter_model','inverter_quantity','inverter_capacity_kw','inverter_serial','inverter_cost',
    'data_collector_present','data_collector_serial',
    'has_battery','battery_brand','battery_model','battery_capacity_kwh','battery_serial','battery_cost',
    'panel_brand','panel_size_wp','panel_quantity','panel_total_kwp','panel_cost',
    'total_capex','labor_cost','meter_serial',
    'has_maintenance_agreement','maintenance_agreement_term_years','maintenance_cost_annual',
    'phases_json'
  ];
  v_old_json jsonb := to_jsonb(OLD);
  v_new_json jsonb := to_jsonb(NEW);
BEGIN
  SELECT COALESCE(auth.uid(), po.last_modified_by)
    INTO v_actor
    FROM public.project_onboarding po
   WHERE po.id = NEW.project_id;

  IF v_actor IS NULL THEN
    v_actor := COALESCE(auth.uid(), NEW.validated_by);
  END IF;

  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_col IN ARRAY v_cols LOOP
    v_old := v_old_json->>v_col;
    v_new := v_new_json->>v_col;
    IF COALESCE(v_old, '~null~') <> COALESCE(v_new, '~null~') THEN
      INSERT INTO public.onboarding_activity_log
        (project_id, actor_id, action, entity_type, entity_id, details, old_value, new_value)
      VALUES
        (NEW.project_id, v_actor, 'field_updated', 'onboarding_fields', NEW.id,
         jsonb_build_object('field', v_col), left(COALESCE(v_old, ''), 500), left(COALESCE(v_new, ''), 500));
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_onboarding_field_changes ON public.onboarding_fields;
CREATE TRIGGER trg_log_onboarding_field_changes
AFTER UPDATE ON public.onboarding_fields
FOR EACH ROW EXECUTE FUNCTION public.log_onboarding_field_changes();

-- 3. Activity logging: documents
CREATE OR REPLACE FUNCTION public.log_onboarding_document_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid;
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.uploaded_by);

  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.replaces_doc_id IS NOT NULL THEN 'document_replaced' ELSE 'document_uploaded' END;
  ELSIF NEW.is_validated IS DISTINCT FROM OLD.is_validated THEN
    v_action := CASE WHEN NEW.is_validated THEN 'document_validated' ELSE 'document_unvalidated' END;
    v_actor := COALESCE(auth.uid(), NEW.validated_by, NEW.uploaded_by);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.onboarding_activity_log
    (project_id, actor_id, action, entity_type, entity_id, details, new_value)
  VALUES
    (NEW.project_id, v_actor, v_action, 'onboarding_documents', NEW.id,
     jsonb_build_object('category', NEW.category, 'file_name', NEW.file_name, 'version', NEW.version),
     left(NEW.file_name, 500));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_onboarding_document_activity ON public.onboarding_documents;
CREATE TRIGGER trg_log_onboarding_document_activity
AFTER INSERT OR UPDATE ON public.onboarding_documents
FOR EACH ROW EXECUTE FUNCTION public.log_onboarding_document_activity();

-- 4. Activity logging: data access config
CREATE OR REPLACE FUNCTION public.log_data_access_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.configured_by);
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.onboarding_activity_log
      (project_id, actor_id, action, entity_type, entity_id, details, new_value)
    VALUES
      (NEW.project_id, v_actor, 'data_access_configured', 'data_access_config', NEW.id,
       jsonb_build_object('provider', NEW.provider, 'credential_method', NEW.credential_method),
       left(COALESCE(NEW.provider, ''), 500));
    RETURN NEW;
  END IF;

  IF NEW.last_test_status IS DISTINCT FROM OLD.last_test_status THEN
    INSERT INTO public.onboarding_activity_log
      (project_id, actor_id, action, entity_type, entity_id, details, old_value, new_value)
    VALUES
      (NEW.project_id, v_actor, 'data_access_test', 'data_access_config', NEW.id,
       jsonb_build_object('provider', NEW.provider, 'error', left(COALESCE(NEW.last_test_error, ''), 300)),
       COALESCE(OLD.last_test_status, ''), COALESCE(NEW.last_test_status, ''));
  END IF;

  IF NEW.provider IS DISTINCT FROM OLD.provider
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.portal_url IS DISTINCT FROM OLD.portal_url
     OR NEW.credential_method IS DISTINCT FROM OLD.credential_method
     OR NEW.delegated_email IS DISTINCT FROM OLD.delegated_email THEN
    INSERT INTO public.onboarding_activity_log
      (project_id, actor_id, action, entity_type, entity_id, details)
    VALUES
      (NEW.project_id, v_actor, 'data_access_updated', 'data_access_config', NEW.id,
       jsonb_build_object('provider', NEW.provider, 'credential_method', NEW.credential_method));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_data_access_activity ON public.data_access_config;
CREATE TRIGGER trg_log_data_access_activity
AFTER INSERT OR UPDATE ON public.data_access_config
FOR EACH ROW EXECUTE FUNCTION public.log_data_access_activity();

-- 5. Activity logging: project_onboarding status milestones
CREATE OR REPLACE FUNCTION public.log_project_onboarding_status_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NEW.last_modified_by);
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.submitted_for_review IS DISTINCT FROM OLD.submitted_for_review AND NEW.submitted_for_review THEN
    INSERT INTO public.onboarding_activity_log (project_id, actor_id, action, entity_type, entity_id)
    VALUES (NEW.id, COALESCE(NEW.submitted_by, v_actor), 'submitted_for_review', 'project_onboarding', NEW.id);
  END IF;

  IF NEW.admin_validated IS DISTINCT FROM OLD.admin_validated AND NEW.admin_validated THEN
    INSERT INTO public.onboarding_activity_log (project_id, actor_id, action, entity_type, entity_id)
    VALUES (NEW.id, COALESCE(NEW.admin_validated_by, v_actor), 'admin_validated', 'project_onboarding', NEW.id);
  END IF;

  IF NEW.onboarding_complete IS DISTINCT FROM OLD.onboarding_complete THEN
    INSERT INTO public.onboarding_activity_log (project_id, actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (NEW.id, v_actor, 'onboarding_complete_changed', 'project_onboarding', NEW.id,
            OLD.onboarding_complete::text, NEW.onboarding_complete::text);
  END IF;

  IF NEW.data_access_verified IS DISTINCT FROM OLD.data_access_verified THEN
    INSERT INTO public.onboarding_activity_log (project_id, actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (NEW.id, v_actor, 'data_access_verified_changed', 'project_onboarding', NEW.id,
            OLD.data_access_verified::text, NEW.data_access_verified::text);
  END IF;

  IF NEW.audit_ready IS DISTINCT FROM OLD.audit_ready THEN
    INSERT INTO public.onboarding_activity_log (project_id, actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (NEW.id, COALESCE(NEW.audit_ready_marked_by, v_actor), 'audit_ready_changed', 'project_onboarding', NEW.id,
            OLD.audit_ready::text, NEW.audit_ready::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_onboarding_status_activity ON public.project_onboarding;
CREATE TRIGGER trg_log_project_onboarding_status_activity
AFTER UPDATE ON public.project_onboarding
FOR EACH ROW EXECUTE FUNCTION public.log_project_onboarding_status_activity();