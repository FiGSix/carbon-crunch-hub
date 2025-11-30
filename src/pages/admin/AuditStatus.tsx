import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AuditStatus() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Status</h1>
          <p className="text-muted-foreground">
            Track and manage project audit workflow
          </p>
        </div>
        
        {/* Placeholder for future content */}
        <div className="text-muted-foreground">
          Audit status content coming soon...
        </div>
      </div>
    </DashboardLayout>
  );
}
