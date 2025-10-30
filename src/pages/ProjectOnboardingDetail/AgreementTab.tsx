import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignedAgreementDownloadButton } from "@/components/proposals/view/SignedAgreementDownloadButton";
import { useProjectAgreement } from "@/hooks/useProjectAgreement";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSignature, Calendar, User, Monitor, MapPin, Shield, FileText } from "lucide-react";
import { format } from "date-fns";

interface AgreementTabProps {
  proposalId: string;
  proposalTitle: string;
}

export function AgreementTab({ proposalId, proposalTitle }: AgreementTabProps) {
  const { data: agreement, isLoading } = useProjectAgreement(proposalId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Agreement Signed Yet</h3>
            <p className="text-sm text-muted-foreground">
              This proposal has not been signed. Once signed, the agreement details will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agreement Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Cession Agreement
              </CardTitle>
              <CardDescription>Digital signature details and audit trail</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Signed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Signed on</p>
              <p className="font-semibold">
                {format(new Date(agreement.signed_at), "PPP 'at' p")}
              </p>
            </div>
            <SignedAgreementDownloadButton 
              proposalId={proposalId} 
              proposalTitle={proposalTitle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature Details */}
      <Card>
        <CardHeader>
          <CardTitle>Signature Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Signed By</p>
                <p className="text-sm text-muted-foreground">{agreement.signer_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{agreement.signer_email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Signature Method</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {agreement.signature_type?.replace(/_/g, " ") || "Typed Name"}
                </p>
                {agreement.typed_name && (
                  <p className="text-sm text-muted-foreground italic">"{agreement.typed_name}"</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Signed Date & Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(agreement.signed_at), "PPP")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(agreement.signed_at), "p")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Terms Version</p>
                <p className="text-sm text-muted-foreground">
                  Version {agreement.accepted_terms_version}
                </p>
              </div>
            </div>
          </div>

          {agreement.signature_image_url && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Signature Image</p>
              <div className="border rounded-lg p-4 bg-muted/20 inline-block">
                <img 
                  src={agreement.signature_image_url} 
                  alt="Signature" 
                  className="max-h-24 max-w-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parties Involved */}
      <Card>
        <CardHeader>
          <CardTitle>Agreement Parties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm text-muted-foreground">{agreement.client_name || "—"}</p>
                <p className="text-sm text-muted-foreground">{agreement.client_email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Agent</p>
                <p className="text-sm text-muted-foreground">{agreement.agent_name || "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Technical details for compliance and verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">IP Address</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {agreement.ip_address || "Not recorded"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Device & Browser</p>
                <p className="text-sm text-muted-foreground break-all">
                  {agreement.user_agent || "Not recorded"}
                </p>
              </div>
            </div>
          </div>

          {agreement.metadata && Object.keys(agreement.metadata).length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Additional Metadata</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32">
                {JSON.stringify(agreement.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
