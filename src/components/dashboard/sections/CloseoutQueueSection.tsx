import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Archive, Mail, ArrowRight, Clock } from "lucide-react";
import {
  useCloseoutQueue,
  useArchiveProposal,
  type CloseoutItem,
} from "@/hooks/dashboard/useCloseoutQueue";

/**
 * Step 6 — Soft close-out + archive flow.
 *
 * Surfaces dead proposals (>=30d, no engagement). Two actions per row:
 *  - "Send close-out email" — opens mailto with the soft Day-30 copy.
 *    Agent edits before sending (per autonomy rules: no auto-send for warm/value).
 *  - "Archive" — one click, soft-archive (sets archived_at). Reactivation
 *    is one click from the proposal view.
 *
 * Tone: "We don't want to keep unnecessary admin open on your side."
 */
export function CloseoutQueueSection({ limit = 5 }: { limit?: number } = {}) {
  const { data, isLoading, isError } = useCloseoutQueue(25);
  const [confirm, setConfirm] = useState<CloseoutItem | null>(null);
  const archive = useArchiveProposal();
  const visible = data?.slice(0, limit);
  const hiddenCount = (data?.length ?? 0) - (visible?.length ?? 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Close-out queue
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              30+ days, no engagement. Soft-archive to keep the pipeline honest.
            </p>
          </div>
          {hiddenCount > 0 && (
            <Button asChild size="sm" variant="ghost">
              <a href="/proposals">+{hiddenCount}</a>
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">
              Couldn't load close-out queue.
            </p>
          ) : !visible || visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to close out — pipeline is clean.
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => (
                <CloseoutRow
                  key={item.proposal_id}
                  item={item}
                  onArchiveClick={() => setConfirm(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this proposal?</DialogTitle>
            <DialogDescription>
              Archived ≠ deleted. The proposal stays in the database and can be
              reactivated with one click. It just stops counting toward your
              active pipeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirm) {
                  archive.mutate(confirm.proposal_id);
                  setConfirm(null);
                }
              }}
              disabled={archive.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const CLOSEOUT_COPY = `Hi,

We don't want to keep unnecessary admin open on your side.

Unless you'd like us to keep this proposal active, we'll move it to archived status in 7 days. You can request a refreshed proposal at any time — nothing is deleted.

Just reply "keep open" if you'd prefer we leave it as-is.

Thanks,
Crunch Carbon`;

function CloseoutRow({
  item,
  onArchiveClick,
}: {
  item: CloseoutItem;
  onArchiveClick: () => void;
}) {
  const revenue =
    item.estimated_client_revenue > 0
      ? `R ${Math.round(item.estimated_client_revenue).toLocaleString()}`
      : "—";
  const subject = encodeURIComponent(
    `Should we keep your proposal open? — ${item.title}`
  );
  const body = encodeURIComponent(CLOSEOUT_COPY);
  const mailHref = item.client_email
    ? `mailto:${item.client_email}?subject=${subject}&body=${body}`
    : null;

  return (
    <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold truncate">
            {item.client_name || "Unknown client"}
          </p>
          <Badge variant="outline" className="text-[10px]">
            {item.days_since_sent}d
          </Badge>
          <span className="text-xs text-muted-foreground">{revenue}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.title}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {mailHref && (
          <Button asChild size="sm" variant="ghost" className="h-8 px-2" title="Send soft close-out email">
            <a href={mailHref}>
              <Mail className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={onArchiveClick}
          title="Archive (one click reactivation)"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-8 px-2">
          <a href={`/proposals/${item.proposal_id}`}>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
