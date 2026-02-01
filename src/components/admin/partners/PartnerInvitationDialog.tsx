import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Valid email is required"),
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  environment: z.enum(["test", "live"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const AVAILABLE_SCOPES = [
  { id: "proposals:create", label: "Create Proposals", description: "Create new proposals" },
  { id: "proposals:read", label: "Read Proposals", description: "View proposal details" },
  { id: "proposals:acceptance", label: "Send Acceptance Links", description: "Trigger client acceptance emails" },
  { id: "projects:onboarding:read", label: "Read Onboarding", description: "View project onboarding status" },
  { id: "projects:onboarding:write", label: "Write Onboarding", description: "Update project onboarding data" },
  { id: "projects:documents:write", label: "Upload Documents", description: "Upload project documents" },
  { id: "projects:data-access:write", label: "Configure Data Access", description: "Set up monitoring access" },
];

interface PartnerInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PartnerInvitationDialog({ open, onOpenChange, onSuccess }: PartnerInvitationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["proposals:create", "proposals:read"]);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      companyName: "",
      contactName: "",
      environment: "test",
      notes: "",
    },
  });

  const handleScopeToggle = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const handleCopyKey = async () => {
    if (generatedApiKey) {
      await navigator.clipboard.writeText(generatedApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (generatedApiKey) {
      onSuccess();
    }
    setGeneratedApiKey(null);
    form.reset();
    setSelectedScopes(["proposals:create", "proposals:read"]);
    onOpenChange(false);
  };

  const onSubmit = async (data: FormData) => {
    if (selectedScopes.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one API scope",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("send-partner-invitation", {
        body: {
          email: data.email,
          companyName: data.companyName,
          contactName: data.contactName || undefined,
          environment: data.environment,
          scopes: selectedScopes,
          notes: data.notes || undefined,
        },
      });

      if (error) throw error;

      if (result.apiKey) {
        setGeneratedApiKey(result.apiKey);
        toast({
          title: "Partner Invited",
          description: `Invitation sent to ${data.email}. Save the API key below!`,
        });
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show API key reveal screen
  if (generatedApiKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Partner Invitation Sent
            </DialogTitle>
            <DialogDescription>
              The partner has been invited and their API key has been generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Save this API key now!</p>
                  <p>This key will not be shown again. The partner will also receive it via email.</p>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">API Key</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm font-mono bg-background p-3 rounded border break-all">
                  {generatedApiKey}
                </code>
                <Button size="icon" variant="outline" onClick={handleCopyKey}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Partner</DialogTitle>
          <DialogDescription>
            Send an API invitation to a new integration partner
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              {...form.register("companyName")}
              placeholder="Partner Company Inc."
            />
            {form.formState.errors.companyName && (
              <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email *</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="partner@company.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              {...form.register("contactName")}
              placeholder="John Smith"
            />
          </div>

          <div className="space-y-2">
            <Label>Environment</Label>
            <RadioGroup
              value={form.watch("environment")}
              onValueChange={(value) => form.setValue("environment", value as "test" | "live")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="test" id="test" />
                <Label htmlFor="test" className="font-normal cursor-pointer">Test</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="live" />
                <Label htmlFor="live" className="font-normal cursor-pointer">Live</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>API Scopes</Label>
            <div className="border rounded-lg divide-y">
              {AVAILABLE_SCOPES.map((scope) => (
                <div key={scope.id} className="flex items-start space-x-3 p-3">
                  <Checkbox
                    id={scope.id}
                    checked={selectedScopes.includes(scope.id)}
                    onCheckedChange={() => handleScopeToggle(scope.id)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={scope.id} className="font-medium cursor-pointer">
                      {scope.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{scope.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Internal notes about this partner..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
