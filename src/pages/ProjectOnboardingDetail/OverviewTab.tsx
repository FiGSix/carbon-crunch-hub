import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, User, FileText, CheckCircle2, XCircle, FileDown, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ProjectOnboarding } from "@/types/onboarding";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { resolveClientInfo } from "@/utils/proposals/resolveClientInfo";

interface OverviewTabProps {
  project: ProjectOnboarding;
  proposal: any;
  onRefresh: () => void;
}

export function OverviewTab({ project, proposal, onRefresh }: OverviewTabProps) {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);
  const isAdmin = userRole === 'admin';
  
  // Resolve client info using shared utility: prioritize live data from clients table
  const clientInfo = resolveClientInfo(
    proposal.content?.clientInfo || {},
    proposal.clients // Note: OverviewTab receives 'clients' from its query join
  );
  
  const projectInfo = proposal.content?.projectInfo || {};

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
    // Skip validation if admin force override is enabled
    if (!allChecksComplete && !project.audit_ready && !forceOverride) {
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
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                project.onboarding_complete ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboarding</p>
                <p className="font-semibold">
                  {project.onboarding_complete ? 'Complete' : 'In Progress'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                project.data_access_verified ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Access</p>
                <p className="font-semibold">
                  {project.data_access_verified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                project.audit_ready ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Audit Ready</p>
                <p className="font-semibold">
                  {project.audit_ready ? 'Ready' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-semibold">
                  {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{clientInfo.name || '—'}</p>
                <p className="text-sm text-muted-foreground">{clientInfo.email || '—'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Site Address</p>
                <p className="text-sm text-muted-foreground">
                  {projectInfo.address || clientInfo.address || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">System Size</p>
                <p className="text-sm text-muted-foreground">
                  {proposal.system_size_kwp
                    ? `${proposal.system_size_kwp} kWp`
                    : proposal.annual_energy
                    ? `${(proposal.annual_energy / 1000).toFixed(2)} MWh/year`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Cession Agreement Signed</p>
                <p className="text-sm text-muted-foreground">
                  {proposal.signed_at
                    ? new Date(proposal.signed_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Readiness Checklist */}
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
            {/* Admin Force Override for Legacy/Backfill Projects */}
            {!allChecksComplete && !project.audit_ready && (
              <div className="p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-300">Admin Override</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                  This project has incomplete onboarding data. Enable override to mark as 
                  Audit Ready for legacy/backfill projects that have already been audited.
                </p>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="force-override"
                    checked={forceOverride} 
                    onCheckedChange={setForceOverride} 
                  />
                  <label htmlFor="force-override" className="text-sm font-medium cursor-pointer">
                    Enable Force Override (bypass validation)
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="audit_ready"
                checked={project.audit_ready}
                onCheckedChange={handleToggleAuditReady}
                disabled={isUpdating || (!allChecksComplete && !project.audit_ready && !forceOverride)}
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

            {!allChecksComplete && !forceOverride && (
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
