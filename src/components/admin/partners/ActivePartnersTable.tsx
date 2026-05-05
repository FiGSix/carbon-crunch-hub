import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Key, MoreHorizontal, Shield } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";
import { PartnerDetailsDialog } from "./PartnerDetailsDialog";
import { ManageScopesDialog } from "./ManageScopesDialog";

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

interface ActivePartnersTableProps {
  onRefresh: () => void;
}

export function ActivePartnersTable({ onRefresh }: ActivePartnersTableProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const { toast } = useToast();

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data: partnersData, error: partnersError } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (partnersError) throw partnersError;

      // Fetch API keys for each partner
      const partnersWithKeys: Partner[] = await Promise.all(
        (partnersData || []).map(async (partner) => {
          const { data: keysData } = await supabase
            .from("partner_api_keys")
            .select("*")
            .eq("partner_id", partner.id)
            .order("created_at", { ascending: false });

          return {
            ...partner,
            api_keys: (keysData || []).map(key => ({
              ...key,
              scopes: Array.isArray(key.scopes) ? key.scopes as string[] : [],
              request_count: key.request_count || 0,
            })),
          };
        })
      );

      setPartners(partnersWithKeys);
    } catch (error) {
      console.error("Failed to fetch partners:", error);
      toast({
        title: "Error",
        description: "Failed to load partners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleToggleStatus = async (partner: Partner) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: !partner.is_active })
        .eq("id", partner.id);

      if (error) throw error;

      // Also toggle API keys
      await supabase
        .from("partner_api_keys")
        .update({ is_active: !partner.is_active })
        .eq("partner_id", partner.id);

      toast({
        title: partner.is_active ? "Partner Deactivated" : "Partner Activated",
        description: `${partner.name} has been ${partner.is_active ? "deactivated" : "activated"}`,
      });

      fetchPartners();
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle partner status:", error);
      toast({
        title: "Error",
        description: "Failed to update partner status",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateKey = async (partner: Partner) => {
    setRegeneratingId(partner.id);
    try {
      const activeKey = partner.api_keys.find(k => k.is_active);
      
      const { data, error } = await supabase.functions.invoke("send-partner-invitation", {
        body: {
          email: partner.contact_email,
          companyName: partner.name,
          environment: activeKey?.environment || "test",
          scopes: activeKey?.scopes || [],
          resend: true,
          invitationId: partner.id, // Using partner ID since we're regenerating
        },
      });

      if (error) throw error;

      if (data.apiKey) {
        setRevealedApiKey(data.apiKey);
        toast({
          title: "API Key Regenerated",
          description: "A new API key has been generated and emailed to the partner",
        });
      }

      fetchPartners();
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate API key",
        variant: "destructive",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No active partners</p>
        <p className="text-sm mt-1">Partners will appear here after their invitation is accepted</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => {
              const activeKey = partner.api_keys.find(k => k.is_active) || partner.api_keys[0];
              
              return (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    {partner.name}
                    <span className="block text-sm text-muted-foreground">
                      {partner.contact_email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {activeKey ? (
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {activeKey.api_key_prefix}...
                      </code>
                    ) : (
                      <span className="text-sm text-muted-foreground">No key</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {activeKey && (
                      <Badge variant={activeKey.environment === "live" ? "default" : "secondary"}>
                        {activeKey.environment}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {activeKey?.last_used_at
                      ? formatDistanceToNow(new Date(activeKey.last_used_at), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {activeKey?.request_count?.toLocaleString() || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={partner.is_active}
                        onCheckedChange={() => handleToggleStatus(partner)}
                      />
                      <span className="text-sm">
                        {partner.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedPartner(partner)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRegenerateKey(partner)}
                          disabled={regeneratingId === partner.id}
                        >
                          {regeneratingId === partner.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Key className="h-4 w-4 mr-2" />
                          )}
                          Regenerate Key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ApiKeyRevealDialog
        apiKey={revealedApiKey}
        onClose={() => setRevealedApiKey(null)}
      />

      <PartnerDetailsDialog
        partner={selectedPartner}
        onClose={() => setSelectedPartner(null)}
      />
    </>
  );
}
