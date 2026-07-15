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
import { Plus, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface SuperPartner {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  super_partner_status: string | null;
  can_create_proposals: boolean | null;
  sp_commission_override: number | null;
  recruit_default_commission: number | null;
  created_at: string;
}

interface CompanyLite {
  id: string;
  company_name: string;
  super_partner_id: string | null;
}

interface LinkRequest {
  id: string;
  super_partner_id: string;
  company_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  notes: string | null;
}

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

interface SpCompanyRow {
  company_id: string;
  company_name: string;
  super_partner_linked_at: string | null;
  active_member_count: number;
  total_signed_mwp: number;
  members: MemberRow[];
}

export default function AdminSuperPartnerManagement() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<SuperPartner[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSP, setSelectedSP] = useState<string | null>(null);
  const [spCompanies, setSpCompanies] = useState<Record<string, SpCompanyRow[]>>({});
  const [linkCompanyId, setLinkCompanyId] = useState<string>("");
  const [expandedCompany, setExpandedCompany] = useState<Record<string, boolean>>({});
  const [overrideDraft, setOverrideDraft] = useState<Record<string, { sp: string; recruit: string }>>({});
  const [savingOverride, setSavingOverride] = useState<Record<string, boolean>>({});

  const [newSP, setNewSP] = useState({ email: "", first_name: "", last_name: "", company_name: "", phone: "" });

  // Promote existing user flow
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteLookup, setPromoteLookup] = useState<{ id: string; email: string; role: string | null; first_name: string | null; last_name: string | null } | null>(null);
  const [promoteSearching, setPromoteSearching] = useState(false);


  const loadAll = async () => {
    setLoading(true);
    const { data: sps } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, company_name, phone, super_partner_status, can_create_proposals, sp_commission_override, recruit_default_commission, created_at")
      .eq("role", "super_partner")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setPartners((sps as SuperPartner[]) || []);

    const rateMap: Record<string, number> = {};
    await Promise.all((sps || []).map(async (sp: any) => {
      const { data } = await supabase.rpc("get_super_partner_rate", { p_super_partner_id: sp.id });
      rateMap[sp.id] = Number(data || 0);
    }));
    setRates(rateMap);

    const { data: cos } = await (supabase as any)
      .from("companies")
      .select("id, company_name, super_partner_id");
    setCompanies((cos as CompanyLite[]) || []);

    const { data: reqs } = await supabase
      .from("super_partner_link_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });
    setRequests((reqs as unknown as LinkRequest[]) || []);

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);





  const loadSpCompanies = async (spId: string) => {
    const { data, error } = await (supabase as any).rpc("get_super_partner_companies", { p_super_partner_id: spId });
    if (error) { toast({ title: "Failed to load companies", description: error.message, variant: "destructive" }); return; }
    const rows = ((data as any[]) || []).map((r) => ({ ...r, members: Array.isArray(r.members) ? r.members : [] }));
    setSpCompanies((p) => ({ ...p, [spId]: rows }));
  };

  const createSuperPartner = async () => {
    if (!newSP.email.trim()) return;
    const { data, error } = await supabase.functions.invoke("create-super-partner", { body: newSP });
    const fnError = (data as any)?.error;
    if (error || fnError) {
      let description = fnError || error?.message || "Unknown error";
      const ctx: any = (error as any)?.context;
      if (!fnError && ctx && typeof ctx.json === "function") {
        try { const body = await ctx.json(); if (body?.error) description = body.error; } catch { /* ignore */ }
      }
      toast({ title: "Create failed", description, variant: "destructive" });
      return;
    }
    toast({ title: "Super partner created", description: newSP.email });
    setCreateOpen(false);
    setNewSP({ email: "", first_name: "", last_name: "", company_name: "", phone: "" });
    loadAll();
  };

  const lookupPromoteUser = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return;
    setPromoteSearching(true);
    setPromoteLookup(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name")
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    setPromoteSearching(false);
    if (error) { toast({ title: "Lookup failed", description: error.message, variant: "destructive" }); return; }
    if (!data) { toast({ title: "User not found", description: `No active profile with email ${email}`, variant: "destructive" }); return; }
    setPromoteLookup(data as any);
  };

  const promoteExistingUser = async () => {
    if (!promoteLookup) return;
    if (promoteLookup.role === "super_partner") {
      toast({ title: "Already a Super Partner", description: promoteLookup.email });
      return;
    }
    if (promoteLookup.role !== "agent") {
      toast({
        title: "Only agents can be promoted",
        description: `${promoteLookup.email} is currently a ${promoteLookup.role ?? "unknown"}. Change them to 'agent' first.`,
        variant: "destructive",
      });
      return;
    }
    const { error } = await (supabase as any).rpc("upgrade_agent_to_super_partner", { p_agent_id: promoteLookup.id });
    if (error) { toast({ title: "Promotion failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Promoted to Super Partner", description: promoteLookup.email });
    setPromoteOpen(false);
    setPromoteEmail("");
    setPromoteLookup(null);
    loadAll();
  };

  const linkCompany = async (super_partner_id: string, company_id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("companies")
      .update({
        super_partner_id,
        super_partner_linked_at: new Date().toISOString(),
        super_partner_linked_by: user?.id ?? null,
      })
      .eq("id", company_id);
    if (error) { toast({ title: "Link failed", description: error.message, variant: "destructive" }); return; }
    const { data: count, error: berr } = await supabase.rpc("backfill_super_partner_commissions", {
      p_super_partner_id: super_partner_id,
    });
    if (berr) toast({ title: "Backfill warning", description: berr.message });
    else toast({ title: "Company linked", description: `Backfilled ${count ?? 0} commission rows.` });
    loadAll();
    loadSpCompanies(super_partner_id);
  };

  const unlinkCompany = async (super_partner_id: string, company_id: string) => {
    const { error } = await (supabase as any)
      .from("companies")
      .update({ super_partner_id: null, super_partner_linked_at: null, super_partner_linked_by: null })
      .eq("id", company_id);
    if (error) toast({ title: "Unlink failed", description: error.message, variant: "destructive" });
    else toast({ title: "Company unlinked", description: "Commission history preserved." });
    loadAll();
    loadSpCompanies(super_partner_id);
  };

  const setStatus = async (id: string, status: string) => {
    // The sync_super_partner_status DB trigger handles role + user_roles sync.
    const { error } = await supabase
      .from("profiles")
      .update({ super_partner_status: status })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Status: ${status}` });
    loadAll();
  };

  const toggleCanCreateProposals = async (id: string, value: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ can_create_proposals: value })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    if (value) {
      // Ensure SP has a client referral link; unique (owner_id, link_type) makes this idempotent
      const { error: linkError } = await supabase
        .from("referral_links")
        .insert({ owner_id: id, link_type: "client" });
      if (linkError && !/duplicate key|unique/i.test(linkError.message)) {
        toast({ title: "Referral link warning", description: linkError.message, variant: "destructive" });
      }
    }
    toast({ title: value ? "Direct proposal creation enabled" : "Direct proposal creation disabled" });
    loadAll();
  };

  const saveCommissionOverrides = async (sp: SuperPartner) => {
    const draft = overrideDraft[sp.id] ?? {
      sp: sp.sp_commission_override != null ? String(sp.sp_commission_override) : "",
      recruit: sp.recruit_default_commission != null ? String(sp.recruit_default_commission) : "",
    };
    const parse = (s: string): number | null => {
      const t = s.trim();
      if (t === "") return null;
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    };
    const sp_val = parse(draft.sp);
    const recruit_val = parse(draft.recruit);
    if (draft.sp.trim() !== "" && sp_val === null) {
      toast({ title: "Invalid SP rate", variant: "destructive" });
      return;
    }
    if (draft.recruit.trim() !== "" && recruit_val === null) {
      toast({ title: "Invalid recruit rate", variant: "destructive" });
      return;
    }
    setSavingOverride((p) => ({ ...p, [sp.id]: true }));
    const { error } = await supabase
      .from("profiles")
      .update({ sp_commission_override: sp_val, recruit_default_commission: recruit_val })
      .eq("id", sp.id);
    if (error) {
      setSavingOverride((p) => ({ ...p, [sp.id]: false }));
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    // Refresh SP rate + historical rows
    const { data: recalcCount, error: recErr } = await supabase.rpc("recalc_super_partner_rates", { p_super_partner_id: sp.id });
    if (recErr) toast({ title: "Rates saved (recalc warning)", description: recErr.message });
    else toast({ title: "Overrides saved", description: `Updated ${recalcCount ?? 0} historical commission rows.` });
    setSavingOverride((p) => ({ ...p, [sp.id]: false }));
    await loadAll();
  };

  const applyDefaultToRecruits = async (sp: SuperPartner) => {
    if (sp.recruit_default_commission == null) {
      toast({ title: "Set a default recruit rate first", variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any).rpc("apply_sp_default_to_recruits", { p_super_partner_id: sp.id });
    if (error) { toast({ title: "Apply failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Default applied", description: `Updated ${data ?? 0} linked companies.` });
    loadAll();
    loadSpCompanies(sp.id);
  };

  const reviewRequest = async (req: LinkRequest, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (approve) {
      if (req.request_type === "link") {
        await linkCompany(req.super_partner_id, req.company_id);
      } else {
        await unlinkCompany(req.super_partner_id, req.company_id);
      }
    }
    await supabase.from("super_partner_link_requests").update({
      status: approve ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    }).eq("id", req.id);
    loadAll();
  };

  const linkedCompaniesFor = (spId: string) => companies.filter((c) => c.super_partner_id === spId);
  const unlinkedCompanies = companies.filter((c) => !c.super_partner_id);

  const handleManage = (spId: string) => {
    const next = selectedSP === spId ? null : spId;
    setSelectedSP(next);
    if (next && !spCompanies[next]) loadSpCompanies(next);
  };

  return (
    <DashboardLayout requiredRole="admin">
      <div className="flex items-center justify-between">
        <DashboardHeader title="Super Partners" description="Manage B2B2B aggregator accounts and their linked companies." />
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
          <Dialog open={promoteOpen} onOpenChange={(o) => { setPromoteOpen(o); if (!o) { setPromoteEmail(""); setPromoteLookup(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Promote existing user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Promote existing user to Super Partner</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Use this for users that already have an account. They must currently be an <strong>agent</strong>. To onboard a brand-new email, use "Add Super Partner".
                </p>
                <div>
                  <Label>Email</Label>
                  <div className="flex gap-2">
                    <Input type="email" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="user@example.com" />
                    <Button variant="outline" onClick={lookupPromoteUser} disabled={!promoteEmail.trim() || promoteSearching}>
                      {promoteSearching ? "Searching…" : "Find"}
                    </Button>
                  </div>
                </div>
                {promoteLookup && (
                  <div className="rounded-md border p-3 text-sm space-y-1">
                    <div><strong>Name:</strong> {[promoteLookup.first_name, promoteLookup.last_name].filter(Boolean).join(" ") || "—"}</div>
                    <div><strong>Email:</strong> {promoteLookup.email}</div>
                    <div><strong>Current role:</strong> <Badge variant="outline">{promoteLookup.role ?? "unknown"}</Badge></div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancel</Button>
                <Button onClick={promoteExistingUser} disabled={!promoteLookup || promoteLookup.role !== "agent"}>
                  Promote to Super Partner
                </Button>
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
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const sp = partners.find((p) => p.id === r.super_partner_id);
                  const co = companies.find((c) => c.id === r.company_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{sp?.company_name || sp?.email || r.super_partner_id.slice(0, 8)}</TableCell>
                      <TableCell>{co?.company_name || r.company_id.slice(0, 8)}</TableCell>
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
                  <TableHead className="text-right">Linked Companies</TableHead>
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
                    <TableCell className="text-right">{linkedCompaniesFor(sp.id).length}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleManage(sp.id)}>
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
        const detail = spCompanies[selectedSP] || [];
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

              <div className="flex items-center gap-3 rounded-md border p-3">
                <input
                  id={`ccp-${sp.id}`}
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!sp.can_create_proposals}
                  onChange={(e) => toggleCanCreateProposals(sp.id, e.target.checked)}
                />
                <Label htmlFor={`ccp-${sp.id}`} className="cursor-pointer">
                  Allow direct proposal creation
                </Label>
                <span className="text-xs text-muted-foreground ml-auto">
                  When enabled, this Super Partner sees Create Proposal and My Clients in their nav.
                </span>
              </div>

              {(() => {
                const draft = overrideDraft[sp.id] ?? {
                  sp: sp.sp_commission_override != null ? String(sp.sp_commission_override) : "",
                  recruit: sp.recruit_default_commission != null ? String(sp.recruit_default_commission) : "",
                };
                const setDraft = (patch: Partial<typeof draft>) =>
                  setOverrideDraft((p) => ({ ...p, [sp.id]: { ...draft, ...patch } }));
                return (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Commission overrides</Label>
                      <span className="text-xs text-muted-foreground">
                        Current effective SP rate: {(rates[sp.id] ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Super partner rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave blank to use MWp tier default (3% / 5%)"
                          value={draft.sp}
                          onChange={(e) => setDraft({ sp: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Default recruit rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave blank to use portfolio default (4% / 7%)"
                          value={draft.recruit}
                          onChange={(e) => setDraft({ recruit: e.target.value })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recruits signing up via this SP's referral link (and any linked company without its own override)
                      automatically get the default recruit rate. Existing company-level overrides are preserved.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyDefaultToRecruits(sp)}
                        disabled={sp.recruit_default_commission == null}
                      >
                        Apply default to existing recruits
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveCommissionOverrides(sp)}
                        disabled={!!savingOverride[sp.id]}
                      >
                        {savingOverride[sp.id] ? "Saving…" : "Save overrides"}
                      </Button>
                    </div>
                  </div>
                );
              })()}


              <div>
                <Label className="mb-2 block">Add a company</Label>
                <div className="flex gap-2">
                  <Select value={linkCompanyId} onValueChange={setLinkCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Select unlinked company…" /></SelectTrigger>
                    <SelectContent>
                      {unlinkedCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { if (linkCompanyId) { linkCompany(sp.id, linkCompanyId); setLinkCompanyId(""); } }} disabled={!linkCompanyId}>
                    Link + Backfill
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Linked companies</Label>
                {detail.length === 0 ? (
                  <div className="text-muted-foreground text-sm">No companies linked.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Members</TableHead>
                        <TableHead className="text-right">Signed MWp</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.map((c) => {
                        const isOpen = !!expandedCompany[c.company_id];
                        return (
                          <>
                            <TableRow key={c.company_id}>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => setExpandedCompany((p) => ({ ...p, [c.company_id]: !isOpen }))}>
                                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell>{c.company_name}</TableCell>
                              <TableCell className="text-right">{c.active_member_count}</TableCell>
                              <TableCell className="text-right">{Number(c.total_signed_mwp || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => unlinkCompany(sp.id, c.company_id)}>Remove</Button>
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
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </DashboardLayout>
  );
}
