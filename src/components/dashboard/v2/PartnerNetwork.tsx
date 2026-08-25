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
 * Partner network status. Point-in-time counts only — no growth or trend claim
 * is made, because no historical partner series exists.
 *
 * Every figure comes from get_agents_management_counts, the same source as
 * Partner Management, so the two screens can never disagree.
 *
 * "Approved" is the honest label for the underlying rule:
 * profiles.agent_status = 'active' (account approved and enabled). It carries no
 * commercial-activity requirement.
 */
export function PartnerNetwork() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "partner-network"],
    staleTime: 60_000,
    queryFn: async (): Promise<Counts> => {
      const { data, error } = await supabase.rpc("get_agents_management_counts");
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row ?? { total: 0, invited: 0, pending_approval: 0, active: 0 }) as Counts;
    },
  });

  const total = data?.total ?? 0;
  const approved = data?.active ?? 0;
  const pending = data?.pending_approval ?? 0;
  const invited = data?.invited ?? 0;

  const secondary = [
    { label: "awaiting approval", value: pending, filter: "pending_approval" },
    { label: "awaiting signup", value: invited, filter: "invited" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Partner network
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Approved = partner account approved and enabled. This is account
              status only, not commercial activity. Counts come from partner
              management, so both screens always match.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Not yet available.</p>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <motion.button
              type="button"
              onClick={() => navigate("/admin/partners?status=all")}
              initial={reduced ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-left rounded-md px-1 -mx-1 transition-colors hover:bg-muted/40"
            >
              <p className="text-3xl font-semibold leading-none">
                <AnimatedNumber value={total} />
                <span className="ml-1.5 text-base font-medium text-muted-foreground">
                  partners
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <AnimatedNumber value={approved} /> approved
              </p>
            </motion.button>

            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {secondary.map((s, i) => (
                <motion.button
                  key={s.label}
                  type="button"
                  onClick={() => navigate(`/admin/partners?status=${s.filter}`)}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: reduced ? 0 : 0.06 + i * 0.04,
                  }}
                  className={`text-left text-xs rounded-md px-1 -mx-1 transition-colors hover:bg-muted/40 ${
                    s.value === 0 ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  <span className="tabular-nums font-medium">{s.value}</span>{" "}
                  {s.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
