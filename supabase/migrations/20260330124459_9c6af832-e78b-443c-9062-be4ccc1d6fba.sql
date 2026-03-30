-- Create a trigger function that validates commission date before signing
CREATE OR REPLACE FUNCTION check_commission_date_before_signing()
RETURNS TRIGGER AS $$
DECLARE
  comm_date text;
BEGIN
  IF NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed' THEN
    comm_date := COALESCE(
      NEW.project_info->>'commissionDate',
      NEW.content->'projectInfo'->>'commissionDate'
    );
    IF comm_date IS NOT NULL AND NULLIF(comm_date, '') IS NOT NULL AND comm_date::date < '2022-09-15'::date THEN
      RAISE EXCEPTION 'Cannot sign: commissioning date % is before the minimum allowed date 2022-09-15', comm_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS enforce_commission_date_on_signing ON proposals;
CREATE TRIGGER enforce_commission_date_on_signing
BEFORE UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION check_commission_date_before_signing();