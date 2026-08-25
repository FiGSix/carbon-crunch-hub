import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { DetailDrawer, type DrawerRow } from "@/components/dashboard/DetailDrawer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { NetworkCompany, NetworkSegment } from "@/hooks/dashboard/useSuperPartnerNetwork";

const SEGMENTS: { key: NetworkSegment; label: string; bar: string }[] = [
  { key: "producing", label: "Producing", bar: "bg-[#8ED973]" },
  { key: "needs_attention", label: "Need attention", bar: "bg-destructive/70" },
  { key: "not_activated", label: "Not yet activated", bar: "bg-muted-foreground/40" },
];

interface NetworkHealthProps {
  companies: NetworkCompany[];
  loading?: boolean;
}

const fmtMwp = (n: number) => `${n.toFixed(2)} MWp`;

/**
 * One interactive network health component instead of several partner widgets.
 *
 * Segments are defined from real data only:
 *  producing        — signed MWp > 0
 *  needs_attention  — linked 30+ days, still 0 signed MWp
 *  not_activated    — linked under 30 days, still 0 signed MWp
 */
export function NetworkHealth({ companies, loading }: NetworkHealthProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<NetworkSegment | null>(null);

  const grouped = useMemo(() => {
    const out: Record<NetworkSegment, NetworkCompany[]> = {
      producing: [],
      needs_attention: [],
      not_activated: [],
    };
    companies.forEach((c) => out[c.segment].push(c));
    return out;
  }, [companies]);

  const total = companies.length;

  const rows: DrawerRow[] = (open ? grouped[open] : []).map((c) => ({
    id: c.company_id,
    title: c.company_name,
    subtitle: `${c.active_member_count} partner${c.active_member_count === 1 ? "" : "s"}`,
    meta: [
      fmtMwp(c.total_signed_mwp),
      c.linked_days != null ? `linked ${c.linked_days}d ago` : "link date unknown",
    ],
    recommendation:
      c.segment === "producing"
        ? "Producing signed MWp — keep the momentum going."
        : c.segment === "needs_attention"
          ? "Linked over a month ago with no signed MWp yet. Worth a direct conversation."
          : "Recently linked. Help them get their first proposal out.",
  }));

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Partner network
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Producing = signed MWp above zero. Need attention = linked 30+
                  days with no signed MWp. Not yet activated = linked in the last
                  30 days with no signed MWp.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              <AnimatedNumber value={total} /> partner companies
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No partners linked to your network yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SEGMENTS.map((s, i) => {
                const list = grouped[s.key];
                const share = total > 0 ? (list.length / total) * 100 : 0;
                return (
                  <motion.button
                    key={s.key}
                    type="button"
                    onClick={() => setOpen(s.key)}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.05 }}
                    className="rounded-lg border p-4 text-left transition-colors hover:border-foreground/25 hover:bg-muted/40"
                  >
                    <p className="text-2xl font-semibold">
                      <AnimatedNumber value={list.length} />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700 ease-out",
                          s.bar
                        )}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DetailDrawer
        open={open !== null}
        onOpenChange={(v) => !v && setOpen(null)}
        title={SEGMENTS.find((s) => s.key === open)?.label ?? "Partners"}
        description="Partner companies in this segment of your network."
        rows={rows}
        emptyTitle="No partners in this segment"
        emptyBody="Nothing to review here right now."
        footer={{ label: "Open my companies", to: "/super-partner/companies" }}
      />
    </>
  );
}
