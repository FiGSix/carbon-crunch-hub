import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompanyManagementDialog } from '@/components/admin/companies/CompanyManagementDialog';

/**
 * Deep-link target for company management.
 * Renders nothing of its own — the CompanyManagementDialog covers the screen.
 * Closing the dialog navigates back to the previous admin surface.
 */
export default function AdminCompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  return (
    <DashboardLayout requiredRole="admin">
      <CompanyManagementDialog
        companyId={companyId ?? null}
        open={!!companyId}
        onOpenChange={(open) => {
          if (!open) navigate(-1);
        }}
      />
    </DashboardLayout>
  );
}
