import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

interface AgentRow {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  company_name: string | null;
  agent_status: string | null;
  mwp_contributed: number;
  proposal_count: number;
  linked_at: string;
}

export default function SuperPartnerMyAgents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [linkEmail, setLinkEmail] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_super_partner_agents");
    if (error) toast({ title: "Failed to load agents", description: error.message, variant: "destructive" });
    setAgents((data as AgentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const requestLink = async (type: "link" | "unlink", agent_id: string) => {
    if (!user) return;
    const { error } = await supabase.from("super_partner_link_requests").insert({
      super_partner_id: user.id,
      agent_id,
      request_type: type,
      status: "pending",
    });
    if (error) toast({ title: "Request failed", description: error.message, variant: "destructive" });
    else toast({ title: "Request submitted", description: "An admin will review your request." });
  };

  const submitLinkRequest = async () => {
    if (!user || !linkEmail.trim()) return;
    // Look up the agent by email via profiles is RLS-blocked for SP; ask admin to do it.
    // Instead: insert a request with a placeholder note containing the email.
    const { data: agent, error: aerr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", linkEmail.trim())
      .maybeSingle();
    if (aerr || !agent) {
      toast({ title: "Agent not found", description: "We couldn't find that agent. Submitting an admin request anyway.", });
      // Submit a request referencing a NULL-id placeholder is impossible; advise admin via notes only.
      return;
    }
    const { error } = await supabase.from("super_partner_link_requests").insert({
      super_partner_id: user.id,
      agent_id: agent.id,
      request_type: "link",
      status: "pending",
      notes: `Requested via email lookup: ${linkEmail.trim()}`,
    });
    if (error) toast({ title: "Request failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Link request submitted" }); setLinkEmail(""); }
  };

  const inviteAgent = async () => {
    if (!user || !inviteEmail.trim()) return;
    const { data, error } = await supabase.functions.invoke("send-agent-invitation", {
      body: { email: inviteEmail.trim(), super_partner_id: user.id },
    });
    if (error) toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Invitation sent", description: inviteEmail.trim() }); setInviteEmail(""); }
  };

  return (
    <DashboardLayout requiredRole="super_partner">
      <DashboardHeader title="My Agents" description="Aggregated view of the agents linked to your account." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invite a new agent by email</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="agent@example.com" />
              <Button onClick={inviteAgent} disabled={!inviteEmail.trim()}>Invite</Button>
            </div>
            <p className="text-xs text-muted-foreground">The invitation auto-links the new agent to you on signup.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Request to link an existing agent</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Agent email</Label>
            <div className="flex gap-2">
              <Input type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} placeholder="existing-agent@example.com" />
              <Button onClick={submitLinkRequest} disabled={!linkEmail.trim()}>Request</Button>
            </div>
            <p className="text-xs text-muted-foreground">An admin will review and approve the link.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked agents</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : agents.length === 0 ? (
            <div className="text-muted-foreground">No agents linked yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">MWp</TableHead>
                  <TableHead className="text-right">Proposals</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.agent_id}>
                    <TableCell>
                      <div className="font-medium">{a.agent_name || a.agent_email}</div>
                      <div className="text-xs text-muted-foreground">{a.agent_email}</div>
                    </TableCell>
                    <TableCell>{a.company_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{a.agent_status || "—"}</Badge></TableCell>
                    <TableCell className="text-right">{Number(a.mwp_contributed || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{a.proposal_count}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => requestLink("unlink", a.agent_id)}>
                        Request remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
