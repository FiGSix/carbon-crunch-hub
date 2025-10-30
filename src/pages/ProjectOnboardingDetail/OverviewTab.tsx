import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, FileText, CheckCircle2, XCircle, FileDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ProjectOnboarding } from "@/types/onboarding";
import { useToast } from "@/hooks/use-toast";

interface OverviewTabProps {
  project: ProjectOnboarding;
  proposal: any;
  onRefresh: () => void;
}

export function OverviewTab({ project, proposal, onRefresh }: OverviewTabProps) {
  const { toast } = useToast();
  const clientInfo = proposal.content?.clientInfo || {};
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" size="sm">
            Download Summary PDF
          </Button>
          <Button variant="outline" size="sm">
            Export to CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
