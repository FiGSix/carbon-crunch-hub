import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

interface PortalDefault {
  brand: string;
  portal_url: string | null;
  notes: string | null;
}

export function InverterPortalDefaultsManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PortalDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBrand, setSavingBrand] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inverter_portal_defaults")
      .select("brand, portal_url, notes")
      .order("brand");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRow = (brand: string, patch: Partial<PortalDefault>) => {
    setRows(prev => prev.map(r => (r.brand === brand ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row: PortalDefault) => {
    setSavingBrand(row.brand);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("inverter_portal_defaults")
      .update({
        portal_url: row.portal_url || null,
        notes: row.notes || null,
        updated_by: user?.id ?? null,
      })
      .eq("brand", row.brand);
    setSavingBrand(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${row.brand} updated.` });
    }
  };

  const deleteRow = async (brand: string) => {
    if (!confirm(`Delete default for ${brand}?`)) return;
    const { error } = await supabase.from("inverter_portal_defaults").delete().eq("brand", brand);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRows(prev => prev.filter(r => r.brand !== brand));
    }
  };

  const addRow = async () => {
    const brand = newBrand.trim();
    if (!brand) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("inverter_portal_defaults")
      .insert({ brand, portal_url: newUrl.trim() || null, updated_by: user?.id ?? null });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewBrand("");
    setNewUrl("");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inverter Portal Defaults</CardTitle>
        <CardDescription>
          Default monitoring Portal URL per inverter brand. Used to prepopulate the Data Access section
          during project onboarding when the meter type is SSEG.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Brand</TableHead>
                  <TableHead>Portal URL</TableHead>
                  <TableHead className="w-[220px]">Notes</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.brand}>
                    <TableCell className="font-medium">{row.brand}</TableCell>
                    <TableCell>
                      <Input
                        value={row.portal_url || ""}
                        onChange={e => updateRow(row.brand, { portal_url: e.target.value })}
                        placeholder="https://…"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.notes || ""}
                        onChange={e => updateRow(row.brand, { notes: e.target.value })}
                        placeholder="Optional"
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveRow(row)}
                        disabled={savingBrand === row.brand}
                      >
                        {savingBrand === row.brand
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Save className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteRow(row.brand)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">New brand</label>
                <Input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="e.g. NewBrand" />
              </div>
              <div className="flex-[2]">
                <label className="text-xs text-muted-foreground">Portal URL</label>
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://…" />
              </div>
              <Button onClick={addRow} disabled={!newBrand.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
