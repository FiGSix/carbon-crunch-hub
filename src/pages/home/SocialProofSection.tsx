import { motion } from "framer-motion";
import { TrustBadges } from "@/components/common/TrustBadges";

export const SocialProofSection = () => {
  return (
    <section className="border-y border-border/50 bg-muted/30 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8">
          {/* Stats row */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-center">
            <p className="text-foreground/80 font-medium">Trusted by solar funders, business owners and farmers across South Africa</p>
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <motion.div className="text-2xl font-bold text-foreground" whileHover={{ scale: 1.1 }}>
                  1,500+
                </motion.div>
                <div className="text-sm text-muted-foreground">Solar systems</div>
              </div>
              <div className="text-center">
                <motion.div className="text-2xl font-bold text-foreground" whileHover={{ scale: 1.1 }}>
                  R1.2M+
                </motion.div>
                <div className="text-sm text-muted-foreground">Revenue generated</div>
              </div>
              <div className="text-center">
                <motion.div className="text-2xl font-bold text-foreground" whileHover={{ scale: 1.1 }}>
                  28,000+
                </motion.div>
                <div className="text-sm text-muted-foreground">Tons CO₂ offset</div>
              </div>
            </div>
          </div>
          
          {/* Trust badges row */}
          <div className="border-t border-border/30 pt-6">
            <TrustBadges />
          </div>
        </div>
      </div>
    </section>
  );
};