import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

export function DecisionLogView() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["cora-decision-log", search],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q: any = (supabase as any).from("cora_decision_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (search) q = q.ilike("action", `%${search}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cora decision log</CardTitle>
        <p className="text-xs text-muted-foreground">Every autonomous Cora action — what, why, against which data, and the outbound mailbox.</p>
        <Input placeholder="Filter by action…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {!isLoading && (data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground p-4">No decisions logged yet.</p>}
        <ul className="divide-y">
          {(data ?? []).map((d: any) => (
            <li key={d.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{d.action}</Badge>
                  {d.sending_mailbox && <Badge variant="secondary" className="text-[10px]">{d.sending_mailbox}</Badge>}
                  {d.admin_override && <Badge variant="destructive" className="text-[10px]">admin override</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
              </div>
              {d.reason && <div className="mt-1">{d.reason}</div>}
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                {d.status_before && <span>{d.status_before} → {d.status_after ?? "—"}</span>}
                {d.confidence != null && <span>conf {d.confidence}</span>}
                {d.prompt_version && <span>prompt {d.prompt_version}</span>}
                {d.candidate_id && <span>candidate {d.candidate_id.slice(0, 8)}</span>}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
