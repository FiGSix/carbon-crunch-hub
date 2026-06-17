import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AttachSignedAgreementDialogProps {
  proposalId: string;
  proposalTitle: string;
  onAttached?: () => void;
  trigger?: React.ReactNode;
}

export function AttachSignedAgreementDialog({
  proposalId,
  proposalTitle,
  onAttached,
  trigger,
}: AttachSignedAgreementDialogProps) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isAdmin) return null;

  const reset = () => {
    setFile(null);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.includes("pdf")) {
      toast({ title: "Invalid file", description: "Only PDF files are supported.", variant: "destructive" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 10MB.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleAttach = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      // 1. Upload PDF via edge function (service-role bypasses storage RLS)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proposalId", proposalId);

      const { data: uploadResult, error: uploadErr } = await supabase.functions.invoke(
        "upload-signed-agreement",
        { body: formData }
      );

      if (uploadErr || !uploadResult?.success || !uploadResult?.url) {
        throw new Error(uploadErr?.message || uploadResult?.error || "Upload failed");
      }

      // 2. Look up admin display name for typed_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      const typedName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "Admin"
        : "Admin";

      // 3. Insert the proposal_agreements row (DB trigger propagates to sibling proposals)
      const signedAt = new Date().toISOString();
      const { error: insertErr } = await supabase
        .from("proposal_agreements")
        .insert({
          proposal_id: proposalId,
          signed_by: user.id,
          signed_at: signedAt,
          signature_type: "manual",
          signature_type_used: "manual_upload",
          typed_name: typedName,
          signed_pdf_url: uploadResult.url,
          accepted_terms_version: "manual-upload",
          metadata: {
            source: "admin_manual_attach",
            uploaded_by: user.id,
            original_filename: uploadResult.originalFilename || file.name,
            storage_path: uploadResult.path,
          },
        });

      if (insertErr) throw insertErr;

      // 4. Mark this proposal as signed so it reflects the attached agreement
      const { error: proposalUpdateErr } = await supabase
        .from("proposals")
        .update({ status: "signed", signed_at: signedAt })
        .eq("id", proposalId);

      if (proposalUpdateErr) {
        console.warn("Failed to update proposal status after attach:", proposalUpdateErr);
      }


      toast({
        title: "Agreement attached",
        description: `Signed agreement saved for ${proposalTitle}.`,
      });

      // Refresh dependent queries
      await queryClient.invalidateQueries({ queryKey: ["project-agreement", proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      onAttached?.();
      setOpen(false);
      reset();
    } catch (err) {
      console.error("Attach signed agreement failed:", err);
      toast({
        title: "Attach failed",
        description: err instanceof Error ? err.message : "Could not attach the signed agreement.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Attach Signed Agreement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Signed Agreement</DialogTitle>
          <DialogDescription>
            Upload the offline-signed cession agreement PDF for <strong>{proposalTitle}</strong>. This
            creates the agreement record and enables the standard download flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="signed-agreement-file">PDF file (max 10MB)</Label>
          {file ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span className="truncate max-w-[240px]">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Input
              id="signed-agreement-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Attaching...
              </>
            ) : (
              "Attach Agreement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
