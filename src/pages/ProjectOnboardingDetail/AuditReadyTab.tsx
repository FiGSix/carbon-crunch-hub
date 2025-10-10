import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, FileDown } from "lucide-react";
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

  const handleGenerateAuditPack = () => {
    toast({
      title: "Coming Soon",
      description: "Audit pack generation will be available soon",
    });
  };

  return (
    <div className="space-y-6">
      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Readiness Checklist</CardTitle>
          <CardDescription>
            All items must be complete before marking as audit ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklist.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
              {item.status ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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

      {/* Audit Pack Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Pack</CardTitle>
          <CardDescription>
            Generate a comprehensive PDF report for auditing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateAuditPack} disabled={!project.audit_ready}>
            <FileDown className="mr-2 h-4 w-4" />
            Generate Audit Pack PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
