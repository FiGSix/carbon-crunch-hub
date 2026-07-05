import { motion } from "framer-motion";
import { TrustBadges } from "@/components/common/TrustBadges";
import { useHomeownerStats } from "@/hooks/useHomeownerStats";
import { Skeleton } from "@/components/ui/skeleton";

export const SocialProofSection = () => {
  const { stats, isLoading } = useHomeownerStats();

  const items = [
    stats?.homeownerCount != null && {
      value: `${stats.homeownerCount.toLocaleString()}+`,
      label: "Homeowners registered",
    },
    stats?.totalSystemKwp != null && stats.totalSystemKwp > 0 && {
      value: `${Math.round(stats.totalSystemKwp).toLocaleString()} kWp`,
      label: "Solar capacity monetised",
    },
    stats?.co2OffsetTons != null && stats.co2OffsetTons > 0 && {
      value: `${Math.round(stats.co2OffsetTons).toLocaleString()}+`,
      label: "Tons CO₂ offset",
    },
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  return (
    <section className="border-y border-border/50 bg-muted/30 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-center">
            <p className="text-foreground/80 font-medium">
              Trusted by solar funders, business owners and farmers across South Africa
            </p>
            <div className="flex gap-8 items-center">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center">
                      <Skeleton className="h-7 w-20 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
                : items.map((item) => (
                    <div key={item.label} className="text-center">
                      <motion.div
                        className="text-2xl font-bold text-foreground"
                        whileHover={{ scale: 1.1 }}
                      >
                        {item.value}
                      </motion.div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
            </div>
          </div>

          <div className="border-t border-border/30 pt-6">
            <TrustBadges />
          </div>
        </div>
      </div>
    </section>
  );
};
