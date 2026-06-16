import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  proposal_id: string | null;
  proposal_title: string | null;
  client_name: string | null;
  agent_name: string | null;
  agent_email: string | null;
  system_size_kwp: number | null;
  signed_at: string | null;
  commission_rate: number;
  commission_amount: number;
  commission_status: string;
  calculated_at: string;
  paid_at: string | null;
  notes: string | null;
}

const statusVariant = (s: string): "default" | "secondary" | "outline" => {
  if (s === "paid") return "default";
  if (s === "approved") return "secondary";
  return "outline";
};

const fmtZar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(n || 0);

export default function SuperPartnerCommission() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_super_partner_commission_ledger");
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout requiredRole="super_partner">
      <DashboardHeader title="Commission" description="Per-proposal commission ledger." />
      <Card>
        <CardHeader><CardTitle className="text-base">All commissions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No commission entries yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signed</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">MWp</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.signed_at ? new Date(r.signed_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{r.proposal_title || r.proposal_id?.slice(0, 8) || "—"}</TableCell>
                    <TableCell>{r.client_name || "—"}</TableCell>
                    <TableCell>
                      <div>{r.agent_name?.trim() || r.agent_email || "—"}</div>
                      {r.agent_email && <div className="text-xs text-muted-foreground">{r.agent_email}</div>}
                    </TableCell>
                    <TableCell className="text-right">{((Number(r.system_size_kwp) || 0) / 1000).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.commission_rate).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{fmtZar(Number(r.commission_amount))}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.commission_status)}>{r.commission_status}</Badge></TableCell>
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
