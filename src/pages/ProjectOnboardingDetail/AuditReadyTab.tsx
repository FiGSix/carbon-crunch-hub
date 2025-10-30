import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectOnboarding } from "@/types/onboarding";
import { useState } from "react";

interface AuditReadyTabProps {
  project: ProjectOnboarding;
  onRefresh: () => void;
}

export function AuditReadyTab({ project, onRefresh }: AuditReadyTabProps) {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const isAdmin = userRole === 'admin';

  const checklist = [
    {
      label: 'Cession Agreement Signed',
      status: true,
      description: 'Agreement has been signed by the client'
    },
    {
      label: 'Onboarding Fields Validated',
      status: project.onboarding_complete,
      description: 'All required fields have been filled and validated'
    },
    {
      label: 'Required Documents Present',
      status: project.onboarding_complete,
      description: 'CoC and invoices have been uploaded'
    },
    {
      label: 'Data Access Verified',
      status: project.data_access_verified,
      description: 'Connection to data source established'
    },
  ];

  const allChecksComplete = checklist.every(item => item.status);

  const handleToggleAuditReady = async () => {
    if (!allChecksComplete && !project.audit_ready) {
      toast({
        title: "Cannot Mark as Audit Ready",
        description: "Please complete all checklist items first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from('project_onboarding')
        .update({
          audit_ready: !project.audit_ready,
          audit_ready_marked_at: !project.audit_ready ? new Date().toISOString() : null,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: project.audit_ready
          ? "Audit ready status removed"
          : "Project marked as audit ready",
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating audit status:', error);
      toast({
        title: "Error",
        description: "Failed to update audit status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
            <CardDescription>
              Mark this project as audit ready (Admin only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="audit_ready"
                checked={project.audit_ready}
                onCheckedChange={handleToggleAuditReady}
                disabled={isUpdating || (!allChecksComplete && !project.audit_ready)}
              />
              <label
                htmlFor="audit_ready"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Mark as Audit Ready
              </label>
            </div>

            {project.audit_ready && project.audit_ready_marked_at && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Marked as audit ready on {new Date(project.audit_ready_marked_at).toLocaleString()}
                </p>
              </div>
            )}

            {!allChecksComplete && (
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Complete all checklist items before marking as audit ready
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
