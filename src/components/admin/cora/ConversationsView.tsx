import { InboxTab } from "@/components/admin/sales-agent/InboxTab";

export function ConversationsView() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Inbound replies arrive in <span className="font-medium text-foreground">cora@crunchcarbon.com</span> via the Outlook gateway.
        Cora drafts replies, escalates risky topics (commission, legal, large portfolio), and never replies on existing-agent or existing-client threads.
      </div>
      <InboxTab />
    </div>
  );
}
