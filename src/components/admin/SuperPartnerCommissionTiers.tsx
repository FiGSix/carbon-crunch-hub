import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const KEYS = [
  { key: "super_partner_mwp_tier1_threshold", label: "MWp threshold for upper tier", suffix: "MWp" },
  { key: "super_partner_rate_tier1", label: "Lower tier rate", suffix: "%" },
  { key: "super_partner_rate_tier2", label: "Upper tier rate", suffix: "%" },
] as const;

export function SuperPartnerCommissionTiers() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", KEYS.map((k) => k.key));
      const next: Record<string, string> = {};
      (data || []).forEach((r: any) => { next[r.setting_key] = String(r.setting_value); });
      setValues(next);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const k of KEYS) {
      const num = parseFloat(values[k.key] ?? "0");
      if (Number.isNaN(num)) continue;
      await supabase.from("system_settings").update({ setting_value: num as any }).eq("setting_key", k.key);
    }
    setSaving(false);
    toast({ title: "Saved", description: "Super partner commission tiers updated." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Super Partner Commission Tiers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {KEYS.map((k) => (
                <div key={k.key}>
                  <Label>{k.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={values[k.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}
                    />
                    <span className="text-sm text-muted-foreground">{k.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Rates apply at proposal-signing time. When a super partner's aggregated signed MWp reaches the threshold, the upper tier applies.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
