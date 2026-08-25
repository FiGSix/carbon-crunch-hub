import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** What the state is, in the user's terms — never "No data available". */
  title: string;
  /** What they can do about it, or why nothing is needed. */
  body: string;
  action?: { label: string; to: string };
  icon?: ReactNode;
}

/**
 * Empty states are an engagement surface, not an error. Tone adapts to
 * context: a new user gets a way forward, an established one gets reassurance.
 */
export function EmptyState({ title, body, action, icon }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-6 text-center">
      {icon && <div className="mb-2 flex justify-center text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to={action.to}>
            {action.label}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
