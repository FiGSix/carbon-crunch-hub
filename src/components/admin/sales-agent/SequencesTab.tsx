import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SequencesTab() {
  const { data: sequences } = useQuery({
    queryKey: ["sales-agent-sequences"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_sequences").select("*").order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-4">
      {(sequences ?? []).map((s) => {
        const steps = Array.isArray(s.steps) ? s.steps : [];
        return (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {s.name}
                {s.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                <Badge variant="outline" className="text-xs">{steps.length} steps</Badge>
              </CardTitle>
              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.map((st: any, i: number) => (
                  <div key={i} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Step {i + 1} · Day {st.day_offset}</span>
                      <span className="text-xs text-muted-foreground">{st.cta_label ?? ""}</span>
                    </div>
                    <div className="font-medium text-foreground/80">{st.subject}</div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans mt-1 line-clamp-6">{st.body_template}</pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {(sequences ?? []).length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No sequences yet.</CardContent></Card>
      )}
      <p className="text-xs text-muted-foreground">Inline editor coming in Phase 2 — edit sequences directly in Supabase for now.</p>
    </div>
  );
}
