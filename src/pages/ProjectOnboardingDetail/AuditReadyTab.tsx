import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectOnboarding } from "@/types/onboarding";

interface AuditReadyTabProps {
  project: ProjectOnboarding;
  onRefresh: () => void;
}

export function AuditReadyTab({ project, onRefresh }: AuditReadyTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Ready Status</CardTitle>
          <CardDescription>
            Admin controls for marking projects as audit ready have been moved to the Overview tab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All audit-related information and controls are now available on the Overview tab for easier access and a more streamlined workflow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
