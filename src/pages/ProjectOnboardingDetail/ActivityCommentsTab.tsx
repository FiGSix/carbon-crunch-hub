import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";

interface ActivityCommentsTabProps {
  projectId: string;
}

interface ActivityRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string | null;
  details: Record<string, any> | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
}

type PersonMap = Record<string, string>;

const FIELD_LABELS: Record<string, string> = {
  system_name: "System name",
  ownership_type: "Ownership type",
  system_address: "Site address",
  system_gps_lat: "GPS latitude",
  system_gps_lng: "GPS longitude",
  commissioning_date: "Commissioning date",
  connection_type: "Connection type",
  alternative_power_source: "Alternative power source",
  meter_type: "Meter type",
  installer_id: "Installer",
  installer_company_name: "Installer company",
  installer_email: "Installer email",
  inverter_brand: "Inverter brand",
  inverter_model: "Inverter model",
  inverter_quantity: "Number of inverters",
  inverter_capacity_kw: "Inverter capacity (kW)",
  inverter_serial: "Inverter details",
  inverter_cost: "Inverter cost",
  data_collector_present: "Data collector present",
  data_collector_serial: "Data collector serial",
  has_battery: "Battery installed",
  battery_brand: "Battery brand",
  battery_model: "Battery model",
  battery_capacity_kwh: "Battery capacity (kWh)",
  battery_serial: "Battery serial",
  battery_cost: "Battery cost",
  panel_brand: "Panel array details",
  panel_size_wp: "Panel size (Wp)",
  panel_quantity: "Panel quantity",
  panel_total_kwp: "Total panel kWp",
  panel_cost: "Panel cost",
  total_capex: "Total CAPEX",
  labor_cost: "Labour cost",
  meter_serial: "Meter serial",
  has_maintenance_agreement: "Maintenance agreement",
  maintenance_agreement_term_years: "Maintenance term (years)",
  maintenance_cost_annual: "Annual maintenance cost",
  phases_json: "Project phases",
};

const truncate = (value: string | null, max = 80) => {
  if (!value) return "empty";
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
};

function describeActivity(row: ActivityRow): string {
  const d = row.details || {};
  switch (row.action) {
    case "field_updated": {
      const label = FIELD_LABELS[d.field] || d.field || "a field";
      return `updated ${label}: ${truncate(row.old_value)} → ${truncate(row.new_value)}`;
    }
    case "document_uploaded":
      return `uploaded a ${String(d.category || "").toUpperCase() || "document"} document (${d.file_name || "file"})`;
    case "document_replaced":
      return `replaced the ${String(d.category || "document")} document with ${d.file_name || "a new file"}`;
    case "document_validated":
      return `validated the ${String(d.category || "document")} document`;
    case "document_unvalidated":
      return `removed validation from the ${String(d.category || "document")} document`;
    case "data_access_configured":
      return `configured monitoring access (${d.provider || "provider"} · ${d.credential_method || "method"})`;
    case "data_access_updated":
      return `updated the monitoring access configuration`;
    case "data_access_test":
      return `ran a connection test: ${row.new_value || "unknown"}${d.error ? ` — ${truncate(String(d.error), 120)}` : ""}`;
    case "submitted_for_review":
      return "submitted the onboarding for admin review";
    case "admin_validated":
      return "validated the onboarding data";
    case "onboarding_complete_changed":
      return row.new_value === "true" ? "marked onboarding as complete" : "reopened onboarding";
    case "data_access_verified_changed":
      return row.new_value === "true" ? "verified data access" : "removed data access verification";
    case "audit_ready_changed":
      return row.new_value === "true" ? "marked the project as audit ready" : "removed audit ready status";
    case "followup_sent":
      return `sent a follow-up email to ${(d.recipients || []).join(" and ") || "recipients"} (${d.outstanding_count ?? 0} outstanding item(s))`;
    default:
      return row.action.replace(/_/g, " ");
  }
}

export function ActivityCommentsTab({ projectId }: ActivityCommentsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [people, setPeople] = useState<PersonMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [{ data: activityData, error: activityError }, { data: commentData, error: commentError }] =
        await Promise.all([
          supabase
            .from("onboarding_activity_log")
            .select("id, actor_id, action, entity_type, details, old_value, new_value, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("onboarding_comments")
            .select("id, author_id, content, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true }),
        ]);

      if (activityError) throw activityError;
      if (commentError) throw commentError;

      const acts = (activityData || []) as ActivityRow[];
      const coms = (commentData || []) as CommentRow[];
      setActivities(acts);
      setComments(coms);

      const ids = Array.from(
        new Set([...acts.map((a) => a.actor_id), ...coms.map((c) => c.author_id)].filter(Boolean)),
      );
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", ids);
        const map: PersonMap = {};
        (profiles || []).forEach((p: any) => {
          map[p.id] =
            `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown user";
        });
        setPeople(map);
      }
    } catch (error) {
      console.error("Failed to load activity/comments:", error);
      toast({
        title: "Could not load activity",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async () => {
    const content = newComment.trim();
    if (!content || !user) return;

    try {
      setIsPosting(true);
      const { error } = await supabase.from("onboarding_comments").insert({
        project_id: projectId,
        author_id: user.id,
        content,
      });
      if (error) throw error;
      setNewComment("");
      await load();
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast({
        title: "Comment not posted",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const nameOf = (id: string) => people[id] || "Unknown user";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>Every change recorded on this project</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity recorded yet. Changes from here on will appear in this timeline.
            </p>
          ) : (
            <ScrollArea className="h-[460px] pr-3">
              <ol className="space-y-4">
                {activities.map((row) => (
                  <li key={row.id} className="border-l-2 border-muted pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm">
                      <span className="font-medium">{nameOf(row.actor_id)}</span>{" "}
                      <span className="text-muted-foreground">{describeActivity(row)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </CardTitle>
          <CardDescription>Notes visible to the project team and client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No comments yet. Leave a note about outstanding information below.
            </p>
          ) : (
            <ScrollArea className="h-[340px] pr-3">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{nameOf(comment.author_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment about outstanding information…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              maxLength={2000}
            />
            <div className="flex justify-end">
              <Button onClick={handlePost} disabled={isPosting || !newComment.trim()}>
                {isPosting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
