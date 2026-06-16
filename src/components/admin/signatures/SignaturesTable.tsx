import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye } from "lucide-react";
import { format } from "date-fns";
import { ProposalSignature } from "@/hooks/admin/useProposalSignatures";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SignaturesTableProps {
  signatures: ProposalSignature[];
}

export function SignaturesTable({ signatures }: SignaturesTableProps) {
  const navigate = useNavigate();
  const [projectIds, setProjectIds] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProjectIds() {
      const proposalIds = signatures.map(sig => sig.proposal_id);
      if (proposalIds.length === 0) return;

      const { data } = await supabase
        .from("project_onboarding")
        .select("id, proposal_id")
        .in("proposal_id", proposalIds);

      if (data) {
        const mapping: Record<string, string> = {};
        data.forEach(item => {
          mapping[item.proposal_id] = item.id;
        });
        setProjectIds(mapping);
      }
    }

    fetchProjectIds();
  }, [signatures]);

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proposal</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Signature Type</TableHead>
            <TableHead>Typed Name</TableHead>
            <TableHead>Signed At</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Terms Version</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signatures.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No signatures found
              </TableCell>
            </TableRow>
          ) : (
            signatures.map((signature) => (
              <TableRow key={signature.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-1">
                    <span className="truncate max-w-[200px]">{signature.proposal_title}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {signature.proposal_id.slice(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{signature.client_name}</span>
                    <span className="text-xs text-muted-foreground">{signature.client_email}</span>
                  </div>
                </TableCell>
                <TableCell>{signature.agent_name}</TableCell>
                <TableCell>
                  <Badge variant={signature.signature_type === 'typed_name' ? 'default' : 'secondary'}>
                    {signature.signature_type === 'typed_name' ? 'Typed' : 'Digital'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">
                    {signature.typed_name || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{format(new Date(signature.signed_at), 'MMM d, yyyy')}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(signature.signed_at), 'h:mm a')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {signature.ip_address || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{signature.accepted_terms_version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {projectIds[signature.proposal_id] && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/onboarding/${projectIds[signature.proposal_id]}?tab=agreement`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Project
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/proposals/${signature.proposal_id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Proposal
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
