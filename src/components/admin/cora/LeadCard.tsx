import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Mail, Globe, MapPin, User, Tag } from "lucide-react";

export interface LeadCardRow {
  id: string;
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  website?: string | null;
  location?: string | null;
  location_country?: string | null;
  segment?: string | null;
  lead_segment?: string | null;
  fit_score?: number | null;
  completeness_score?: number | null;
  completeness_missing?: string[] | null;
  research_status?: string | null;
  outreach_status?: string | null;
  sales_status?: string | null;
  next_best_action?: string | null;
  existing_relationship_status?: string | null;
}

const MISSING_LABEL: Record<string, string> = {
  company_name: "No company",
  contact_name: "No contact",
  contact_email: "No email",
  website: "No website",
  sa_location: "Location?",
  segment: "Segment?",
  fit_score: "Unscored",
};

function completenessTone(score: number) {
  if (score >= 80) return "text-emerald-600 border-emerald-600";
  if (score >= 60) return "text-amber-600 border-amber-600";
  return "text-red-600 border-red-600";
}

export function LeadCard({ row, onOpen }: { row: LeadCardRow; onOpen: (id: string) => void }) {
  const score = row.completeness_score ?? 0;
  const segment = row.segment ?? row.lead_segment ?? "unknown";
  const status = row.sales_status ?? row.outreach_status ?? row.research_status ?? "—";
  const rel = row.existing_relationship_status;
  const blocked = rel && rel !== "safe_new_lead";

  return (
    <button onClick={() => onOpen(row.id)} className="w-full text-left">
      <Card className="hover:border-primary transition-colors">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium text-sm truncate">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {row.company_name || "Unnamed company"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                <User className="h-3 w-3 shrink-0" /> {row.contact_name || "—"}
              </div>
            </div>
            <div className={cn("rounded-full border-2 h-12 w-12 flex flex-col items-center justify-center shrink-0", completenessTone(score))}>
              <div className="text-sm font-bold leading-none">{score}</div>
              <div className="text-[8px] uppercase opacity-70">done</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
            <FieldRow icon={Mail} value={row.email} />
            <FieldRow icon={Globe} value={row.website} />
            <FieldRow icon={MapPin} value={row.location || row.location_country} />
            <FieldRow icon={Tag} value={segment} />
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="h-5">{status}</Badge>
            {row.fit_score != null && <Badge variant="outline" className="h-5">Fit {row.fit_score}</Badge>}
            {blocked && <Badge variant="destructive" className="h-5">{rel!.replaceAll("_", " ")}</Badge>}
            {(row.completeness_missing ?? []).map((m) => (
              <Badge key={m} variant="outline" className="h-5 text-[10px] border-amber-500 text-amber-700 dark:text-amber-400">
                {MISSING_LABEL[m] ?? m}
              </Badge>
            ))}
          </div>

          {row.next_best_action && (
            <div className="text-[11px] text-muted-foreground border-t pt-1.5">
              <span className="font-medium text-foreground">Next:</span> {row.next_best_action}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function FieldRow({ icon: Icon, value }: { icon: any; value?: string | null }) {
  const has = value && String(value).trim() !== "";
  return (
    <div className={cn("flex items-center gap-1 truncate", has ? "text-foreground" : "text-muted-foreground/60 italic")}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{has ? value : "missing"}</span>
    </div>
  );
}
