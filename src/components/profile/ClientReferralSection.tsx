import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Mail, RefreshCw, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function ClientReferralSection() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Fetch sent invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["client-invitations", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_invitations" as any)
        .select("*")
        .eq("invited_by", profile?.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.id,
  });

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("send-client-invitation", {
        body: { email, firstName: firstName || undefined, lastName: lastName || undefined },
      });

      if (response.error) throw new Error(response.error.message);
      const data = response.data;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Invitation Sent!", description: `Invitation sent to ${email}.` });
      setEmail("");
      setFirstName("");
      setLastName("");
      queryClient.invalidateQueries({ queryKey: ["client-invitations"] });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitation: any) => {
    setResendingId(invitation.id);
    try {
      const response = await supabase.functions.invoke("send-client-invitation", {
        body: { email: invitation.email, firstName: invitation.first_name, resend: true },
      });

      if (response.error) throw new Error(response.error.message);
      const data = response.data;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Resent!", description: `Invitation resent to ${invitation.email}.` });
      queryClient.invalidateQueries({ queryKey: ["client-invitations"] });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <CardTitle>Invite a Client</CardTitle>
        </div>
        <CardDescription>
          Send an email invitation for someone to join CrunchCarbon
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invitation Form */}
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ref-email" required>Email Address</Label>
            <Input
              id="ref-email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ref-first-name">First Name</Label>
              <Input
                id="ref-first-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-last-name">Last Name</Label>
              <Input
                id="ref-last-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Mail className="h-4 w-4 mr-2" />Send Invitation</>
            )}
          </Button>
        </form>

        {/* Sent Invitations List */}
        {invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sent Invitations</h4>
            <div className="space-y-2">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={inv.status === 'accepted' ? 'default' : inv.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs">
                        {inv.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {inv.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(inv)}
                      disabled={resendingId === inv.id}
                    >
                      {resendingId === inv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
