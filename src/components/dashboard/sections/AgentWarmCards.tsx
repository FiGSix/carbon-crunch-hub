import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Sun,
  Phone,
  MessageCircle,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAgentWarmCards, type WarmCard } from "@/hooks/dashboard/useAgentWarmCards";

/**
 * Agent warm cards — flagship of the v1 Agent Engine.
 * Silent (no client touch): surfaces proposals where a human nudge wins.
 *
 * Tone rule: "We're not chasing. We're helping."
 */
export function AgentWarmCards() {
  const { data, isLoading, isError } = useAgentWarmCards(8);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Proposals worth a personal nudge
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Hot and warm clients — ordered by signal strength and value. No emails are sent from here.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Couldn't load warm cards right now.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hot or warm proposals right now. Nice — your pipeline is either signed or cooling.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.map((card) => (
              <WarmCardItem key={card.proposal_id} card={card} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WarmCardItem({ card }: { card: WarmCard }) {
  const isHot = card.bucket === "hot";
  const suggestion = getSuggestion(card);
  const revenue =
    card.estimated_client_revenue > 0
      ? `R ${Math.round(card.estimated_client_revenue).toLocaleString()}`
      : "—";

  const firstName = card.client_first_name?.trim() || "there";
  const msg = encodeURIComponent(
    `Hi ${firstName}, just checking in on your Crunch Carbon proposal — happy to walk you through anything before you sign.`
  );
  const subject = encodeURIComponent(`Quick check-in on your proposal: ${card.title}`);
  const whatsappHref = card.client_phone
    ? `https://wa.me/${card.client_phone.replace(/\D/g, "")}?text=${msg}`
    : null;
  const telHref = card.client_phone ? `tel:${card.client_phone}` : null;
  const mailHref = card.client_email
    ? `mailto:${card.client_email}?subject=${subject}`
    : null;

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={isHot ? "default" : "secondary"}
              className={
                isHot
                  ? "bg-orange-500 hover:bg-orange-500 text-white border-0"
                  : "bg-amber-100 text-amber-900 hover:bg-amber-100 border-0 dark:bg-amber-900/40 dark:text-amber-100"
              }
            >
              {isHot ? (
                <Flame className="h-3 w-3 mr-1" />
              ) : (
                <Sun className="h-3 w-3 mr-1" />
              )}
              {card.bucket.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">{revenue}</span>
          </div>
          <p className="text-sm font-semibold truncate">
            {card.client_name ?? "Unknown client"}
          </p>
          <p className="text-xs text-muted-foreground truncate">{card.title}</p>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0">
          <Link to={`/proposals/${card.proposal_id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed">{suggestion}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {telHref && (
          <Button asChild size="sm" variant="outline" className="h-8 px-2">
            <a href={telHref}>
              <Phone className="h-3.5 w-3.5 mr-1" /> Call
            </a>
          </Button>
        )}
        {whatsappHref && (
          <Button asChild size="sm" variant="outline" className="h-8 px-2">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </a>
          </Button>
        )}
        {mailHref && (
          <Button asChild size="sm" variant="outline" className="h-8 px-2">
            <a href={mailHref}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Email
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function getSuggestion(card: WarmCard): string {
  const days = card.days_since_sent ?? 0;
  const engaged = card.days_since_engagement;
  const viewed = !!card.invitation_viewed_at;
  const clicked = card.last_email_event_type === "email.clicked";

  if (card.bucket === "hot") {
    if (clicked) {
      return `Clicked their proposal recently — call now and offer to walk them through signing.`;
    }
    if ((card.engagement_count ?? 0) >= 2) {
      return `Viewed multiple times. They're weighing it up — a 2-minute call closes this.`;
    }
    return `Strong engagement signal. Reach out personally before momentum cools.`;
  }
  // warm
  if (viewed && days <= 3) {
    return `Just opened the proposal. A friendly check-in now lands well.`;
  }
  if (viewed) {
    return `Opened ${days}d ago, no sign yet. Ask if anything's unclear — don't chase.`;
  }
  if (days >= 7) {
    return `Sent ${days}d ago, not opened yet. Worth a quick "did this land?" message.`;
  }
  return `Recent send. Keep an eye — escalate to a call if no view by day 7.`;
}
