import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Archive } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LegalDocumentDialog } from "@/components/Admin/LegalDocumentDialog";
import type { Database } from "@/integrations/supabase/types";

type LegalDocument = Database["public"]["Tables"]["legal_documents"]["Row"];

export default function LegalDocuments() {
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["legal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LegalDocument[];
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_documents")
        .update({ status: "archived", is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      toast.success("Document archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive document: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setSelectedDocument(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleArchive = (id: string) => {
    if (confirm("Are you sure you want to archive this document?")) {
      archiveMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      published: "default",
      draft: "secondary",
      archived: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      agent_referral_agreement: "Agent Referral Agreement",
      cession_agreement: "Cession Agreement",
      privacy_policy: "Privacy Policy",
      terms_of_service: "Terms of Service",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage legal documents and track version acceptance
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {getDocumentTypeLabel(doc.document_type)}
                </TableCell>
                <TableCell>{doc.title}</TableCell>
                <TableCell>{doc.current_version}</TableCell>
                <TableCell>{getStatusBadge(doc.status)}</TableCell>
                <TableCell>{format(new Date(doc.effective_date), "PP")}</TableCell>
                <TableCell>{format(new Date(doc.created_at), "PP")}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {doc.status !== "archived" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(doc.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <LegalDocumentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        document={selectedDocument}
        isViewMode={isViewMode}
      />
    </div>
  );
}
