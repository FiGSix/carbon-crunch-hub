import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FileSignature } from "lucide-react";
import { useProposalSignatures } from "@/hooks/admin/useProposalSignatures";
import { SignaturesTable } from "@/components/admin/signatures/SignaturesTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSignatures() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: signatures, isLoading } = useProposalSignatures();

  const filteredSignatures = signatures?.filter((sig) => {
    const search = searchTerm.toLowerCase();
    return (
      sig.proposal_title.toLowerCase().includes(search) ||
      sig.client_name.toLowerCase().includes(search) ||
      sig.client_email.toLowerCase().includes(search) ||
      sig.agent_name.toLowerCase().includes(search) ||
      sig.typed_name?.toLowerCase().includes(search)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSignature className="h-8 w-8" />
            Digital Signatures
          </h1>
          <p className="text-muted-foreground mt-2">
            View and verify all proposal signatures with audit trail details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Signature Audit Log</CardTitle>
            <CardDescription>
              Complete record of all digital signatures including IP address, timestamp, and verification details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by proposal, client, agent, or typed name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <SignaturesTable signatures={filteredSignatures || []} />
            )}

            {filteredSignatures && filteredSignatures.length > 0 && (
              <div className="text-sm text-muted-foreground text-center pt-4">
                Showing {filteredSignatures.length} of {signatures?.length || 0} signatures
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
