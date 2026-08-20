import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BroadcastAttachment,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_TOTAL_BYTES,
  formatBytes,
  uploadBroadcastDocument,
} from "@/lib/broadcasts/documents";

interface AttachmentsCardProps {
  attachments: BroadcastAttachment[];
  onChange: (next: BroadcastAttachment[]) => void;
  readOnly?: boolean;
}

/**
 * Real attachments — the escape hatch. Off by default: attaching a file re-encodes
 * it once per recipient and measurably hurts bulk deliverability, which is exactly
 * what the updates. subdomain exists to protect. Use the body's document link for
 * anything routine.
 */
export function AttachmentsCard({ attachments, onChange, readOnly }: AttachmentsCardProps) {
  const [enabled, setEnabled] = useState(attachments.length > 0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);

  const handleFile = async (file: File) => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`At most ${MAX_ATTACHMENTS} attachments per campaign`);
      return;
    }
    if (totalBytes + file.size > MAX_ATTACHMENT_TOTAL_BYTES) {
      toast.error(
        `Attachments would exceed the ${formatBytes(MAX_ATTACHMENT_TOTAL_BYTES)} total limit`,
      );
      return;
    }
    setUploading(true);
    try {
      const meta = await uploadBroadcastDocument(file);
      onChange([...attachments, meta]);
      toast.success(`${file.name} attached`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" /> Real attachments
        </CardTitle>
        <CardDescription>
          Optional and off by default. Prefer the document link in the body — it downloads the same
          file from private storage without the deliverability cost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="attachments-enabled"
            checked={enabled}
            disabled={readOnly}
            onCheckedChange={(v) => {
              setEnabled(v);
              if (!v && attachments.length) onChange([]);
            }}
          />
          <Label htmlFor="attachments-enabled">Attach files directly to this campaign</Label>
        </div>

        {enabled && (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This affects deliverability</AlertTitle>
              <AlertDescription className="text-sm">
                Every recipient gets their own copy of the file, which raises spam scoring on bulk
                mail and can get the message clipped or filtered. Limits: {MAX_ATTACHMENTS} files,{" "}
                {formatBytes(MAX_ATTACHMENT_TOTAL_BYTES)} in total. Use it for signed notices, not
                newsletters.
              </AlertDescription>
            </Alert>

            {attachments.length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border">
                {attachments.map((a) => (
                  <li key={a.path} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 truncate">
                      {a.name}{" "}
                      <span className="text-muted-foreground">({formatBytes(a.size)})</span>
                    </span>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(attachments.filter((x) => x.path !== a.path))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && (
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="mr-2 h-4 w-4" />
                  )}
                  Add attachment
                </Button>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(totalBytes)} of {formatBytes(MAX_ATTACHMENT_TOTAL_BYTES)} used
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
