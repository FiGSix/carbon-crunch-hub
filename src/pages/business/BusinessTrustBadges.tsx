import { motion } from "framer-motion";
import { Shield, Award, Lock } from "lucide-react";

export function BusinessTrustBadges() {
  return (
    <section className="py-8 md:py-12 bg-card border-y border-border/40">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center items-center gap-6 md:gap-12"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Verra VCS Certified</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">CDSA Affiliated</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Enterprise Security</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">50+</span> Commercial clients
          </div>
        </motion.div>
      </div>
    </section>
  );
}
