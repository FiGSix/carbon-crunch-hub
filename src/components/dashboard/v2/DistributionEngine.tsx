import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface Counts {
  total: number;
  invited: number;
  pending_approval: number;
  active: number;
}

/**
 * Admin distribution health. Every figure comes from
 * get_agents_management_counts — the same source as Partner Management, so
 * the two screens can never disagree.
 */
export function DistributionEngine() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "distribution-engine"],
    staleTime: 60_000,
    queryFn: async (): Promise<Counts> => {
      const { data, error } = await supabase.rpc("get_agents_management_counts");
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row ?? { total: 0, invited: 0, pending_approval: 0, active: 0 }) as Counts;
    },
  });

  const segments = [
    { label: "Active partners", value: data?.active ?? 0, filter: "active" },
    { label: "Awaiting approval", value: data?.pending_approval ?? 0, filter: "pending_approval" },
    { label: "Invited, not signed up", value: data?.invited ?? 0, filter: "invited" },
    { label: "Total partners", value: data?.total ?? 0, filter: "all" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Distribution engine
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Active = partner account approved and enabled. Counts come from
              partner management, so both screens always match.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Is the partner engine growing and being activated?
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Not yet available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {segments.map((s, i) => (
              <motion.button
                key={s.label}
                type="button"
                onClick={() => navigate(`/admin/partners?status=${s.filter}`)}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.04 }}
                className="rounded-lg border p-4 text-left transition-colors hover:border-foreground/25 hover:bg-muted/40"
              >
                <p className="text-2xl font-semibold">
                  <AnimatedNumber value={s.value} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
