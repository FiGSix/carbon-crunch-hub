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
import { Loader2, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";

interface PartnerInvitation {
  id: string;
  email: string;
  company_name: string;
  contact_name: string | null;
  environment: string;
  requested_scopes: string[];
  status: string;
  created_at: string;
  expires_at: string;
  notes: string | null;
}

interface PendingPartnersTableProps {
  onRefresh: () => void;
}

export function PendingPartnersTable({ onRefresh }: PendingPartnersTableProps) {
  const [invitations, setInvitations] = useState<PartnerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_invitations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion to handle the jsonb field
      const typedData = (data || []).map(inv => ({
        ...inv,
        requested_scopes: Array.isArray(inv.requested_scopes) 
          ? inv.requested_scopes as string[]
          : [],
      }));
      
      setInvitations(typedData);
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      toast({
        title: "Error",
        description: "Failed to load pending invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleResend = async (invitation: PartnerInvitation) => {
    setResendingId(invitation.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-partner-invitation", {
        body: {
          email: invitation.email,
          companyName: invitation.company_name,
          contactName: invitation.contact_name,
          environment: invitation.environment,
          scopes: invitation.requested_scopes,
          resend: true,
          invitationId: invitation.id,
        },
      });

      if (error) throw error;

      if (data.apiKey) {
        setRevealedApiKey(data.apiKey);
      }

      toast({
        title: "Invitation Resent",
        description: `New invitation sent to ${invitation.email}`,
      });
      
      fetchInvitations();
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("partner_invitations")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been removed",
      });

      setDeleteId(null);
      fetchInvitations();
      onRefresh();
    } catch (error) {
      console.error("Failed to delete invitation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No pending invitations</p>
        <p className="text-sm mt-1">Click "Invite Partner" to send a new invitation</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.company_name}
                  {invitation.contact_name && (
                    <span className="block text-sm text-muted-foreground">
                      {invitation.contact_name}
                    </span>
                  )}
                </TableCell>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant={invitation.environment === "live" ? "default" : "secondary"}>
                    {invitation.environment}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px]">
                  <span className="text-sm text-muted-foreground truncate block">
                    {invitation.requested_scopes.length} scope(s)
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {isExpired(invitation.expires_at) ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : isExpiringSoon(invitation.expires_at) ? (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(invitation.expires_at))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the invitation. The partner will no longer be able to use any sent API keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiKeyRevealDialog
        apiKey={revealedApiKey}
        onClose={() => setRevealedApiKey(null)}
      />
    </>
  );
}
