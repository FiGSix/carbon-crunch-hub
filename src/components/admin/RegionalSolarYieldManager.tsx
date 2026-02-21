import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RegionalYieldRow {
  id: string;
  province: string;
  yield_kwh_per_kwp: number;
  source: string | null;
}

export function RegionalSolarYieldManager() {
  const [rows, setRows] = useState<RegionalYieldRow[]>([]);
  const [original, setOriginal] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadYields();
  }, []);

  const loadYields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("regional_solar_yields")
        .select("id, province, yield_kwh_per_kwp, source")
        .order("province");

      if (error) throw error;

      const items = (data ?? []) as RegionalYieldRow[];
      setRows(items);
      setOriginal(Object.fromEntries(items.map((r) => [r.id, r.yield_kwh_per_kwp])));
    } catch {
      toast.error("Failed to load regional solar yields");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, yield_kwh_per_kwp: num } : r)));
  };

  const handleSave = async () => {
    const changed = rows.filter((r) => r.yield_kwh_per_kwp !== original[r.id]);
    if (changed.length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      for (const row of changed) {
        const { error } = await supabase
          .from("regional_solar_yields")
          .update({ yield_kwh_per_kwp: row.yield_kwh_per_kwp })
          .eq("id", row.id);
        if (error) throw error;
      }

      setOriginal(Object.fromEntries(rows.map((r) => [r.id, r.yield_kwh_per_kwp])));
      toast.success(`Updated ${changed.length} province(s) successfully`);
    } catch {
      toast.error("Failed to update regional solar yields");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regional Solar Yields</CardTitle>
          <CardDescription>Manage province-specific solar yield factors (kWh/kWp/year) used in energy calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasChanges = rows.some((r) => r.yield_kwh_per_kwp !== original[r.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regional Solar Yields</CardTitle>
        <CardDescription>
          Manage province-specific solar yield factors (kWh/kWp/year) used in energy calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Province</TableHead>
              <TableHead>Yield (kWh/kWp/year)</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.province}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={row.yield_kwh_per_kwp}
                    onChange={(e) => handleChange(row.id, e.target.value)}
                    className="w-32"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{row.source ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="pt-4 border-t mt-4">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
