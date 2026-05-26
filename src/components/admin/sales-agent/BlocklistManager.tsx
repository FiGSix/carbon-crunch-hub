import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

export function BlocklistManager() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["discovery-blocklist"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("discovery_blocklist").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("discovery_blocklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Removed from blocklist" }); qc.invalidateQueries({ queryKey: ["discovery-blocklist"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discovery Blocklist</CardTitle>
        <p className="text-xs text-muted-foreground">Rejected candidates land here. Future discovery runs skip these companies and domains.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> :
          (entries ?? []).length === 0 ? <div className="text-sm text-muted-foreground py-4 text-center">Blocklist is empty.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left"><th className="py-2 pr-3">Company</th><th className="py-2 pr-3">Domain</th><th className="py-2 pr-3">Reason</th><th className="py-2 pr-3">Added</th><th className="py-2 pr-3 text-right"></th></tr>
              </thead>
              <tbody>
                {(entries ?? []).map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{b.company_name_normalized ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.domain ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">{b.reason ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</td>
                    <td className="py-2 pr-3 text-right"><Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
