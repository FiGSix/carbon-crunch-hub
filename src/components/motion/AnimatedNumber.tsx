import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  /** The real value. Any change animates from the previous value. */
  value: number;
  /** Renders the (possibly mid-flight) number as display text. */
  format?: (n: number) => string;
  /** Duration in ms. Short by design — a single ease-out pass. */
  duration?: number;
  className?: string;
}

/**
 * Counts a metric up to its value once, briefly. Purpose: make a changed
 * figure noticeable. Not a slot machine — one pass, ease-out, then still.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = 600,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const from = useRef(0);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) {
      from.current = value;
      setDisplay(value);
      return;
    }

    const start = from.current;
    const delta = value - start;
    if (delta === 0) {
      setDisplay(value);
      return;
    }

    const t0 = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) {
        frame = requestAnimationFrame(step);
      } else {
        from.current = value;
        setDisplay(value);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return <span className={cn("tabular-nums", className)}>{format(display)}</span>;
}
