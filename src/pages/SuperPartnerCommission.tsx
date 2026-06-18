import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  company: string;
  mwp: number;
  rate: number;
  amount: number;
}

const fmtZar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(n || 0);

export default function SuperPartnerCommission() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_super_partner_commission_by_company");
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout requiredRole="super_partner">
      <DashboardHeader title="Commission" description="Commission rolled up per linked partner company." />
      <Card>
        <CardHeader><CardTitle className="text-base">Commission by company</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No commission entries yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">MWp</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.company}>
                    <TableCell>{r.company}</TableCell>
                    <TableCell className="text-right">{Number(r.mwp).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.rate).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{fmtZar(Number(r.amount))}</TableCell>
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
