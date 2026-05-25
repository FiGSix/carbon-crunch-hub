import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

const STAGES: { key: string; label: string }[] = [
  { key: "discovered", label: "Discovered" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "invited", label: "Invited" },
  { key: "signed_up", label: "Signed Up" },
  { key: "first_proposal_sent", label: "1st Proposal" },
];

export function FunnelScoreboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-agent-funnel"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("v_sales_agent_funnel").select("funnel_stage");
      if (error) throw error;
      return data as { funnel_stage: string }[];
    },
    refetchInterval: 60_000,
  });

  // Counts include leads that have reached that stage or beyond.
  const stageIndex = (s: string) => STAGES.findIndex((x) => x.key === s);
  const counts = STAGES.map((s, i) =>
    (data ?? []).filter((r) => stageIndex(r.funnel_stage) >= i).length
  );
  const top = counts[0] || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((s, i) => {
            const c = counts[i];
            const pct = top > 0 ? Math.round((c / top) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center gap-1">
                <div className="min-w-[110px] px-3 py-2 rounded-md bg-muted/40 text-center">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-bold tabular-nums">{isLoading ? "—" : c}</div>
                  <div className="text-[10px] text-muted-foreground">{pct}%</div>
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
