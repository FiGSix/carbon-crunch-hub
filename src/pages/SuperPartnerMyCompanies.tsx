import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MemberRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  status: string;
  signed_mwp: number;
  proposal_count: number;
}

interface CompanyRow {
  company_id: string;
  company_name: string;
  super_partner_linked_at: string | null;
  active_member_count: number;
  total_signed_mwp: number;
  members: MemberRow[];
}

export default function SuperPartnerMyCompanies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [linkCompanyId, setLinkCompanyId] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_super_partner_companies");
    if (error) toast({ title: "Failed to load companies", description: error.message, variant: "destructive" });
    setCompanies(((data as any[]) || []).map((row) => ({
      ...row,
      members: Array.isArray(row.members) ? row.members : [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const requestCompanyLink = async () => {
    if (!user || !linkCompanyId.trim()) return;
    const { error } = await (supabase as any).rpc("request_company_link", { p_company_id: linkCompanyId.trim() });
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Link request submitted", description: "An admin will review your request." });
    setLinkCompanyId("");
  };

  const inviteAgent = async () => {
    if (!user || !inviteEmail.trim() || !inviteCompanyId) return;
    const { error } = await supabase.functions.invoke("send-agent-invitation", {
      body: { email: inviteEmail.trim(), target_company_id: inviteCompanyId },
    });
    if (error) toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Invitation sent", description: inviteEmail.trim() }); setInviteEmail(""); }
  };

  return (
    <DashboardLayout requiredRole="super_partner">
      <DashboardHeader title="My Companies" description="Companies linked to your Super Partner account." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invite a new agent into a company</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Target company</Label>
            <Select value={inviteCompanyId} onValueChange={setInviteCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select a linked company…" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.company_id} value={c.company_id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Agent email</Label>
            <div className="flex gap-2">
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="agent@example.com" />
              <Button onClick={inviteAgent} disabled={!inviteEmail.trim() || !inviteCompanyId}>Invite</Button>
            </div>
            <p className="text-xs text-muted-foreground">The new agent auto-joins the selected company on signup.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Request to link an existing company</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Company ID</Label>
            <div className="flex gap-2">
              <Input value={linkCompanyId} onChange={(e) => setLinkCompanyId(e.target.value)} placeholder="UUID of the target company" />
              <Button onClick={requestCompanyLink} disabled={!linkCompanyId.trim()}>Request</Button>
            </div>
            <p className="text-xs text-muted-foreground">An admin will review and approve the link.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked companies</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : companies.length === 0 ? (
            <div className="text-muted-foreground">No companies linked yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Signed MWp</TableHead>
                  <TableHead>Linked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => {
                  const isOpen = !!expanded[c.company_id];
                  return (
                    <>
                      <TableRow key={c.company_id} className="cursor-pointer" onClick={() => setExpanded((p) => ({ ...p, [c.company_id]: !isOpen }))}>
                        <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-medium">{c.company_name}</TableCell>
                        <TableCell className="text-right">{c.active_member_count}</TableCell>
                        <TableCell className="text-right">{Number(c.total_signed_mwp || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.super_partner_linked_at ? new Date(c.super_partner_linked_at).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${c.company_id}-members`}>
                          <TableCell></TableCell>
                          <TableCell colSpan={4} className="bg-muted/30">
                            {c.members.length === 0 ? (
                              <div className="text-muted-foreground text-sm py-2">No members.</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Signed MWp</TableHead>
                                    <TableHead className="text-right">Proposals</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {c.members.map((m) => (
                                    <TableRow key={m.user_id}>
                                      <TableCell>
                                        <div>{[m.first_name, m.last_name].filter(Boolean).join(" ") || m.email}</div>
                                        <div className="text-xs text-muted-foreground">{m.email}</div>
                                      </TableCell>
                                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                                      <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
                                      <TableCell className="text-right">{Number(m.signed_mwp || 0).toFixed(2)}</TableCell>
                                      <TableCell className="text-right">{m.proposal_count}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
