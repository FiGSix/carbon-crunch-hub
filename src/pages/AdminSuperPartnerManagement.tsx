import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw } from "lucide-react";

interface SuperPartner {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  super_partner_status: string | null;
  can_create_proposals: boolean | null;
  created_at: string;
}

interface AgentLite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  super_partner_id: string | null;
}

interface LinkRequest {
  id: string;
  super_partner_id: string;
  agent_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  notes: string | null;
}

export default function AdminSuperPartnerManagement() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<SuperPartner[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSP, setSelectedSP] = useState<string | null>(null);
  const [linkAgentId, setLinkAgentId] = useState<string>("");

  const [newSP, setNewSP] = useState({ email: "", first_name: "", last_name: "", company_name: "", phone: "" });

  const loadAll = async () => {
    setLoading(true);
    const { data: sps } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, company_name, phone, super_partner_status, can_create_proposals, created_at")
      .eq("role", "super_partner")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setPartners((sps as SuperPartner[]) || []);

    // live rates
    const rateMap: Record<string, number> = {};
    await Promise.all((sps || []).map(async (sp: any) => {
      const { data } = await supabase.rpc("get_super_partner_rate", { p_super_partner_id: sp.id });
      rateMap[sp.id] = Number(data || 0);
    }));
    setRates(rateMap);

    const { data: ags } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, company_name, super_partner_id")
      .eq("role", "agent")
      .is("deleted_at", null);
    setAgents((ags as AgentLite[]) || []);

    const { data: reqs } = await supabase
      .from("super_partner_link_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });
    setRequests((reqs as LinkRequest[]) || []);

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const createSuperPartner = async () => {
    if (!newSP.email.trim()) return;
    const { data, error } = await supabase.functions.invoke("create-super-partner", { body: newSP });
    // Surface the edge function's actual error body when present
    const fnError = (data as any)?.error;
    if (error || fnError) {
      let description = fnError || error?.message || "Unknown error";
      // FunctionsHttpError exposes a Response on `context`
      const ctx: any = (error as any)?.context;
      if (!fnError && ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) description = body.error;
        } catch { /* ignore */ }
      }
      toast({ title: "Create failed", description, variant: "destructive" });
      return;
    }
    toast({ title: "Super partner created", description: newSP.email });
    setCreateOpen(false);
    setNewSP({ email: "", first_name: "", last_name: "", company_name: "", phone: "" });
    loadAll();
  };

  const linkAgent = async (super_partner_id: string, agent_id: string) => {
    const { error } = await supabase.from("profiles").update({ super_partner_id }).eq("id", agent_id);
    if (error) { toast({ title: "Link failed", description: error.message, variant: "destructive" }); return; }
    const { data: count, error: berr } = await supabase.rpc("backfill_super_partner_commissions", {
      p_agent_id: agent_id, p_super_partner_id: super_partner_id,
    });
    if (berr) toast({ title: "Backfill warning", description: berr.message });
    else toast({ title: "Agent linked", description: `Backfilled ${count ?? 0} commission rows.` });
    loadAll();
  };

  const unlinkAgent = async (agent_id: string) => {
    const { error } = await supabase.from("profiles").update({ super_partner_id: null }).eq("id", agent_id);
    if (error) toast({ title: "Unlink failed", description: error.message, variant: "destructive" });
    else toast({ title: "Agent unlinked", description: "Commission history preserved." });
    loadAll();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ super_partner_status: status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Status: ${status}` }); loadAll(); }
  };

  const toggleCanCreateProposals = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ can_create_proposals: value })
      .eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: value ? "Direct proposal creation enabled" : "Direct proposal creation disabled" }); loadAll(); }
  };

  const reviewRequest = async (req: LinkRequest, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (approve) {
      if (req.request_type === "link") {
        await linkAgent(req.super_partner_id, req.agent_id);
      } else {
        await unlinkAgent(req.agent_id);
      }
    }
    await supabase.from("super_partner_link_requests").update({
      status: approve ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    }).eq("id", req.id);
    loadAll();
  };

  const linkedAgentsFor = (spId: string) => agents.filter((a) => a.super_partner_id === spId);
  const unlinkedAgents = agents.filter((a) => !a.super_partner_id);

  return (
    <DashboardLayout requiredRole="admin">
      <div className="flex items-center justify-between">
        <DashboardHeader title="Super Partners" description="Manage B2B2B aggregator accounts and their linked agents." />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Super Partner</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Super Partner</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Email *</Label><Input type="email" value={newSP.email} onChange={(e) => setNewSP({ ...newSP, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First name</Label><Input value={newSP.first_name} onChange={(e) => setNewSP({ ...newSP, first_name: e.target.value })} /></div>
                  <div><Label>Last name</Label><Input value={newSP.last_name} onChange={(e) => setNewSP({ ...newSP, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Company</Label><Input value={newSP.company_name} onChange={(e) => setNewSP({ ...newSP, company_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={newSP.phone} onChange={(e) => setNewSP({ ...newSP, phone: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createSuperPartner} disabled={!newSP.email.trim()}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {requests.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Pending link requests ({requests.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Super Partner</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const sp = partners.find((p) => p.id === r.super_partner_id);
                  const ag = agents.find((a) => a.id === r.agent_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{sp?.company_name || sp?.email || r.super_partner_id.slice(0, 8)}</TableCell>
                      <TableCell>{ag?.email || r.agent_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline">{r.request_type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.notes || ""}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => reviewRequest(r, false)}>Reject</Button>
                        <Button size="sm" onClick={() => reviewRequest(r, true)}>Approve</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Super Partners</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : partners.length === 0 ? (
            <div className="text-muted-foreground">No super partners yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Current Rate</TableHead>
                  <TableHead className="text-right">Linked Agents</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{sp.company_name || "—"}</TableCell>
                    <TableCell>
                      <div>{[sp.first_name, sp.last_name].filter(Boolean).join(" ") || "—"}</div>
                      <div className="text-xs text-muted-foreground">{sp.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sp.super_partner_status === "active" ? "default" : "outline"}>
                        {sp.super_partner_status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{(rates[sp.id] ?? 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{linkedAgentsFor(sp.id).length}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedSP(selectedSP === sp.id ? null : sp.id)}>
                        {selectedSP === sp.id ? "Close" : "Manage"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedSP && (() => {
        const sp = partners.find((p) => p.id === selectedSP)!;
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Manage: {sp.company_name || sp.email}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(sp.id, sp.super_partner_status === "suspended" ? "active" : "suspended")}>
                  {sp.super_partner_status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  const { data, error } = await supabase.rpc("recalc_super_partner_rates", { p_super_partner_id: sp.id });
                  if (error) toast({ title: "Recalc failed", description: error.message, variant: "destructive" });
                  else { toast({ title: "Rates recalculated", description: `Updated ${data ?? 0} commission rows.` }); loadAll(); }
                }}>
                  Recalculate rates
                </Button>
              </div>

              <div>
                <Label className="mb-2 block">Add an existing agent</Label>
                <div className="flex gap-2">
                  <Select value={linkAgentId} onValueChange={setLinkAgentId}>
                    <SelectTrigger><SelectValue placeholder="Select unlinked agent…" /></SelectTrigger>
                    <SelectContent>
                      {unlinkedAgents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.email} — {a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { if (linkAgentId) { linkAgent(sp.id, linkAgentId); setLinkAgentId(""); } }} disabled={!linkAgentId}>
                    Link + Backfill
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Linked agents</Label>
                {linkedAgentsFor(sp.id).length === 0 ? (
                  <div className="text-muted-foreground text-sm">No agents linked.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedAgentsFor(sp.id).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div>{[a.first_name, a.last_name].filter(Boolean).join(" ") || a.email}</div>
                            <div className="text-xs text-muted-foreground">{a.email}</div>
                          </TableCell>
                          <TableCell>{a.company_name || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => unlinkAgent(a.id)}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </DashboardLayout>
  );
}
