import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ShieldOff, Plus } from "lucide-react";
import {
  useBlockedEmails,
  useAddBlockedEmail,
  useRemoveBlockedEmail,
  useSuggestedBlocks,
} from "@/hooks/admin/useBlockedEmails";

const REASONS = [
  { value: "manual", label: "Manual" },
  { value: "fatigue", label: "Fatigue (repeat no-signup)" },
  { value: "bounce", label: "Bounce" },
  { value: "complaint", label: "Complaint" },
  { value: "unsubscribe", label: "Unsubscribe" },
  { value: "invalid", label: "Invalid" },
];

export default function BlockedEmails() {
  const { data: blocked, isLoading } = useBlockedEmails();
  const { data: suggestions, isLoading: loadingSuggestions } =
    useSuggestedBlocks();
  const addBlock = useAddBlockedEmail();
  const removeBlock = useRemoveBlockedEmail();

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("manual");
  const [notes, setNotes] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    addBlock.mutate(
      { email, reason, notes },
      {
        onSuccess: () => {
          setEmail("");
          setNotes("");
          setReason("manual");
        },
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardHeader
          title="Blocked Emails"
          description="Prevent new proposals and outreach to these client emails. Existing proposals are unaffected."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Block an email
            </CardTitle>
            <CardDescription>
              Blocked addresses cannot receive proposal invitations or portfolio
              outreach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleAdd}
              className="grid gap-3 md:grid-cols-[1fr_180px_auto] items-start"
            >
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={addBlock.isPending}>
                {addBlock.isPending ? "Blocking..." : "Block"}
              </Button>
              <Textarea
                placeholder="Notes (optional) — why is this email blocked?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="md:col-span-3"
                rows={2}
              />
            </form>
          </CardContent>
        </Card>

        {suggestions && suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested blocks</CardTitle>
              <CardDescription>
                Clients with 2+ unsigned proposals who never signed up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSuggestions ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.client_email}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.client_name || s.client_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.client_email} · {s.unsigned_count} unsigned
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addBlock.mutate({
                            email: s.client_email,
                            reason: "fatigue",
                            notes: `Auto-suggested: ${s.unsigned_count} unsigned proposals`,
                          })
                        }
                        disabled={addBlock.isPending}
                      >
                        Block
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldOff className="h-4 w-4" /> Blocked addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !blocked || blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No emails are currently blocked.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocked.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">
                        {b.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.reason}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {b.notes || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Unblock ${b.email}?`)) {
                              removeBlock.mutate(b.id);
                            }
                          }}
                          disabled={removeBlock.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
