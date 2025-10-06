import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { ProposalSignature } from "@/hooks/admin/useProposalSignatures";
import { useNavigate } from "react-router-dom";

interface SignaturesTableProps {
  signatures: ProposalSignature[];
}

export function SignaturesTable({ signatures }: SignaturesTableProps) {
  const navigate = useNavigate();

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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/proposals/${signature.proposal_id}`)}
                    >
                      <Eye className="h-4 w-4" />
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
