import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { AVAILABLE_SCOPES } from "./scopes";

interface PartnerLite {
  id: string;
  name: string;
  api_keys: {
    id: string;
    is_active: boolean;
    scopes: string[];
    api_key_prefix: string;
  }[];
}

interface ManageScopesDialogProps {
  partner: PartnerLite | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ManageScopesDialog({ partner, onClose, onSaved }: ManageScopesDialogProps) {
  const { toast } = useToast();
  const activeKey = partner?.api_keys.find(k => k.is_active) || partner?.api_keys[0];
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(activeKey?.scopes ?? []);
  }, [activeKey?.id]);

  if (!partner) return null;

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!activeKey) return;
    if (selected.length === 0) {
      toast({ title: "Select at least one scope", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("partner_api_keys")
        .update({ scopes: selected })
        .eq("id", activeKey.id);
      if (error) throw error;
      toast({
        title: "Scopes updated",
        description: `${partner.name}'s API key now has ${selected.length} scope${selected.length === 1 ? "" : "s"}.`,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Failed to update scopes:", err);
      toast({
        title: "Error",
        description: err?.message ?? "Failed to update scopes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!partner} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Scopes — {partner.name}</DialogTitle>
          <DialogDescription>
            Update the API permissions for this partner's active key. The key value stays the same.
          </DialogDescription>
        </DialogHeader>

        {!activeKey ? (
          <p className="text-sm text-muted-foreground">No active API key found for this partner.</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {AVAILABLE_SCOPES.map((scope) => (
              <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-md border">
                <Checkbox
                  id={`scope-${scope.id}`}
                  checked={selected.includes(scope.id)}
                  onCheckedChange={() => toggle(scope.id)}
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor={`scope-${scope.id}`} className="font-medium cursor-pointer">
                    {scope.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{scope.description}</p>
                  <code className="text-xs text-muted-foreground">{scope.id}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !activeKey}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Scopes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
