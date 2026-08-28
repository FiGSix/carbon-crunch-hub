REVOKE ALL ON FUNCTION public.resolve_client_company_id(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_client_company_name(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unlink_person_from_company(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_link_person_to_company(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.resolve_client_company_id(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_client_company_name(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlink_person_from_company(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_link_person_to_company(uuid, uuid, text, text, boolean) TO authenticated, service_role;