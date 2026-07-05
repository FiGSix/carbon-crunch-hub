import { AnimatedCounter } from "@/components/solar-rewards/AnimatedCounter";
import { Users, Leaf, TrendingUp, Sun } from "lucide-react";
import { useHomeownerStats } from "@/hooks/useHomeownerStats";
import { Skeleton } from "@/components/ui/skeleton";

export function ImpactStats() {
  const { stats, isLoading } = useHomeownerStats();

  const tiles = [
    stats?.homeownerCount != null && {
      icon: Users,
      value: stats.homeownerCount,
      prefix: "",
      suffix: "+",
      label: "Homeowners Registered",
      description: "Solar owners earning with us",
    },
    stats?.totalSystemKwp != null && stats.totalSystemKwp > 0 && {
      icon: Sun,
      value: Math.round(stats.totalSystemKwp),
      prefix: "",
      suffix: " kWp",
      label: "Solar Capacity Monetised",
      description: "Combined signed system size",
    },
    stats?.co2OffsetTons != null && stats.co2OffsetTons > 0 && {
      icon: Leaf,
      value: Math.round(stats.co2OffsetTons),
      prefix: "",
      suffix: " tons",
      label: "CO₂ Offset",
      description: "Verified to Verra VCS standard",
    },
    {
      icon: TrendingUp,
      value: 800,
      prefix: "R",
      suffix: "/yr",
      label: "Typical Annual Payout",
      description: "Estimate for a 5kWp home system",
    },
  ].filter(Boolean) as Array<{
    icon: typeof Users;
    value: number;
    prefix: string;
    suffix: string;
    label: string;
    description: string;
  }>;

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Real Impact, Real Results
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join South African homeowners already earning from their solar systems
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-background rounded-xl p-6 shadow-sm border border-border/50 text-center"
                >
                  <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-8 w-24 mx-auto mb-2" />
                  <Skeleton className="h-4 w-32 mx-auto mb-1" />
                  <Skeleton className="h-3 w-28 mx-auto" />
                </div>
              ))
            : tiles.map((stat, index) => (
                <div
                  key={index}
                  className="bg-background rounded-xl p-6 shadow-sm border border-border/50 text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                    <AnimatedCounter
                      target={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      duration={2.5}
                    />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
