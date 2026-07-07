import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Star } from "lucide-react";
import {
  carbonRateSetsService,
  CarbonRateSet,
  CarbonPrices,
} from "@/services/carbonRateSetsService";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";

interface Draft {
  id: string;
  name: string;
  prices: CarbonPrices;
  is_default: boolean;
  dirty: boolean;
}

export function CarbonRateSetsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Draft | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const sets = await carbonRateSetsService.list();
      setDrafts(
        sets.map((s) => ({
          id: s.id,
          name: s.name,
          prices: { ...s.prices },
          is_default: s.is_default,
          dirty: false,
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load carbon rate sets");
    } finally {
      setLoading(false);
    }
  };

  const markDirty = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch, dirty: true } : d))
    );
  };

  const handlePriceChange = (id: string, year: string, value: string) => {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, prices: { ...d.prices, [year]: n }, dirty: true } : d
      )
    );
  };

  const addYear = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const years = Object.keys(d.prices).map((y) => parseInt(y));
        const next =
          years.length > 0 ? Math.max(...years) + 1 : new Date().getFullYear();
        return {
          ...d,
          prices: { ...d.prices, [String(next)]: 0 },
          dirty: true,
        };
      })
    );
  };

  const removeYear = (id: string, year: string) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d.prices };
        delete next[year];
        return { ...d, prices: next, dirty: true };
      })
    );
  };

  const save = async (draft: Draft) => {
    try {
      setSaving(draft.id);
      await carbonRateSetsService.update(draft.id, {
        name: draft.name.trim(),
        prices: draft.prices,
      });
      dynamicCarbonPricingService.clearCache();
      toast.success(`Saved "${draft.name}"`);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? { ...d, dirty: false } : d))
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const setDefault = async (draft: Draft) => {
    try {
      await carbonRateSetsService.setDefault(draft.id);
      dynamicCarbonPricingService.clearCache();
      toast.success(`"${draft.name}" is now the default`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set default");
    }
  };

  const clone = async (draft: Draft) => {
    const suggested = `${draft.name} (copy)`;
    const name = window.prompt("Name the new rate set", suggested)?.trim();
    if (!name) return;
    try {
      await carbonRateSetsService.create(name, draft.prices);
      dynamicCarbonPricingService.clearCache();
      toast.success(`Created "${name}"`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create rate set");
    }
  };

  const createNew = async () => {
    const name = window.prompt("Name the new rate set")?.trim();
    if (!name) return;
    try {
      await carbonRateSetsService.create(name, {});
      toast.success(`Created "${name}"`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create rate set");
    }
  };

  const remove = async (draft: Draft) => {
    try {
      await carbonRateSetsService.remove(draft.id);
      dynamicCarbonPricingService.clearCache();
      toast.success(`Deleted "${draft.name}"`);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carbon Credit Prices</CardTitle>
          <CardDescription>Manage carbon credit rate sets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Carbon Credit Prices</CardTitle>
          <CardDescription>
            Manage carbon credit rate sets by year (in Rand per tCO₂). The default
            set applies to any client without a specific assignment.
          </CardDescription>
        </div>
        <Button onClick={createNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New rate set
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {drafts.map((draft) => {
          const sortedYears = Object.keys(draft.prices).sort();
          return (
            <div key={draft.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Input
                    value={draft.name}
                    onChange={(e) => markDirty(draft.id, { name: e.target.value })}
                    className="max-w-xs font-medium"
                  />
                  {draft.is_default && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" /> Default
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {!draft.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefault(draft)}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => clone(draft)}>
                    <Copy className="h-4 w-4 mr-1" /> Duplicate
                  </Button>
                  {!draft.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setConfirmDelete(draft)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {sortedYears.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No years yet. Add one to get started.
                  </p>
                )}
                {sortedYears.map((year) => (
                  <div key={year} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`${draft.id}-${year}`}>Year {year}</Label>
                      <Input
                        id={`${draft.id}-${year}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.prices[year]}
                        onChange={(e) =>
                          handlePriceChange(draft.id, year, e.target.value)
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeYear(draft.id, year)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => addYear(draft.id)}>
                  <Plus className="h-4 w-4 mr-1" /> Add year
                </Button>
                <Button
                  onClick={() => save(draft)}
                  disabled={!draft.dirty || saving === draft.id || !draft.name.trim()}
                >
                  {saving === draft.id ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Clients currently assigned to this set will
              fall back to the default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove(confirmDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
