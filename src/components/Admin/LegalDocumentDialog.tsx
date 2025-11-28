import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LegalDocument = Database["public"]["Tables"]["legal_documents"]["Row"];
type LegalDocumentInsert = Database["public"]["Tables"]["legal_documents"]["Insert"];

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: LegalDocument | null;
  isViewMode?: boolean;
}

interface FormValues {
  document_type: string;
  title: string;
  content: string;
  current_version: number;
  effective_date: string;
  status: "draft" | "published" | "archived";
}

export function LegalDocumentDialog({
  open,
  onOpenChange,
  document,
  isViewMode = false,
}: LegalDocumentDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    defaultValues: {
      document_type: "agent_referral_agreement",
      title: "",
      content: "",
      current_version: 1,
      effective_date: new Date().toISOString().split("T")[0],
      status: "draft",
    },
  });

  useEffect(() => {
    if (document) {
      form.reset({
        document_type: document.document_type,
        title: document.title,
        content: document.content,
        current_version: document.current_version,
        effective_date: document.effective_date,
        status: document.status as "draft" | "published" | "archived",
      });
    } else {
      form.reset({
        document_type: "agent_referral_agreement",
        title: "",
        content: "",
        current_version: 1,
        effective_date: new Date().toISOString().split("T")[0],
        status: "draft",
      });
    }
  }, [document, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (document) {
        // Update existing
        const { error } = await supabase
          .from("legal_documents")
          .update({
            title: values.title,
            content: values.content,
            current_version: values.current_version,
            effective_date: values.effective_date,
            status: values.status,
          })
          .eq("id", document.id);

        if (error) throw error;
      } else {
        // Create new
        const insertData: LegalDocumentInsert = {
          document_type: values.document_type as any,
          title: values.title,
          content: values.content,
          current_version: values.current_version,
          effective_date: values.effective_date,
          status: values.status,
          created_by: user?.id,
          is_active: values.status === "published",
        };

        const { error } = await supabase
          .from("legal_documents")
          .insert(insertData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      toast.success(document ? "Document updated" : "Document created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save document: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? "View" : document ? "Edit" : "Create"} Legal Document
          </DialogTitle>
          <DialogDescription>
            {isViewMode
              ? "Review document details"
              : document
              ? "Update the legal document information"
              : "Create a new legal document"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="document_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isViewMode || !!document}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agent_referral_agreement">
                        Agent Referral Agreement
                      </SelectItem>
                      <SelectItem value="cession_agreement">
                        Cession Agreement
                      </SelectItem>
                      <SelectItem value="privacy_policy">
                        Privacy Policy
                      </SelectItem>
                      <SelectItem value="terms_of_service">
                        Terms of Service
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isViewMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={12}
                      disabled={isViewMode}
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        disabled={isViewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isViewMode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isViewMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isViewMode && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
