import { Shield, Lock, Award, Users } from "lucide-react";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";

interface TrustBadgesProps {
  variant?: "light" | "dark";
  showAll?: boolean;
  className?: string;
}

const badges = [
  {
    icon: Award,
    label: "Verra Certified",
    description: "VCS Standard",
  },
  {
    icon: Shield,
    label: "CDSA Affiliated",
    description: "Carbon Data Standards",
  },
  {
    icon: Lock,
    label: "Data Encrypted",
    description: "Bank-level security",
  },
  {
    icon: Users,
    label: "1,500+ Systems",
    description: "Trusted platform",
  },
];

export function TrustBadges({ variant = "light", showAll = true, className = "" }: TrustBadgesProps) {
  const displayBadges = showAll ? badges : badges.slice(0, 3);
  
  const textColor = variant === "dark" ? "text-foreground" : "text-foreground";
  const mutedColor = variant === "dark" ? "text-muted-foreground" : "text-muted-foreground";
  const iconColor = variant === "dark" ? "text-primary" : "text-primary";
  
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 md:gap-6 ${className}`}>
      {displayBadges.map((badge, index) => (
        <SafeMotionDiv
          key={badge.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <div className={`p-1.5 rounded-full bg-primary/10 ${iconColor}`}>
            <badge.icon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className={`text-sm font-medium ${textColor}`}>{badge.label}</p>
            <p className={`text-xs ${mutedColor} hidden sm:block`}>{badge.description}</p>
          </div>
        </SafeMotionDiv>
      ))}
    </div>
  );
}
