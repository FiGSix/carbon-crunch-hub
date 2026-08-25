import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface DrawerRow {
  id: string;
  /** Primary line — usually the client. */
  title: string;
  /** Secondary line — usually the project / proposal title. */
  subtitle?: string | null;
  /** Short facts: MWp, value, days outstanding. */
  meta?: string[];
  /** Recommended next action for this row. */
  recommendation?: string | null;
  actionLabel?: string;
  to?: string;
}

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: DrawerRow[];
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  footer?: { label: string; to: string };
}

/**
 * Slide-over used to investigate an aggregate metric without leaving the
 * dashboard. The dashboard stays underneath as the user's home cockpit;
 * choosing a row is what navigates into deeper work.
 */
export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  rows,
  loading = false,
  emptyTitle = "Nothing here right now",
  emptyBody = "There's nothing in this list that needs your attention.",
  footer,
}: DetailDrawerProps) {
  const reduced = useReducedMotion();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
            </div>
          ) : (
            rows.map((row, i) => (
              <motion.div
                key={row.id}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: reduced ? 0 : i * 0.03 }}
                className="rounded-lg border bg-card p-4 transition-colors hover:border-crunch-yellow/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{row.title}</p>
                    {row.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
                    )}
                  </div>
                  {row.to && (
                    <Button asChild size="sm" variant="ghost" className="shrink-0">
                      <Link to={row.to}>
                        {row.actionLabel ?? "Open"}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>

                {row.meta && row.meta.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {row.meta.map((m) => (
                      <span key={m} className="tabular-nums">
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {row.recommendation && (
                  <p className="mt-2 text-xs text-foreground/80 leading-relaxed">
                    {row.recommendation}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>

        {footer && rows.length > 0 && (
          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link to={footer.to}>{footer.label}</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
