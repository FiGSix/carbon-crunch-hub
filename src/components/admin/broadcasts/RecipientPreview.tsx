import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ResolvedRecipient } from "@/hooks/admin/useBroadcasts";

interface Props {
  recipients: ResolvedRecipient[];
  excluded: Set<string>;
  onToggle: (email: string) => void;
}

const PROJECT_CAP = 5;

function ProjectSummary({ context }: { context: Record<string, any> }) {
  const projects: any[] = Array.isArray(context?.projects) ? context.projects : [];
  if (projects.length === 0) return <span className="text-muted-foreground">—</span>;
  const count = context.project_count ?? projects.length;
  const shown = projects.slice(0, PROJECT_CAP);
  const rest = Number(count) - shown.length;
  return (
    <span className="text-xs">
      {shown.map((p) => p.title ?? "Untitled").join(", ")}
      {rest > 0 && (
        <>
          {" "}
          and{" "}
          <a href="/project-onboarding" className="underline">
            {rest} more
          </a>
        </>
      )}
    </span>
  );
}

export function RecipientPreview({ recipients, excluded, onToggle }: Props) {
  if (recipients.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No recipients resolved for this audience yet.
      </p>
    );
  }

  return (
    <div className="max-h-[480px] overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">Include</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead>Projects</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((r) => {
            const isExcluded = excluded.has(r.email);
            return (
              <TableRow key={r.email} className={isExcluded ? "opacity-60" : undefined}>
                <TableCell>
                  <Button
                    size="sm"
                    variant={isExcluded ? "outline" : "secondary"}
                    onClick={() => onToggle(r.email)}
                    title={isExcluded ? "Include this recipient" : "Exclude this recipient"}
                  >
                    {isExcluded ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.recipient_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell className="space-x-1 space-y-1">
                  <Badge variant="outline">
                    {r.flags.source === "json_snapshot"
                      ? "JSON snapshot"
                      : r.flags.source === "client_record"
                        ? "Client record"
                        : r.flags.source}
                  </Badge>
                  {r.flags.self_authored && (
                    <Badge variant="secondary">Recipient is also the creating partner</Badge>
                  )}
                  {r.flags.is_staff && (
                    <Badge variant={r.flags.staff_expected ? "outline" : "destructive"}>
                      Staff: {(r.flags.staff_roles ?? []).join(", ") || "internal"}
                    </Badge>
                  )}
                  {r.excluded_by_default && <Badge variant="destructive">Excluded by default</Badge>}
                </TableCell>
                <TableCell>
                  <ProjectSummary context={r.context ?? {}} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
