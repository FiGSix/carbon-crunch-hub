import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export interface HeroFigure {
  label: string;
  value: string;
  /** When present the figure counts to its value. */
  numericValue?: number;
  format?: (n: number) => string;
}

interface PortfolioHeroProps {
  /** e.g. "Platform pipeline" / "Your portfolio" / "Network portfolio" */
  label: string;
  /** Primary MWp figure. */
  mwp: number;
  /** Short factual caption under the hero number. */
  caption?: string;
  figures?: HeroFigure[];
  /** Tighter vertical rhythm: number first, label under it, one compact row. */
  dense?: boolean;
  className?: string;
}

const fmtMwp = (n: number) => `${n.toFixed(2)}`;

/**
 * The one dominant summary on a dashboard home. Everything else on the page
 * must be visually quieter than this.
 */
export function PortfolioHero({
  label,
  mwp,
  caption,
  figures = [],
  dense = false,
  className,
}: PortfolioHeroProps) {
  const reduced = useReducedMotion();

  if (dense) {
    return (
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "mb-6 rounded-xl border bg-card px-5 py-4 sm:px-6 sm:py-5",
          className
        )}
      >
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <AnimatedNumber
            value={mwp}
            format={fmtMwp}
            className="text-3xl sm:text-4xl font-bold tracking-tight leading-none"
          />
          <span className="pb-0.5 text-base font-medium text-muted-foreground">
            MWp
          </span>
          <span className="pb-1 text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        {caption && (
          <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        )}

        {figures.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 border-t pt-3">
            {figures.map((f, i) => (
              <motion.div
                key={f.label}
                initial={reduced ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: reduced ? 0 : 0.08 + i * 0.03,
                }}
              >
                <dd className="text-base font-semibold leading-tight">
                  {f.numericValue != null ? (
                    <AnimatedNumber
                      value={f.numericValue}
                      format={f.format ?? ((n) => String(Math.round(n)))}
                    />
                  ) : (
                    f.value
                  )}
                </dd>
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
              </motion.div>
            ))}
          </dl>
        )}
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "mb-6 rounded-xl border bg-card px-5 py-6 sm:px-7 sm:py-7",
        className
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-end gap-2">
        <AnimatedNumber
          value={mwp}
          format={fmtMwp}
          className="text-4xl sm:text-5xl font-bold tracking-tight"
        />
        <span className="pb-1 text-lg font-medium text-muted-foreground">MWp</span>
      </div>
      {caption && (
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      )}

      {figures.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 border-t pt-4">
          {figures.map((f, i) => (
            <motion.div
              key={f.label}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduced ? 0 : 0.06 + i * 0.04 }}
            >
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-lg font-semibold">
                {f.numericValue != null ? (
                  <AnimatedNumber
                    value={f.numericValue}
                    format={f.format ?? ((n) => String(Math.round(n)))}
                  />
                ) : (
                  f.value
                )}
              </dd>
            </motion.div>
          ))}
        </dl>
      )}
    </motion.section>
  );
}
