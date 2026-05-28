import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeadDetailDrawer } from "./LeadDetailDrawer";
import { LeadCard, type LeadCardRow } from "./LeadCard";
import { Loader2 } from "lucide-react";

type SectionId = "inbox" | "complete" | "outreach" | "conversations" | "opportunities";

const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: "inbox", label: "Lead Inbox", description: "Newly discovered. Cora is researching, completing, scoring, and de-duplicating." },
  { id: "complete", label: "Complete Leads", description: "Completeness ≥ 80 and ready for Cora outreach." },
  { id: "outreach", label: "Outreach Active", description: "Currently in email or follow-up." },
  { id: "conversations", label: "Conversations", description: "Replied — awaiting Cora or admin response." },
  { id: "opportunities", label: "Opportunities", description: "Meetings, proposals, invitations, sign-ups." },
];

const RESEARCH_INBOX = ["New", "Researching", "Incomplete", "Needs Review"];
const OUTREACH_ACTIVE = ["First Email Sent", "Follow-Up Due", "Follow-Up Sent", "No Response", "Paused", "Ready for Outreach"];

export function PipelineView() {
  const [section, setSection] = useState<SectionId>("inbox");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Tabs value={section} onValueChange={(v) => setSection(v as SectionId)}>
        <TabsList className="grid grid-cols-5 w-full">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <SectionPanel section={s} onOpen={setOpenLeadId} />
          </TabsContent>
        ))}
      </Tabs>

      <LeadDetailDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}

function SectionPanel({
  section,
  onOpen,
}: {
  section: { id: SectionId; label: string; description: string };
  onOpen: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["cora-crm-section", section.id],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q: any = (supabase as any)
        .from("discovery_candidates")
        .select(
          "id, company_name, contact_name, email, website, location, location_country, segment, lead_segment, fit_score, completeness_score, completeness_missing, research_status, outreach_status, sales_status, next_best_action, existing_relationship_status",
        )
        .order("completeness_score", { ascending: false, nullsFirst: false })
        .limit(300);

      if (section.id === "inbox") q = q.or(`research_status.in.(${RESEARCH_INBOX.join(",")}),research_status.is.null`).is("outreach_status", null).is("sales_status", null);
      if (section.id === "complete") q = q.gte("completeness_score", 80).is("outreach_status", null).is("sales_status", null).eq("research_status", "Complete");
      if (section.id === "outreach") q = q.in("outreach_status", OUTREACH_ACTIVE).is("sales_status", null);
      if (section.id === "conversations") q = q.eq("outreach_status", "Replied").is("sales_status", null);
      if (section.id === "opportunities") q = q.not("sales_status", "is", null);

      const { data } = await q;
      return (data ?? []) as LeadCardRow[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{section.label} <span className="text-muted-foreground font-normal">({data?.length ?? 0})</span></CardTitle>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {!isLoading && (data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing here yet.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(data ?? []).map((row) => <LeadCard key={row.id} row={row} onOpen={onOpen} />)}
        </div>
      </CardContent>
    </Card>
  );
}
