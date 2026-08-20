import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Megaphone, Plus, RefreshCw, Send, Users, Ban } from "lucide-react";
import { RichTextEditor } from "@/components/admin/broadcasts/RichTextEditor";
import { AudienceBuilder, AUDIENCE_LABEL } from "@/components/admin/broadcasts/AudienceBuilder";
import { RecipientPreview } from "@/components/admin/broadcasts/RecipientPreview";
import { AttachmentsCard } from "@/components/admin/broadcasts/AttachmentsCard";
import type { BroadcastAttachment } from "@/lib/broadcasts/documents";
import { useAuth } from "@/contexts/auth";
import {
  AudienceDefinition,
  AudiencePreview,
  BroadcastCampaign,
  BroadcastCategory,
  CATEGORY_LABELS,
  FROM_EMAIL,
  FROM_NAME,
  REPLY_TO,
  useBroadcastCampaign,
  useBroadcastCampaigns,
  useCancelCampaign,
  useResolveAudience,
  useSaveCampaign,
  useSendCampaign,
  useTestSend,
} from "@/hooks/admin/useBroadcasts";

const statusVariant = (status: string) =>
  status === "sent"
    ? "default"
    : status === "sending"
      ? "secondary"
      : status === "failed" || status === "cancelled"
        ? "destructive"
        : "outline";

