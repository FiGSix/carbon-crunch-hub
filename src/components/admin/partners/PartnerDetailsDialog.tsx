import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from "date-fns";

interface Partner {
  id: string;
  name: string;
  contact_email: string;
  is_active: boolean;
  created_at: string;
  api_keys: {
    id: string;
    api_key_prefix: string;
    environment: string;
    scopes: string[];
    is_active: boolean;
    last_used_at: string | null;
    request_count: number;
  }[];
}

interface PartnerDetailsDialogProps {
  partner: Partner | null;
  onClose: () => void;
}

export function PartnerDetailsDialog({ partner, onClose }: PartnerDetailsDialogProps) {
  if (!partner) return null;

  const activeKey = partner.api_keys.find(k => k.is_active) || partner.api_keys[0];

  return (
    <Dialog open={!!partner} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{partner.name}</DialogTitle>
          <DialogDescription>{partner.contact_email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={partner.is_active ? "default" : "secondary"}>
              {partner.is_active ? "Active" : "Inactive"}
            </Badge>
            {activeKey && (
              <Badge variant={activeKey.environment === "live" ? "default" : "outline"}>
                {activeKey.environment}
              </Badge>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(partner.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last API Call</p>
              <p className="font-medium">
                {activeKey?.last_used_at
                  ? formatDistanceToNow(new Date(activeKey.last_used_at), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Requests</p>
              <p className="font-medium font-mono">
                {activeKey?.request_count?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">API Key Prefix</p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {activeKey?.api_key_prefix || "—"}
              </code>
            </div>
          </div>

          {activeKey && activeKey.scopes.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">API Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {activeKey.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {partner.api_keys.length > 1 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Key History</p>
                <div className="space-y-2">
                  {partner.api_keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <code className="text-xs">{key.api_key_prefix}...</code>
                      <div className="flex items-center gap-2">
                        <Badge variant={key.environment === "live" ? "default" : "outline"} className="text-xs">
                          {key.environment}
                        </Badge>
                        <Badge variant={key.is_active ? "default" : "secondary"} className="text-xs">
                          {key.is_active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
