import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function RejectReasonDialog({ open, count, onClose, onConfirm }: {
  open: boolean; count: number; onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {count} candidate{count === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Rejected companies will be added to the discovery blocklist and skipped in future runs.
          </DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Reason (optional) — e.g. not an EPC, wrong region, low quality lead…" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)}>Reject & blocklist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
