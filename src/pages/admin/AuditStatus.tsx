import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VintageStatusCard } from '@/components/audit/VintageStatusCard';
import { VintageProgressCard } from '@/components/audit/VintageProgressCard';

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
        
        <div className="flex gap-6 items-start">
          <VintageStatusCard />
          <VintageProgressCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
