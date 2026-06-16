import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  token: string;
  link_type: "client" | "agent";
  is_active: boolean;
  clicks: number;
  signups: number;
  conversions: number;
  created_at: string;
  owner: { first_name: string | null; last_name: string | null; email: string; role: string } | null;
}

export default function AdminReferralLinks() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("referral_links")
      .select(
        "id, token, link_type, is_active, clicks, signups, conversions, created_at, owner:profiles!referral_links_owner_id_fkey(first_name,last_name,email,role)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from("referral_links").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referral links</h1>
          <p className="text-muted-foreground mt-1">All partner and super-partner referral links.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Signups</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">
                          {[r.owner?.first_name, r.owner?.last_name].filter(Boolean).join(" ") || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.owner?.email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.owner?.role ?? "—"}</Badge></TableCell>
                      <TableCell><Badge>{r.link_type}</Badge></TableCell>
                      <TableCell className="text-right">{r.clicks}</TableCell>
                      <TableCell className="text-right">{r.signups}</TableCell>
                      <TableCell className="text-right">{r.conversions}</TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={() => void toggle(r.id, r.is_active)} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No referral links yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
