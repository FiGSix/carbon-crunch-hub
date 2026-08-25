import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Milestone } from "@/hooks/useMilestones";

interface MilestoneCardProps {
  milestone: Milestone;
  onDismiss: () => void;
}

/**
 * A quiet achievement moment: the card fades in, the number gently settles,
 * a restrained line accent runs beneath it. Never blocks the user's work.
 */
export function MilestoneCard({ milestone, onDismiss }: MilestoneCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-6"
    >
      <Card className="relative overflow-hidden border-crunch-yellow/40">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-crunch-yellow/70 animate-milestone-line" />
        <CardContent className="py-5 pr-12">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {milestone.eyebrow}
          </p>
          <motion.p
            initial={reduced ? false : { scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            className="mt-1 text-3xl font-bold origin-left"
          >
            {milestone.headline}
          </motion.p>
          <p className="mt-1 text-sm text-muted-foreground">{milestone.body}</p>
        </CardContent>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Dismiss milestone"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </Card>
    </motion.div>
  );
}