export default function Broadcasts() {
  const { profile } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const { data: campaigns, isLoading } = useBroadcastCampaigns();

  if (isComposing) {
    return (
      <Composer
        campaignId={editingId}
        onClose={() => {
          setIsComposing(false);
          setEditingId(null);
        }}
        defaultTestEmail={profile?.email ?? ""}
      />
    );
  }

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Broadcasts"
        description="Compose and send platform-wide emails to clients and partners."
      />
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingId(null);
              setIsComposing(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New campaign
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Campaigns
            </CardTitle>
            <CardDescription>
              All broadcasts sent from {FROM_EMAIL}, replies to {REPLY_TO}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (campaigns ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No campaigns yet. Create your first broadcast.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(campaigns ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.subject}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(c.status) as any}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{c.category}</TableCell>
                        <TableCell className="text-sm">
                          {c.status === "draft"
                            ? AUDIENCE_LABEL[c.audience?.type] ?? "Not set"
                            : `${c.sent_count}/${c.total_recipients}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.completed_at
                            ? new Date(c.completed_at).toLocaleString()
                            : c.started_at
                              ? new Date(c.started_at).toLocaleString()
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(c.id);
                              setIsComposing(true);
                            }}
                          >
                            {c.status === "draft" ? "Edit" : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

interface ComposerProps {
  campaignId: string | null;
  onClose: () => void;
  defaultTestEmail: string;
}

function Composer({ campaignId, onClose, defaultTestEmail }: ComposerProps) {
  const [id, setId] = useState<string | null>(campaignId);
  const { data: existing } = useBroadcastCampaign(id, true);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [category, setCategory] = useState<BroadcastCategory>("opportunity");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audience, setAudience] = useState<AudienceDefinition>({ type: "onboarding_stage" });
  const [attachments, setAttachments] = useState<BroadcastAttachment[]>([]);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const save = useSaveCampaign();
  const resolve = useResolveAudience();
  const testSend = useTestSend();
  const sendCampaign = useSendCampaign();
  const cancelCampaign = useCancelCampaign();

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setSubject(existing.subject);
      setPreheader(existing.preheader ?? "");
      setCategory(existing.category);
      setBodyHtml(existing.body_html ?? "");
      setAudience((existing.audience as AudienceDefinition) ?? { type: "onboarding_stage" });
      setAttachments((existing.attachments as BroadcastAttachment[]) ?? []);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const readOnly = !!existing && existing.status !== "draft";

  const persist = async (): Promise<BroadcastCampaign | null> => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return null;
    }
    try {
      const saved = await save.mutateAsync({
        id: id ?? undefined,
        name,
        subject,
        preheader,
        body_html: bodyHtml,
        category,
        audience,
        attachments,
      });
      setId(saved.id);
      return saved;
    } catch (e: any) {
      toast.error(e.message ?? "Could not save campaign");
      return null;
    }
  };

  const runPreview = async () => {
    try {
      const result = await resolve.mutateAsync(audience);
      setPreview(result);
      setExcluded(
        new Set(result.recipients.filter((r) => r.excluded_by_default).map((r) => r.email)),
      );
    } catch (e: any) {
      toast.error(e.message ?? "Could not resolve audience");
    }
  };

  const finalCount = useMemo(
    () => (preview ? preview.recipients.filter((r) => !excluded.has(r.email)).length : 0),
    [preview, excluded],
  );

  const exclusionBreakdown = useMemo(() => {
    if (!preview) return { staff: 0, selfAuthored: 0, manual: 0 };
    let staff = 0;
    let selfAuthored = 0;
    let manual = 0;
    preview.recipients
      .filter((r) => excluded.has(r.email))
      .forEach((r) => {
        if (r.flags.self_authored) selfAuthored++;
        else if (r.flags.is_staff) staff++;
        else manual++;
      });
    return { staff, selfAuthored, manual };
  }, [preview, excluded]);

  const toggleRecipient = (email: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleTestSend = async () => {
    const saved = await persist();
    if (!saved) return;
    if (!testEmail.trim()) {
      toast.error("Enter an address for the test send");
      return;
    }
    try {
      await testSend.mutateAsync({ campaignId: saved.id, email: testEmail.trim() });
      toast.success(`Test email sent to ${testEmail.trim()}`);
    } catch (e: any) {
      toast.error(e.message ?? "Test send failed");
    }
  };

  const handleSend = async () => {
    const saved = await persist();
    if (!saved) return;
    setConfirmOpen(false);
    try {
      await sendCampaign.mutateAsync({
        campaignId: saved.id,
        excludeEmails: Array.from(excluded),
      });
      toast.success("Broadcast started");
    } catch (e: any) {
      toast.error(e.message ?? "Send failed");
    }
  };

  const progressPct =
    existing && existing.total_recipients > 0
      ? Math.round(
          ((existing.sent_count + existing.failed_count + existing.skipped_count) /
            existing.total_recipients) *
            100,
        )
      : 0;

  return (
    <DashboardLayout>
      <DashboardHeader
        title={id ? "Edit broadcast" : "New broadcast"}
        description="Compose the message, build the audience, test it, then send."
      />
      <div className="space-y-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to campaigns
        </Button>

        {existing && existing.status !== "draft" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Send progress</span>
                <Badge variant={statusVariant(existing.status) as any}>{existing.status}</Badge>
              </CardTitle>
              <CardDescription>
                {existing.sent_count} sent · {existing.skipped_count} skipped ·{" "}
                {existing.failed_count} failed of {existing.total_recipients}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progressPct} />
              {existing.last_error && (
                <p className="text-sm text-destructive">{existing.last_error}</p>
              )}
              {existing.status === "sending" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelCampaign.mutate(existing.id)}
                >
                  <Ban className="mr-2 h-4 w-4" /> Cancel send
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign name (internal)</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  disabled={readOnly}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="August partner update"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-category">Category</Label>
                <Select
                  value={category}
                  disabled={readOnly}
                  onValueChange={(v) => setCategory(v as BroadcastCategory)}
                >
                  <SelectTrigger id="campaign-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-subject">Subject</Label>
              <Input
                id="campaign-subject"
                value={subject}
                disabled={readOnly}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-preheader">Preheader</Label>
              <Input
                id="campaign-preheader"
                value={preheader}
                disabled={readOnly}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Short preview line shown in the inbox"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>From</Label>
                <Input readOnly value={`${FROM_NAME} <${FROM_EMAIL}>`} className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Reply-To</Label>
                <Input readOnly value={REPLY_TO} className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              {readOnly ? (
                <div
                  className="rounded-md border border-border p-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
              )}
            </div>
          </CardContent>
        </Card>

        <AttachmentsCard
          attachments={attachments}
          onChange={setAttachments}
          readOnly={readOnly}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Audience
            </CardTitle>
            <CardDescription>
              Resolved live at send time. Only addresses on the broadcast exclusion list are dropped
              silently — everything else is flagged here for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AudienceBuilder audience={audience} onChange={setAudience} />

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={runPreview} disabled={resolve.isPending}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${resolve.isPending ? "animate-spin" : ""}`}
                />
                Resolve recipients
              </Button>
              {preview && (
                <span className="text-sm">
                  <strong>{finalCount}</strong> will receive this ·{" "}
                  {preview.summary.total - finalCount} excluded of {preview.summary.total} resolved
                </span>
              )}
            </div>

            {preview && (
              <RecipientPreview
                recipients={preview.recipients}
                excluded={excluded}
                onToggle={toggleRecipient}
              />
            )}
          </CardContent>
        </Card>

        {!readOnly && (
          <Card>
            <CardHeader>
              <CardTitle>Test send</CardTitle>
              <CardDescription>
                Always send yourself a test before a real broadcast. Test sends bypass exclusions,
                suppressions and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="test-email">Send test to</Label>
                <Input
                  id="test-email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@crunchcarbon.com"
                />
              </div>
              <Button onClick={handleTestSend} disabled={testSend.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {testSend.isPending ? "Sending…" : "Send test to me"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!readOnly && (
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={persist} disabled={save.isPending}>
              Save draft
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!preview || finalCount === 0 || sendCampaign.isPending}
            >
              <Send className="mr-2 h-4 w-4" /> Send broadcast
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this broadcast?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{finalCount}</strong> recipients will receive “{subject}” from{" "}
                  {FROM_EMAIL}.
                </p>
                <p>
                  {preview ? preview.summary.total - finalCount : 0} excluded —{" "}
                  {exclusionBreakdown.selfAuthored} self-authored, {exclusionBreakdown.staff} staff,{" "}
                  {exclusionBreakdown.manual} excluded manually.
                </p>
                <p className="text-muted-foreground">
                  The audience is re-resolved at send time; suppressed and opted-out addresses are
                  skipped automatically.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
