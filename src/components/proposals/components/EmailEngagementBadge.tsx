import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface EmailEngagementBadgeProps {
  eventType: string | null | undefined;
  sentAt?: string | null;
}

function EmailEngagementBadgeComponent({ eventType, sentAt }: EmailEngagementBadgeProps) {
  const badgeConfig = useMemo(() => {
    if (!eventType) return null;

    // Map event types to readable labels and colors
    const eventTypeLower = eventType.toLowerCase();
    
    if (eventTypeLower.includes('clicked')) {
      return {
        className: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
        text: "Clicked"
      };
    }
    
    if (eventTypeLower.includes('opened')) {
      return {
        className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
        text: "Opened"
      };
    }
    
    if (eventTypeLower.includes('delivered')) {
      return {
        className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
        text: "Delivered"
      };
    }
    
    if (eventTypeLower.includes('sent')) {
      return {
        className: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
        text: "Sent"
      };
    }
    
    if (eventTypeLower.includes('bounced')) {
      return {
        className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        text: "Bounced"
      };
    }
    
    if (eventTypeLower.includes('complained') || eventTypeLower.includes('spam')) {
      return {
        className: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
        text: "Spam Report"
      };
    }
    
    // Default case
    return {
      className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
      text: eventType
    };
  }, [eventType]);

  const timeAgo = useMemo(() => {
    if (!sentAt) return null;
    try {
      return formatDistanceToNow(new Date(sentAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [sentAt]);

  if (!badgeConfig) return null;

  return (
    <Badge 
      variant="outline" 
      className={badgeConfig.className}
      title={timeAgo || undefined}
    >
      {badgeConfig.text}
    </Badge>
  );
}

export const EmailEngagementBadge = memo(EmailEngagementBadgeComponent);
